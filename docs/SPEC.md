# Huntlist — Specifica funzionale (Beta, Fasi 1–3, senza pagamenti)

## 1. Visione
Marketplace C2C a **modello invertito** per mancaliste TCG. Invece di sfogliare annunci, l'acquirente pubblica
ciò che gli **manca** (una Hunt) e i venditori competono offrendo l'**intero** lotto in una sola spedizione.

### Vincolo chiave — Offerta totale
Un'**Offerta copre SEMPRE tutte le carte di una Hunt**, mai un sottoinsieme. Il venditore fornisce l'intera
mancalista in una sola spedizione, oppure non offre. Quindi:
- l'Offerta ha **un prezzo unico** per l'intero bundle (importi in **centesimi**, valuta **EUR** in beta) e si lega alla
  **Hunt nel suo complesso**, non alle singole carte;
- `offer_items` è **solo uno snapshot read-only** di ciò che il venditore conferma di avere (nome carta denormalizzato +
  condizione per carta), **non** una selezione parziale. Non esistono offerte parziali nel modello.

## 2. Ruoli
| Ruolo | Chi è | Cosa può fare |
|---|---|---|
| **Visitatore** | Non autenticato | Vede il feed pubblico delle Hunt aperte. Non crea né chatta. |
| **Acquirente** (buyer) | Utente autenticato proprietario di una Hunt | Crea/modifica/chiude le proprie Hunt; vede le offerte ricevute; chatta; accetta/rifiuta. |
| **Venditore** (seller) | Utente autenticato che offre su una Hunt altrui | Invia un'offerta totale; chatta sul thread della propria offerta; la ritira. |
| **Sistema** | — | Invia email (Resend), aggiorna stati derivati. |

Un utente è sempre entrambe le cose: acquirente sulle proprie Hunt, venditore sulle altrui. Non può offrire su una Hunt propria.

## 3. Entità (tabella)
| Entità | Descrizione | Relazioni chiave |
|---|---|---|
| `profiles` | Profilo pubblico legato a `auth.users` | 1–1 con utente auth |
| `hunts` | Mancalista pubblicata da un acquirente | `buyer_id → profiles`; 1–N `hunt_cards`; 1–N `offers` |
| `hunt_cards` | Singola carta cercata dentro una Hunt | `hunt_id → hunts` |
| `offers` | Offerta totale (prezzo unico) su una Hunt | `hunt_id → hunts`, `seller_id → profiles`; 1–N `offer_items`; 1–N `messages` |
| `offer_items` | Snapshot read-only di conferma per carta (nome carta denormalizzato) | `offer_id → offers`, `hunt_card_id → hunt_cards` (nullable, `on delete set null`) |
| `messages` | Messaggio chat sul thread di un'offerta (immutabile) | `offer_id → offers`, `sender_id → profiles` |

Enum: `game_type`, `hunt_status`, `offer_status`, `card_condition`.

## 4. Flussi utente
### 4.1 Registrazione e accesso (Fase 2)
1. Signup con email+password **o** magic link → riga in `profiles` creata dal trigger `handle_new_user` (`display_name` = parte locale dell'email, fallback `Hunter`; `username` resta `null` e viene scelto in **onboarding**).
2. Conferma email via route di callback → sessione attiva.
3. Le pagine dell'area `(app)` redirigono al login se `getUser()` è null.

### 4.2 Pubblica una Hunt (Fase 3)
1. L'acquirente compila titolo, gioco, descrizione e aggiunge ≥1 `hunt_cards` (nome, set, `collector_number`, lingua, quantità 1–99, condizione desiderata opzionale).
2. Validazione Zod (client+server) → Server Action `createHunt` → Hunt in stato `open`.
3. La Hunt appare nel feed pubblico.

### 4.3 Ricevi offerte (Fase 3)
1. Un venditore apre una Hunt aperta (non sua) e invia un'Offerta: prezzo unico (centesimi), spedizione (centesimi), messaggio, e conferma per ogni carta (genera `offer_items` come snapshot, inseribili solo finché l'offerta è `pending`).
2. Server Action `submitOffer` (Zod): rifiuta se Hunt non `open` o se `seller_id == buyer_id`. Un venditore ha al massimo **una** offerta attiva per Hunt; dopo un `withdrawn`/`rejected` può rifarne una nuova.
3. Offerta in stato `pending`. Email Resend all'acquirente: "Hai ricevuto un'offerta".

### 4.4 Chat (Fase 3)
1. Ogni offerta ha un thread di chat acquirente↔venditore (Supabase Realtime su `messages`; anche `offers` è in Realtime per gli aggiornamenti di stato/prezzo).
2. Solo i due partecipanti vedono e scrivono nel thread (RLS, che si applica anche alle sottoscrizioni Realtime).

### 4.5 Accetta / rifiuta (Fase 3)
1. L'acquirente accetta un'offerta → `offers.status = accepted`. Un **trigger DB** (`offers_on_accept`) porta la Hunt a `matched` e rifiuta automaticamente le altre offerte `pending` della stessa Hunt: l'operazione è atomica lato Postgres, non serve una transazione applicativa.
2. L'acquirente può rifiutare singole offerte (`pending → rejected`) senza chiudere la Hunt.
3. Il venditore può **ritirare** un'offerta `pending` → `withdrawn`.
4. L'acquirente può **chiudere** una Hunt non più attiva (`open → closed`), togliendola dal feed senza accettare nulla.
5. Le transizioni di stato e chi può farle sono imposte da trigger DB (`offers_guard`, `hunts_guard`), oltre che dalle Server Actions.

## 5. Stati
### Hunt (`hunt_status`)
```
            crea
   (nuovo) ─────▶ open ──acquirente accetta un'offerta──▶ matched   (terminale)
                   │
                   └── acquirente chiude ──▶ closed
```
- `open`: nel feed pubblico, accetta offerte.
- `closed`: ritirata dall'acquirente, fuori dal feed.
- `matched`: l'acquirente ha accettato un'offerta. **Stato terminale**: una Hunt `matched` non cambia più stato (`hunts_guard`).

Transizioni consentite: `open→matched`, `open→closed`. Non esistono `cancelled`/`expired` in beta.

### Offer (`offer_status`)
```
   (nuova) ─submit─▶ pending ──acquirente accetta──▶ accepted
                       │
                       ├── acquirente rifiuta ──▶ rejected
                       ├── venditore ritira ────▶ withdrawn
                       └── altra offerta accettata sulla stessa Hunt ──▶ rejected
```
Transizioni valide solo da `pending`. Stati finali: `accepted`, `rejected`, `withdrawn`.

## 6. Regole di autorizzazione (chi vede / fa cosa)
| Azione | Chi |
|---|---|
| Leggere feed Hunt `open` | Chiunque (anche visitatore) |
| Leggere Hunt non-`open` | Il proprietario **e** i venditori che hanno un'offerta su di essa (per la loro dashboard) — `can_view_hunt` |
| Creare/modificare/cancellare Hunt | Solo il proprietario (`buyer_id == auth.uid()`) |
| Creare/modificare `hunt_cards` | Solo il proprietario della Hunt |
| Creare Offerta | Utente autenticato, Hunt `open`, `seller_id != buyer_id` |
| Leggere Offerta | Il venditore che l'ha fatta **o** l'acquirente della Hunt. I venditori **non** vedono le offerte concorrenti sulla stessa Hunt |
| Accettare/rifiutare Offerta | L'acquirente della Hunt (imposto da `offers_guard`) |
| Ritirare Offerta | Il venditore dell'offerta (imposto da `offers_guard`) |
| Modificare i termini Offerta | Solo il venditore e solo finché `pending` (imposto da `offers_guard`) |
| Leggere `messages` | Solo i due partecipanti del thread (venditore offerta + acquirente Hunt) |
| Scrivere `messages` | Solo i partecipanti, a proprio nome, e solo finché l'offerta è viva (`pending`/`accepted`). Immutabili (no update/delete) |
| Leggere `offer_items` | Chi può leggere l'Offerta. Insert: il venditore, solo finché l'offerta è `pending`. Nessun update/delete (read-only). |
| Leggere `profiles` | Qualsiasi utente autenticato (profilo pubblico). Update: solo il proprio. |

## 7. Email transazionali (Fase 3, Resend)
- Conferma registrazione (gestita da Supabase Auth).
- "Hai ricevuto un'offerta" → all'acquirente quando arriva un'Offerta.
- (Futuro) "La tua offerta è stata accettata/rifiutata" → al venditore.

## 8. Fuori scope nel beta
Pagamenti, escrow, Stripe Connect, commissione 5%, spedizioni tracciate, recensioni/reputazione, dispute.
Tutto rinviato a Fase 4+.

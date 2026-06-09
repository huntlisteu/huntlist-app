# Handoff — Huntlist

> Aggiornato il 2026-06-09. Leggi CLAUDE.md per convenzioni, stack e regole non negoziabili.

---

## Cos'è il prodotto

Marketplace C2C per "mancaliste" TCG (Pokémon, One Piece, Yu-Gi-Oh!), mercato europeo.

**Loop in 3 frasi**: l'acquirente pubblica una **Hunt** (lista di carte che cerca). I venditori rispondono con un'**Offerta** che copre l'intera Hunt in una sola spedizione, a prezzo unico. Acquirente e venditore negoziano in **chat**; l'acquirente accetta un'offerta e la Hunt si chiude.

---

## Stato di avanzamento

| Fase | Contenuto | Stato |
|---|---|---|
| 0 | SPEC + schema DB + CLAUDE.md | ✅ Completa |
| 1 | Scaffold + brand + client Supabase | ✅ Completa |
| 2 | Auth (email, magic link, Google OAuth) | ✅ Completa |
| 3 | Core loop (Hunt, Offerte, Chat, Email) | ✅ Completa |
| 4 | Stripe Connect + commissione 5% | ⏳ Da fare |

---

## Feature implementate

### Auth
- Signup/login email + password
- Magic link (email OTP)
- Google OAuth — callback su `/callback`, cookie propagati via pattern collector, routing profile-based post-login
- Password recovery (`/forgot-password` → `/update-password`)
- Onboarding wizard (username, display name, paese, giochi preferiti) — `onboarding_completed` su `profiles`
- Middleware (`proxy.ts`) che redirige a `/onboarding` se il profilo non è completo; gestisce anche JWT residui di utenti cancellati (PGRST116 → signOut + `/login`)

### Hunt
- Creazione Hunt con form (`/hunts/new`) — titolo, descrizione, gioco, lista carte (nome, quantità, condizione minima)
- Import CSV per caricare le carte in blocco
- Modifica Hunt (`/hunts/[id]/edit`) — solo se `status = open`
- Chiusura Hunt manuale dall'acquirente
- Dettaglio Hunt (`/hunts/[id]`) — carte, offerte ricevute, azioni owner

### Feed pubblico
- `/feed` — Hunt aperte, accessibile senza login
- Filtro per gioco (Pokémon / One Piece / Yu-Gi-Oh!)
- Paginazione cursor-based

### Offerte
- Creazione offerta (`/hunts/[id]/offer`) — prezzo, spedizione, lista carte offerte con condizione
- Ritiro offerta dal venditore
- Accettazione offerta dall'acquirente → Hunt passa a `matched`, altre offerte → `rejected` (trigger DB)
- Dashboard (`/dashboard`) — "Le mie Hunt" + "Le mie offerte", paginazione separata per sezione

### Chat
- Thread realtime per ogni offerta (`/offers/[id]`) — Supabase Realtime su tabella `messages`
- Visibile solo a buyer e seller dell'offerta
- Input bloccato se offerta `rejected` o `withdrawn`

### Email (Resend)
- Notifica al buyer quando arriva una nuova offerta
- Notifica al seller quando la sua offerta viene accettata
- Mittente: `RESEND_FROM_EMAIL` (configurato in env)

### Altro
- Profilo pubblico (`/profile/[username]`)
- Settings (`/settings`) — modifica profilo, cambio email/password
- PWA (manifest + service worker, installabile su mobile)
- Badge system UI
- Dark mode con token brand

---

## Struttura DB (tabelle principali)

```
profiles        — estende auth.users, creata da trigger su signup
hunts           — la mancalista (buyer_id, title, game, status)
hunt_cards      — le carte della hunt (hunt_id, name, quantity, min_condition)
offers          — l'offerta del venditore (hunt_id, seller_id, price_cents, shipping_cents, status)
offer_items     — le carte dell'offerta (offer_id, card_name, condition, quantity)
messages        — chat (offer_id, sender_id, content)
```

Schema completo: `supabase/migrations/0001_init.sql` — fonte di verità, non modificare a mano.

Trigger rilevanti:
- `handle_new_user` — crea `profiles` al signup (con `onboarding_completed = false`)
- Trigger su `offers` — quando un'offerta viene accettata, le altre offerte della stessa hunt passano a `rejected` e la hunt passa a `matched`

---

## Routing

```
/                       → landing page (redirect a /dashboard se loggato)
/feed                   → feed pubblico Hunt (pubblico)
/hunts/new              → crea Hunt (auth)
/hunts/[id]             → dettaglio Hunt (pubblico)
/hunts/[id]/edit        → modifica Hunt (auth + owner)
/hunts/[id]/offer       → crea offerta (auth)
/offers/[id]            → chat offerta (auth + buyer o seller)
/dashboard              → le mie Hunt + le mie offerte (auth)
/profile/[username]     → profilo pubblico
/settings               → impostazioni account (auth)
/onboarding             → wizard primo accesso (auth)
/login /signup          → auth pages
/forgot-password        → richiesta reset password
/update-password        → set nuova password (sessione recovery)
```

---

## Callback auth (attenzione)

Ci sono **due** file callback:

| File | Path URL | Usato da |
|---|---|---|
| `app/(auth)/callback/route.ts` | `/callback` | Google OAuth, magic link, conferma email, recovery — **quello effettivo** |
| `app/auth/callback/route.ts` | `/auth/callback` | In teoria Google OAuth, ma Supabase usa `/callback` come default |

Entrambi implementano lo stesso pattern corretto (cookie collector + profile-based routing). Non fidarsi del nome del file — il callback **attivo** per Google OAuth è `app/(auth)/callback/route.ts`.

Il proxy (`proxy.ts`) bypassa entrambi i path senza toccare i cookie.

---

## Env vars necessarie

```bash
NEXT_PUBLIC_SUPABASE_URL=          # URL progetto Supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # chiave pubblica (anon/publishable)
NEXT_PUBLIC_SITE_URL=              # URL pubblico app (es. https://app.huntlist.eu)
RESEND_API_KEY=                    # API key Resend per email
RESEND_FROM_EMAIL=                 # mittente email verificato su Resend
# Opzionale, solo in locale:
RESEND_TEST_EMAIL=                 # override destinatario per test email
```

Non esiste ancora una `STRIPE_SECRET_KEY` — Stripe non è implementato.

---

## Come girare in locale

```bash
npm install
cp .env.example .env.local   # e compila le variabili
npm run dev                  # http://localhost:3000
npm run typecheck            # tsc --noEmit
npm run lint
```

Schema DB: applicare `supabase/migrations/0001_init.sql` sul progetto Supabase (SQL editor o `supabase db push`).

---

## Prossimo step — Fase 4: Stripe Connect

Da progettare prima di toccare il codice. Punti chiave:
- **Stripe Connect Express** per onboarding venditori (ogni venditore ha un account Stripe)
- Commissione **5%** trattenuta da Huntlist su ogni transazione accettata
- Pagamento al momento dell'accettazione offerta (o separato?)
- Webhook Stripe in `app/api/stripe/webhook/route.ts` (unica eccezione alle Server Actions)
- Tabelle DB da aggiungere: `stripe_accounts` (seller_id → stripe_account_id), `payments`
- La Fase 4 va iniziata con una SPEC dettagliata prima di scrivere una riga di codice

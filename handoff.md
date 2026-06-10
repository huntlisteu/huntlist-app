# Handoff — Huntlist

> Aggiornato il 2026-06-10. Leggi CLAUDE.md per convenzioni, stack e regole non negoziabili.
>
> Ultima sessione: catalogo carte SEO (`/[game]/carte`) + import/sync carte Yu-Gi-Oh e Pokémon.

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
| — | Catalogo carte SEO (Yu-Gi-Oh + Pokémon) | ✅ Completa (One Piece da fare) |

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

### Landing page (migrata da sito statico)
- `app/page.tsx` — server component: controlla auth, redirige a `/dashboard` se loggato, altrimenti renderizza `<LandingClient>`
- `components/landing/LandingClient.tsx` — client component con tutta la landing: hero, how it works, categories, for who, FAQ, CTA, footer, cookie banner
  - Bilinguismo EN/IT con switch in nav
  - Dark mode via `useTheme` (next-themes), integrata con il ThemeProvider del layout
  - CSS variables scopate a `.hl-landing` per non conflittare con i token Tailwind di `globals.css`
  - Scroll reveal via IntersectionObserver
  - Logo usa `<Logo>` (componente brand) → stessa ombra `drop-shadow` del resto dell'app
- `app/privacy/page.tsx` — pagina `/privacy` standalone (Privacy Policy + Cookie Policy) con stesso pattern CSS scopato
- `next.config.ts` — aggiunto redirect permanente `app.huntlist.eu → huntlist.eu/:path*`
- `eslint.config.mjs` — aggiunti browser globals (`window`, `document`, `IntersectionObserver`, ecc.); ignorati `landing-old/**` e `public/sw.js`
- `/landing-old/` — cartella originale mantenuta come riferimento, non servita da Next.js

### Catalogo carte SEO
- `app/[game]/carte/page.tsx` — griglia pubblica delle carte per gioco (`pokemon | one_piece | yugioh`), 48 per pagina, paginazione "Carica altre" via `?pagina=N`, `notFound()` se game non valido o griglia vuota gestita senza errori
- `app/[game]/carte/[slug]/page.tsx` — pagina dettaglio carta:
  - breadcrumb `{Gioco} → Carte → {Nome carta}`
  - layout immagine 200px a sinistra (desktop) / stacked (mobile)
  - stat box per gioco: ATK/DEF/Livello (yugioh), HP/Danno (pokemon), Potere/Costo (one_piece)
  - box "hunt attive" (count da `hunt_cards` join `hunts` con `status = 'open'`) + CTA "Vedi tutte"
  - due CTA: "Aggiungi alla tua Hunt" → `/hunts/new?card=...`, "Ho questa carta — Fai offerta" → `/hunts?card=...`
  - `generateMetadata` (title/description/OG) + JSON-LD `Product`/`AggregateOffer`
  - `notFound()` se carta non esiste
- `app/[game]/carte/[slug]/CardClient.tsx` — client component, incrementa `views` al mount via RPC `increment_card_views`, mostra "N visualizzazioni questo mese"
- `next.config.ts` — `images.remotePatterns` per `images.ygoprodeck.com` e `images.pokemontcg.io` (no `unoptimized`)

### Import e sync carte
- `scripts/import-yugioh.ts` — import one-shot da YGOPRODeck (`cardinfo.php?misc=yes`, ~14.272 carte):
  - mapping su tabella `cards` (slug, name, image_url, description, set_name, rarity, card_type, archetype, atk/def/level, external_id)
  - dedup per `slug` (Map, prima occorrenza vince) prima dell'upsert
  - upsert in batch da 100 su conflitto `(game, slug)`
  - **fase 2**: importa tutte le stampe in `card_printings` (set_name, set_code, set_number ← `set_card_number`, rarity, rarity_code), risolvendo `card_id` via `fetchCardIdMap` (paginato a chunk da 1000), upsert su conflitto `(card_id, set_number, rarity_code)`
- `scripts/import-pokemon.ts` — import one-shot da PokéTCG (`api.pokemontcg.io/v2/cards`, paginato 250/pagina, ~15.000 carte):
  - slug da `name + set.name + number` (es. `charizard-base-set-4`)
  - `hp`/`damage` parsati da stringa a intero
  - `fetchWithRetry` (3 tentativi, backoff 1s/2s/4s su errori rete o status 500/504), delay 100ms tra le pagine
  - dedup per `slug`, upsert in batch da 100 su `(game, slug)`
- `app/api/sync-cards/route.ts` — `GET` protetto da header `Authorization: Bearer {CRON_SECRET}` (401 se assente/errato), query param `?game=yugioh|pokemon` (default `yugioh`):
  - calcola gli `external_id` già presenti (paginato), inserisce solo le carte mancanti, max 500 per chiamata
  - risposta `{ inserted, skipped, total, hasMore }`
- Entrambi gli script: `main()` async + `main().catch(console.error)`, nessun top-level await, `dotenv` carica `.env.local`, client `createClient` da `@supabase/supabase-js` con `SUPABASE_SECRET_KEY`
- Dipendenze dev aggiunte: `tsx`, `dotenv`

> ⚠️ **Debito tecnico**: le tabelle `cards` e `card_printings` sono state create direttamente su Supabase e **non sono ancora in `supabase/migrations/0001_init.sql`** (che CLAUDE.md indica come fonte di verità). Da allineare con una migrazione `0002_cards.sql` prima del prossimo deploy pulito/replica ambiente. Verificare anche che il constraint UNIQUE su `card_printings` sia esattamente `(card_id, set_number, rarity_code)` — coerente con l'`onConflict` dello script.

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
cards           — catalogo carte TCG (game, slug, name, image_url, description, set_name, rarity,
                  card_type, archetype, atk/def/level, hp/damage, power/cost, external_id, views)
                  ⚠️ non ancora in 0001_init.sql, vedi debito tecnico sopra
card_printings  — varianti di stampa di una carta (card_id, set_name, set_code, set_number,
                  rarity, rarity_code) — popolata solo per yugioh per ora
                  ⚠️ non ancora in 0001_init.sql, vedi debito tecnico sopra
```

RPC: `increment_card_views(card_id uuid)` — `SECURITY DEFINER`, chiamata da `CardClient.tsx`.

Schema base: `supabase/migrations/0001_init.sql` — fonte di verità, non modificare a mano.

Trigger rilevanti:
- `handle_new_user` — crea `profiles` al signup (con `onboarding_completed = false`)
- Trigger su `offers` — quando un'offerta viene accettata, le altre offerte della stessa hunt passano a `rejected` e la hunt passa a `matched`

---

## Routing

```
/                       → landing page Next.js (redirect a /dashboard se loggato)
/privacy                → Privacy & Cookie Policy (statica)
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

/[game]/carte           → griglia carte per gioco (pubblico, pokemon|one_piece|yugioh)
/[game]/carte/[slug]    → dettaglio carta + JSON-LD (pubblico)
/api/sync-cards         → GET, sync notturno carte (CRON_SECRET, ?game=yugioh|pokemon)
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

SUPABASE_SECRET_KEY=               # service-role key — solo server (admin client, script import/sync)
CRON_SECRET=                       # protegge /api/sync-cards (header Authorization: Bearer ...)
```

Non esiste ancora una `STRIPE_SECRET_KEY` — Stripe non è implementato.

> **Nota deploy**: aggiungere `CRON_SECRET` alle env vars Vercel e configurare un cron job verso
> `/api/sync-cards?game=yugioh` e `/api/sync-cards?game=pokemon` (es. `vercel.json` → `crons`).

> **Nota dominio**: il deploy target è `huntlist.eu` (non più `app.huntlist.eu`). Il redirect in `next.config.ts` rimanda `app.huntlist.eu/*` → `huntlist.eu/*` con 301. Aggiornare `NEXT_PUBLIC_SITE_URL` di conseguenza.

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
Per popolare il catalogo carte (tabelle `cards`/`card_printings`, create a parte — vedi debito tecnico):
```bash
npx tsx scripts/import-yugioh.ts   # ~14.272 carte + stampe, qualche minuto
npx tsx scripts/import-pokemon.ts  # ~15.000 carte, 5-10 minuti (rate limit)
```

---

## Prossimo step — Fase 4: Stripe Connect

Da progettare prima di toccare il codice. Punti chiave:
- **Stripe Connect Express** per onboarding venditori (ogni venditore ha un account Stripe)
- Commissione **5%** trattenuta da Huntlist su ogni transazione accettata
- Pagamento al momento dell'accettazione offerta (o separato?)
- Webhook Stripe in `app/api/stripe/webhook/route.ts` (unica eccezione alle Server Actions)
- Tabelle DB da aggiungere: `stripe_accounts` (seller_id → stripe_account_id), `payments`
- La Fase 4 va iniziata con una SPEC dettagliata prima di scrivere una riga di codice

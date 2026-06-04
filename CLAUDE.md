# Huntlist — Costituzione del progetto

> Leggi questo file all'inizio di ogni sessione. È la fonte di verità.
> Marketplace C2C per "mancaliste" TCG (Pokémon, One Piece TCG, Yu-Gi-Oh!), Europa, da IT.

## Il loop prodotto (3 frasi)
L'**acquirente** pubblica una **Hunt**: la lista di carte che cerca. I **venditori** rispondono con un'**Offerta** che copre **sempre l'intera Hunt** in una sola spedizione, a prezzo unico. Acquirente e venditore negoziano in **chat**; l'acquirente accetta un'offerta e la Hunt si chiude.

## Regole non negoziabili (compliance — trattale come hook, non suggerimenti)
1. **Codice completo, zero placeholder.** Mai `// TODO`, `// add logic here`, `...`. Ogni file compila e funziona.
2. **TypeScript strict.** `strict: true`, niente `any` impliciti, niente `@ts-ignore` senza commento che spiega il perché.
3. **Auth lato server: SEMPRE `supabase.auth.getUser()`.** Mai fidarsi della sessione dal cookie per autorizzare. Regola di sicurezza #1.
4. **Mutazioni = Server Actions**, non API routes. Eccezioni: webhook Stripe e callback OAuth.
5. **Brand obbligatorio su ogni componente UI**, con dark mode funzionante. Nessuna eccezione (token sotto).
6. **Mai esporre la secret key** (`sb_secret_`) al client. Solo server.
7. **Validazione Zod su ogni Server Action**, sia client sia server.
8. **RLS attiva su tutte le tabelle.** Nessuna tabella pubblica senza policy.
9. **Quando non sei sicuro, fermati e chiedi** invece di indovinare.
10. **Commit atomici e descrittivi** a fine di ogni fase.

## Brand
- **Font:** Fraunces (titoli), DM Sans (corpo) — via `next/font`.
- **Light:** Forest `#2D5A3D`, Forest-mid `#3D7A54`, Ember `#E8622A`, Paper `#FAFAF7`, Ink `#1A1A18`.
- **Dark:** bg `#111210`, surface `#1A1C19`, testo Snow `#F0EFE8`, verde Teal `#5DCAA5`.
- Tono: da collezionista a collezionista, mai corporate.

## Stack (confermato giugno 2026)
- **Next.js 16** — App Router, Server Components di default, React Compiler attivo.
- **TypeScript strict** + **Tailwind CSS** + **shadcn/ui**.
- **Supabase**: Postgres + Auth + Storage + Realtime, via `@supabase/ssr`.
- **Resend** per email transazionali.
- **Stripe Connect** — solo da Fase 4 in poi (NON ora).
- Deploy **Vercel**, repo **GitHub**.

## Struttura cartelle
```
/app                    # App Router (route, layout, pages, Server Actions co-locate)
  /(auth)               # login, signup, callback conferma email
  /(app)                # area autenticata (dashboard, hunts, chat)
  /hunts                # feed pubblico + dettaglio hunt
/components
  /ui                   # primitive shadcn/ui
  /brand                # componenti con token brand
/lib
  /supabase             # client.ts, server.ts
  /validation           # schemi Zod condivisi
  proxy.ts              # middleware refresh sessione
/docs                   # SPEC.md (spec funzionale)
/supabase/migrations    # migrazioni SQL versionate; 0001_init.sql = schema (fonte di verità)
```

## Convenzioni di naming
- File componenti: `PascalCase.tsx`. Hook/util/Server Actions: `camelCase.ts`.
- Server Actions: file `actions.ts` co-locato nella route; funzioni verbo+oggetto (`createHunt`, `submitOffer`).
- Schemi Zod: `xxxSchema` in `/lib/validation`, esportati con il loro type inferito (`type CreateHuntInput`).
- DB: tabelle e colonne `snake_case`, plurale per le tabelle. Enum Postgres `snake_case`.
- Niente default export per i componenti tranne le `page.tsx`/`layout.tsx` richieste da Next.

## Comandi
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Test: `npm run test`
- Migrazioni: applicare i file in `/supabase/migrations` su Supabase (SQL editor o `supabase db push`). Lo schema beta vive in `supabase/migrations/0001_init.sql` (file unico, già revisionato — non modificare a mano).

## Sicurezza in breve
- Ogni Server Action: `getUser()` → valida con Zod → autorizza → muta → `revalidatePath`.
- RLS è la difesa di base; le Server Actions ricontrollano comunque l'ownership.
- Service-role key solo in codice server mai importato dal client.

## Disciplina di fase (Spec-Driven Development)
Una fase alla volta. A fine fase elenca: (a) file creati/modificati, (b) comandi che deve lanciare l'utente, (c) come testare a mano, (d) proposta per la fase dopo. Poi **fermati** e aspetta la review.
- Fase 0: SPEC + SCHEMA + questo file.
- Fase 1: scaffold + brand + client Supabase.
- Fase 2: auth.
- Fase 3: core loop (Hunt, Offerte, chat realtime, email).
- Fase 4: Stripe Connect + commissione 5% (DOPO validazione).

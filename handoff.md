# Handoff — Huntlist

> Aggiornato il 2026-06-13. Leggi CLAUDE.md per convenzioni, stack e regole non negoziabili.
>
> **Ultima sessione (2026-06-13, notte 6): rinomina Feed→Market e riordino bottom nav mobile.**
> - **`components/layout/AppNavbar.tsx`**: etichetta del link desktop `/market` cambiata da "Feed" a "Market" (link e `isActive` invariati).
> - **`components/layout/BottomNav.tsx`**: tab `/market` rinominato "Feed" → "Market" (testo e `aria-label`, icona `IconFeed` invariata). Nuovo ordine dei tab: Market - Carte - Dashboard - **+** (Nuova Hunt). Il bottone "+" (elevato, stile CTA verde con shadow neobrutalist) è stato spostato dalla terza posizione all'estrema destra; markup/stile/comportamento del bottone invariati, solo riposizionato.
> - **Altri riferimenti**: cercato "Feed" come testo visibile in tutti i componenti — gli unici match restanti sono nomi interni non mostrati all'utente (`FeedHunt`, `IconFeed`, `getFeedHunts`, `FormFeedback`, un commento) e non sono in componenti di navigazione, quindi non modificati.
> - **Verifica**: `npm run typecheck` e `npm run lint` puliti. Creata temporaneamente `app/dev-preview-nav/page.tsx` (renderizza `AppNavbar`/`BottomNav` con `isLoggedIn=true` e profilo mock, per bypassare l'auth) — verificata in preview: desktop (1280px, light) mostra "Market" nella navbar; mobile (375px, dark) mostra la bottom nav nell'ordine Market - Carte - Dashboard - **+**, con "+" elevato a destra. Pagina di preview rimossa a fine sessione.
>
> **Sessione precedente (2026-06-13, notte 5): label conteggio carte in HuntFeedCard.**
> - **`components/hunts/HuntFeedCard.tsx`**: rimossa la costante `cardLabel` (logica singolare/plurale "1 carta cercata" / "N carte cercate"). Il testo accanto al pallino col numero è ora sempre fisso `"carte in lista"` — il conteggio resta solo nel pallino (es. `(2)` + "carte in lista"). Nessun'altra modifica.
> - **Verifica**: `npm run typecheck` e `npm run lint` puliti.
>
> **Sessione precedente (2026-06-13, notte 4): miniature stack market ingrandite a 64px.**
> - **`components/hunts/HuntFeedCard.tsx`**: `CardImageStack` — miniature da `h-12 w-12` (48px) a `h-16 w-16` (64px), proporzione 1:1 invariata (era già `object-cover` quadrato). Overlap reso responsive: `-ml-8` (32px) su mobile, `sm:-ml-4` (16px) da 640px in su — a 64px con `-ml-4` ovunque lo stack di 5 carte + badge misura 304px e sfora il contenuto della card sui viewport più stretti (320px ≈ 240px disponibili dentro `CardContent`); con `-ml-8` su mobile lo stack scende a 224px e rientra. Stesso trattamento (dimensione + overlap responsive) applicato al badge `+N`, bordo 2px e ombra offset invariati.
> - **Verifica**: `npm run typecheck` e `npm run lint` puliti. Creata temporaneamente `app/dev-preview-feed-card/page.tsx` (3 Hunt mock: 5 immagini + `+3`, nessuna immagine, 2 immagini) per bypassare l'assenza di Hunt `open` nel DB; verificata in preview a 320px (mobile, dark) e desktop (light) — stack leggibile, badge `+3` non tagliato, niente overflow dalla card in nessun caso, fallback senza stack invariato. Pagina di preview rimossa a fine sessione.
> - **Nota debito**: invariata — dipende da `hunt_cards.image_url` (non in `0001_init.sql`), vedi sessione precedente.
>
> **Sessione precedente (2026-06-13, notte 3): stack miniature carte nel market feed.**
> - **`lib/hunts.ts`**: `getFeedHunts()` — la select ora include `hunt_cards!hunt_id(id, image_url)` (era solo `id`). `RawFeedHunt.hunt_cards` tipizzato come `{ id: string; image_url: string | null }[]`. Nuova costante `FEED_CARD_IMAGES_LIMIT = 5`. Il tipo `FeedHunt` ha un nuovo campo `card_images: string[]`, calcolato mappando `hunt_cards` → `image_url`, filtrando i `null` e troncando a 5 (`.slice(0, FEED_CARD_IMAGES_LIMIT)`). `card_count` resta il conteggio totale delle righe `hunt_cards` (con o senza immagine) — invariato. Paginazione cursor-based (`FEED_PAGE_SIZE = 12`, fetch +1, `nextCursor` su `created_at`) non toccata.
> - **`components/hunts/HuntFeedCard.tsx`**: nuovo componente interno `CardImageStack({ images, cardCount })` — stack "a ventaglio" di miniature 48×48 (`<img>`, non `next/image`) con `border-2 border-[#1A1A18] dark:border-[#3A3D38]`, `shadow-[2px_2px_0px_...]`, rotazioni alternate (`STACK_ROTATIONS`: -6/3/-3/6/-2 gradi) e overlap via `-ml-4` (z-index crescente). Se `card_count > card_images.length` (es. carte senza `image_url` o oltre il limite di 5), badge finale `+N` con lo stesso stile. Renderizzato in cima a `CardContent`, solo se `hunt.card_images.length > 0` (altrimenti nessuna modifica — resta solo il conteggio testuale "N carte cercate" come prima).
> - **Verifica**: `npm run typecheck` e `npm run lint` puliti (unico errore residuo: `.next/dev/types/routes.d.ts`, pre-esistente, gitignored). Riavviato il dev server e riaperto `/market` in preview: pagina renderizzata senza errori console, dark mode ok. **Nota**: al momento della verifica non c'erano Hunt `open` nel DB ("Nessuna Hunt aperta"), quindi lo stack non è stato verificato visivamente con dati reali — la logica (mapping, limite 5, badge `+N`, fallback senza stack) è stata validata a livello di codice/tipi. Da riverificare a vista appena esiste almeno una Hunt open con `hunt_cards.image_url` popolato (es. una creata con l'autocomplete della sessione precedente).
> - **Nota debito**: questa feature assume che `hunt_cards.image_url` esista (stesso debito già annotato per la sessione precedente — colonna non presente in `0001_init.sql`).
>
> **Sessione precedente (2026-06-13, notte 2): autocomplete carte collegato a HuntForm.**
> - **`components/hunts/HuntForm.tsx`**:
>   - `CardDraft` esteso con `card_id?: string | null` e `image_url?: string | null` (sempre inizializzati a `null` in `emptyCard()` e nell'import CSV).
>   - Il `<select>` "Gioco" è ora **controllato** (`useState<Game | "">`, era `defaultValue`): serve all'autocomplete per sapere su quale `game` filtrare.
>   - Nuovo componente `CardNameField` (in coda al file): per ogni riga carta, il campo "Nome carta" fa fetch debounced 300ms a `/api/cards/search?game={game}&q={testo}` (min 2 caratteri, `AbortController` per annullare le richieste precedenti). Dropdown neobrutalist (`border-2 border-[#1A1A18] dark:border-[#3A3D38]`, `shadow-[4px_4px_0px_...]`, voci con `hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-accent hover:text-accent-foreground` per l'effetto "press") con miniatura 40×40 (`<img>`, non `next/image` — niente whitelist domini per migliaia di host carte), nome e `set_name` in grigio.
>   - Click su un suggerimento → `selectCardSuggestion`: imposta `name`, `card_id`, `image_url` e chiude il dropdown. Nuova ricerca **saltata** mentre la riga ha un `card_id` agganciato (altrimenti il debounce sul nome appena impostato ri-fetchava e riapriva il dropdown con la stessa carta come unico risultato — bug trovato e corretto in verifica).
>   - Modifica manuale del nome → `updateCardName`: azzera `card_id`/`image_url` (la riga torna testo libero, riparte la ricerca).
>   - Senza `game` selezionato: nessun fetch/dropdown, nota "Seleziona il gioco per i suggerimenti", campo comunque editabile a testo libero.
>   - `cardsPayload` ora include `card_id`/`image_url` (sempre `?? null`) per ogni carta.
> - **`lib/validation/hunt.ts`**: `huntCardSchema` esteso con `card_id` (uuid o null) e `image_url` (url, max 2000, o null), entrambi con preprocess stringa-vuota→null. `HuntCardInput` li include automaticamente.
> - **`app/(app)/hunts/actions.ts`**: la chiamata `create_hunt_card` passa `p_card_id: card.card_id ?? null` e `p_image_url: card.image_url ?? null`; `toCardRows` (usata da `updateHunt` per l'insert diretto in `hunt_cards`) include anche `card_id`/`image_url`.
> - **Verifica** (preview, dark mode, pagina temporanea `app/dev-preview-hunt-form/` creata e rimossa a fine sessione per bypassare `requireUser()`): gioco "Yu-Gi-Oh!" + "sky striker" → dropdown con 8 carte e immagini; click su "Sky Striker Ace - Hayate" → nome compilato, `card_id`/`image_url` nel payload, dropdown resta chiuso (niente ri-apertura); modifica manuale del nome → `card_id`/`image_url` tornano `null`; senza gioco selezionato → nessun dropdown, nota visibile, campo libero; import CSV (2 carte) e banner bulk "Applica a tutte" (condizione `near_mint` su entrambe le righe) continuano a funzionare con `card_id: null`. `npm run typecheck` e `npm run lint` puliti (unico errore residuo: tipi generati `.next/dev/types/routes.d.ts`, pre-esistente, gitignored, non legato a questa modifica).
> - **Nota debito**: questa sessione assume che `hunt_cards` abbia già le colonne `card_id`/`image_url` e che la RPC `create_hunt_card` accetti `p_card_id`/`p_image_url` (indicato dall'utente) — nessuna di queste è in `0001_init.sql` né in altri file `.sql` del repo (stesso debito tecnico già annotato per `cards`/`card_printings`/RPC carte).
>
> **Sessione precedente (2026-06-13, notte): API autocomplete carte per la creazione Hunt.**
> - **File creato**: `app/api/cards/search/route.ts` — Route Handler `GET`, query param `game` (validato contro `GAMES` da `lib/tcg.ts`) e `q` (min 2 caratteri). Se `game` mancante/invalido o `q` < 2 caratteri → `{ results: [] }` 200 senza query al DB. Altrimenti: client Supabase anonimo creato al volo con `@supabase/supabase-js` (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, nessun cookie/auth — i dati `cards` sono pubblici) → `select('id, name, image_url, set_name').eq('game', game).ilike('name', '%q%').limit(8)`. Risposta `{ results: [...] }` con `Cache-Control: public, max-age=60`; in caso di errore Supabase o eccezione → `{ results: [], error }` 500.
> - **Non ancora collegato a `HuntForm.tsx`**: l'endpoint è pronto ma il form di creazione Hunt (`components/hunts/HuntForm.tsx`) non lo chiama ancora — l'autocomplete nei campi "Nome carta" è da implementare in una sessione successiva (debounce + dropdown, sul modello di `AutocompleteFilter` già esistente in `app/cards/[game]/CarteClient.tsx`).
> - **Verifica** (dev server): `GET /api/cards/search?game=yugioh&q=sky striker` → 200, 8 risultati ("Sky Striker Special Maneuver - Lemnisgate!" con `image_url`), `Cache-Control: public, max-age=60`; `GET /api/cards/search?game=pokemon&q=a` → `{ results: [] }` 200 (query troppo corta); `GET /api/cards/search?game=magic&q=black lotus` → 200, 8 risultati inclusa "Black Lotus" con `image_url` Scryfall; `?q=charizard` senza `game` → `{ results: [] }` 200. `npm run typecheck`: gli unici errori sono nei tipi generati `.next/dev/types/routes.d.ts` (pre-esistenti, non legati a questa modifica, file gitignored).
>
> **Sessione precedente (2026-06-13, sera): default lingua landing → IT.**
> - `components/landing/LandingClient.tsx`: `useState<Lang>("en")` → `useState<Lang>("it")` (riga ~89). Nessun localStorage/cookie da aggiornare (lo stato non persiste, parte sempre da questo default). Toggle EN/IT invariato e funzionante, label invariate. Verificato in preview: caricamento iniziale in italiano con "IT" evidenziato, click su "EN" passa correttamente all'inglese (e viceversa).
>
> **Sessione precedente (2026-06-13, pomeriggio): fix P0 sitemap — ripristinato ISR + keyset pagination.**
> - `app/cards/s/{yugioh,pokemon,one_piece,magic}/sitemap.ts`: `export const dynamic = 'force-dynamic'` → `export const revalidate = 86400`. I chunk ora sono SSG al build e rigenerati al più 1 volta/24h: Google non tocca più il DB a ogni crawl.
> - `lib/cardSitemap.ts` riscritto. **Approccio scelto**: lettura completa keyset + chunking in memoria (l'alternativa proposta nel task). Per ogni gioco si leggono tutte le righe `(slug, updated_at)` con keyset pagination (`WHERE slug > $last ORDER BY slug LIMIT 1000`, servita dall'indice UNIQUE `cards_game_slug_key`), si costruisce l'elenco completo di entry e ogni chunk è uno `slice` da 5000. Scelto perché: (a) nessuna query OFFSET residua, ogni pagina è O(log n) — lo skip keyset fino all'inizio del chunk avrebbe comunque richiesto ~145 query per i chunk Magic profondi, senza condividere nulla tra chunk; (b) una **memo in-process per gioco (TTL 1h, promise condivisa, slot rimosso su errore)** fa sì che i 30 chunk Magic + `generateSitemaps` condividano UNA sola lettura durante il build, eliminando il prerender timeout che aveva originato `force-dynamic` (commit `04d5f0c`); (c) gli slug sono leggeri (~15MB transitori per Magic).
> - Bonus inclusi nella riscrittura: niente più `count('exact')` (il numero di chunk deriva dalle stesse entry servite → enumerazione e contenuto sempre coerenti; prima i chunk YGO oltre il 2 erano vuoti e i primi sforavano i 5000 URL perché i ruling si sommavano fuori conteggio); gli URL `/ruling` YGO ora si individuano con una query keyset `slug WHERE ruling_data NOT NULL` **senza scaricare il JSONB**; rimossa `listCardSitemapUrls()` (dead code, robots non la usa più) e aggiornato il commento in `app/cards/sitemap.xml/route.ts` che la citava.
> - I conteggi fissi `GAME_CHUNKS` dell'index (`/cards/sitemap.xml`) restano validi: il build produce magic 30, yugioh 6, pokemon 5, one_piece 1.
> - **Verifica**: `npm run typecheck` pulito; `npm run lint` pulito (0 errori); `npm run build` completa senza timeout (61 pagine statiche in 23s, tutti i 42 chunk prerenderizzati con revalidate 1d). Con `next start`: `magic/29.xml` → 200 con 1.666 URL (= 146.666 − 29×5000, resto esatto), `yugioh/5.xml` → 2.698 URL (14.371 carte + 13.327 ruling), URL `/ruling` interlacciati correttamente, XML valido con lastmod/changefreq/priority.
> - Restano aperti dal report audit: indici mancanti su `cards` (P0), skip dei no-op nello script ruling (P1), ISR sulle pagine carta (P1), contatore views su tabella dedicata (P2), pg_trgm (P2), migrazione `0002_cards.sql` (P2).
>
> **Sessione precedente (2026-06-13, mattina): audit performance/scalabilità (solo report, nessuna modifica al codice).** Analizzate le top query di `pg_stat_statements`. Esiti principali, in ordine di priorità:
> 1. **P0 — Sitemap chunk senza cache**: i 4 file `app/cards/s/{game}/sitemap.ts` esportano `dynamic = 'force-dynamic'` (introdotto dal commit `04d5f0c` "errore di deploy" al posto di `revalidate = 86400`): ogni fetch di Google rilegge il DB con `ORDER BY slug OFFSET` profondi (Magic fino a ~146k) — è la query da 770s cumulati in pg_stat; i retry per statement timeout in `lib/cardSitemap.ts` lo confermano. Fix: ripristinare ISR (o Route Handler con `Cache-Control` come `app/cards/sitemap.xml/route.ts`) + keyset pagination su `slug`. Il commento "cache-ato 24h da ISR" in `lib/cardSitemap.ts` è stantio.
> 2. **P0 — Indici mancanti su `cards`** (tabella creata a mano su Supabase, non versionata → verificare con `SELECT indexdef FROM pg_indexes WHERE tablename='cards'`): servono `(game, external_id)` (gli UPDATE dello script ruling costano 72ms l'uno = seq scan), `(game, set_name, archetype)` (related Magic, 329ms/query), `(game, name, id)` (related Pokémon + `ORDER BY name, id` del catalogo), `(game, archetype)` (related YGO). NON serve `(game, set_name)` separato (coperto dal prefisso). `(game, slug)` UNIQUE esiste già (lo prova l'`onConflict 'game,slug'` degli import).
> 3. **P1 — `scripts/import-yugioh-rulings.ts`**: 1 UPDATE incondizionato per carta (~14.3k/run, anche quando i payload sono null/invariati) = i 2 UPDATE in cima a pg_stat (28.391+14.345 calls ≈ 3 run). Fix: skip dei no-op + indice di cui sopra.
> 4. **P1 — Pagine carta 100% dinamiche**: `/cards/[game]/[slug]` usa il client Supabase con `cookies()` → render per-request senza cache; 4 SELECT + 1 UPDATE (`increment_card_views`, sparata anche da Googlebot) per pageview × ~190k URL. Fix: client anonimo + ISR.
> 5. **P2**: contatore `total_views` su tabella dedicata (contesa su righe larghe a traffico alto; correlato al bug reset views in TODO.md); pg_trgm GIN su `name` per la ricerca `ilike '%...%'` del catalogo; migrazione `0002_cards.sql` per versionare schema/indici/RPC.
> 6. **Già risolto**: le query `SELECT archetype/set_name/card_type ... ORDER BY` in pg_stat (fino a 1.3s/call) erano il vecchio `fetchDistinct`, rimosso il 2026-06-12 (commit `5b7370e`) — voci storiche; utile un `pg_stat_statements_reset()` per una baseline pulita.
>
> Report completo con file/righe/confidenze nella conversazione di audit del 2026-06-13.
>
> Ultima sessione (2026-06-12): sostituito il contatore mensile `views` (mostrato in UI) con `total_views` permanente (non mostrato). **SQL da eseguire manualmente in Supabase SQL Editor (Simone)**:
> ```sql
> CREATE OR REPLACE FUNCTION increment_card_views(card_id uuid)
> RETURNS void
> LANGUAGE sql
> SECURITY DEFINER
> AS $$
>   UPDATE cards SET total_views = total_views + 1 WHERE id = card_id;
> $$;
> ```
> In `app/cards/[game]/[slug]/CardClient.tsx`: rimosso il prop `views` e il rendering del testo "X visualizzazioni questo mese"; il componente ora ha solo `{ cardId }`, continua a chiamare `increment_card_views` al mount (via `useEffect`) e ritorna `null` (nessun output visivo). In `app/cards/[game]/[slug]/page.tsx`: rimosso `views: number` dal tipo `Card` (la colonna `views` non è più letta/usata; `select('*')` la fetcha comunque ma non viene tipizzata né utilizzata — non serve toccare la select); `generateMetadata` non referenzia più `card.views` — `description` e `openGraph.description` riscritte senza il conteggio ("Cerca {nome} su Huntlist. Trova venditori o pubblica la tua wishlist." / "{nome} su Huntlist — il marketplace delle mancaliste TCG"); rimossa la sezione "Visualizzazioni" (div con `border-t`), `<CardClient cardId={card.id} />` ora montato senza wrapper (ritorna `null`, serve solo per l'effect di incremento). `npm run typecheck` e `npm run lint` puliti. Testato in preview: `/cards/yugioh/sky-striker-ace-kagari` → 200, nessun testo "visualizzazioni"/"questo mese" in pagina. **Da verificare manualmente da Simone dopo aver eseguito il SQL sopra**: visitando la carta, `total_views` deve incrementarsi (`SELECT name, total_views FROM cards WHERE name = 'Sky Striker Ace - Kagari'`). Sessioni precedenti (sitemap ruling YGO, placeholder `<<konami_id>>` in ruling_data, pagina ruling YGO + bottone su pagina carta, effect_data, concorrenza import rulings, creazione import-yugioh-rulings.ts, konami_id su import-yugioh.ts, fix build sitemap Magic, filtri Magic card_type, fix lint, rename `/carte`→`/cards` e `/feed`→`/market`) omesse per brevità — vedi git log per i dettagli. **Nota debito tecnico**: `konami_id`, `ruling_data`, `effect_data` e ora `total_views` sono colonne aggiunte a mano su Supabase, non presenti in `supabase/migrations/0001_init.sql` — valutare una migrazione di follow-up.

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
| — | Hub `/carte` + griglia con ricerca e filtri chip | ✅ Completa |
| — | Sitemap XML + robots.txt | ✅ Completa |
| — | Rename route `/carte`→`/cards`, `/feed`→`/market` | ✅ Completa |

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

### Catalogo carte (ristrutturato 2026-06-10: da `/[game]/carte` a `/carte/[game]`)

**File creati:**
- `app/carte/page.tsx` — hub selezione gioco (pubblico, no auth check): conta le carte per gioco con `Promise.all` (`count: 'exact', head: true`), tre card neobrutalist cliccabili → `/carte/{game}`
- `app/carte/layout.tsx` — layout che renderizza `AppNavbar` + `BottomNav` (stesso pattern del layout `(app)`, ma senza redirect se non loggato): senza questo le pagine carte erano un dead-end senza navigazione
- `app/carte/[game]/page.tsx` — server wrapper: valida `game` con `GAMES` (`notFound()` se invalido), `generateMetadata` dinamico, fetch in parallelo dei valori distinti `archetype`/`card_type`/`set_name` e li passa a `CarteClient`
- `app/carte/[game]/CarteClient.tsx` — client component: ricerca con debounce 300ms (min 2 caratteri, `ilike`), tre sezioni di chip filtri (label per gioco: YGO Archetipo/Tipo carta/Set, Pokémon Tipo elemento/Categoria/Set, One Piece Colore/Tipo carta/Set; sezioni vuote nascoste), griglia 2/4 colonne, paginazione "Carica altre" da 48, skeleton loading, `AbortController` su ogni fetch, reset pagina a 0 al cambio di query/filtro
- `app/carte/[game]/[slug]/page.tsx` + `CardClient.tsx` — dettaglio carta spostato dalla vecchia posizione, invariato salvo: breadcrumb `Carte → {Gioco} → {Nome}`, CTA "Vedi tutte"/"Fai offerta" ora puntano a `/feed?card=...&game=...` (i vecchi target `/{game}/hunts` e `/hunts` erano route inesistenti → 404)

**File modificati:**
- `components/layout/AppNavbar.tsx` — link "Carte" → `/carte` nel nav desktop, visibile anche da sloggati (Feed/Dashboard restano solo per loggati)
- `components/layout/BottomNav.tsx` — tab "Carte" con icona, tra Feed e il bottone "+"
- `next.config.ts` — redirect 301 `/:game(yugioh|pokemon|one_piece)/carte` → `/carte/:game` e `/:game(...)/carte/:slug` → `/carte/:game/:slug` (il vincolo regex evita loop su `/carte/carte/...`); aggiunto `images.scrydex.com` ai `remotePatterns`

**File eliminati:** `app/[game]/` (intera cartella: vecchia griglia e vecchio dettaglio).

**Decisioni tecniche / fix trovati in verifica:**
- la query della griglia ordina per `name` **e poi `id`**: senza tiebreaker l'ordinamento non è totale (molti nomi duplicati, soprattutto Pokémon) e le pagine successive ripescavano righe già viste → chiavi React duplicate
- ~628 carte Pokémon hanno `image_url` su `images.scrydex.com` (le altre su `images.pokemontcg.io`): host aggiunto a `next.config.ts`, altrimenti `next/image` lancia errore a runtime e la pagina cade sull'error boundary
- per Pokémon `archetype` è sempre `null` (l'import valorizza solo `card_type` = supertype) → la sezione "Tipo elemento" oggi non compare; comparirà quando l'import popolerà il campo
- i valori distinti dei filtri sono calcolati lato server senza `SELECT DISTINCT` (PostgREST non lo espone e tronca ogni risposta a 1000 righe): `fetchDistinct` fa un count e poi scarica la colonna a chunk da 1000 in parallelo (cap 30.000 righe), deduplica via `Set` e tiene il risultato in una cache in memoria con TTL 1h. Con un singolo select da 1000 righe i filtri uscivano monchi (es. "Tipo carta" YGO con 1 solo valore). Per cataloghi molto più grandi conviene comunque una RPC `SELECT DISTINCT` dedicata

### Rename route: `/carte` → `/cards`, `/feed` → `/market` (2026-06-11)

**Cartelle rinominate (git mv):** `app/carte/` → `app/cards/`, `app/(app)/feed/` → `app/(app)/market/`.

**Riferimenti aggiornati:** tutti i link/`redirect()`/`router.push()`/`revalidatePath()` interni, `app/sitemap.ts` e `app/cards/sitemap.ts` (URL `/cards/...` e `/market`), `app/robots.ts` (sitemap `/cards/sitemap.xml`), `AppNavbar`/`BottomNav`, CTA della pagina carta, `?next=` del bottone Google OAuth, `public/manifest.json` (`start_url: /market`) e `public/sw.js` (precache `/market`).

**Redirect 301 in `next.config.ts`:** `/carte/:path*` → `/cards/:path*`, `/feed[/:path*]` → `/market[/:path*]`; i redirect legacy `/{game}/carte[/:slug]` ora puntano direttamente a `/cards/...` (un solo hop).

**Note:**
- `public/sw.js`: oltre al path, alzato `CACHE_NAME` a `huntlist-v2` — il SW è cache-first senza handler di activate, e i client con la v1 servivano `/feed` dalla cache ignorando il redirect (visto in verifica). Con il nuovo SW il precache riparte; le cache `huntlist-v1` orfane restano finché non si aggiunge un handler di activate che le pulisca (micro–debito tecnico)
- le label visibili in navbar/bottom nav restano "Feed" e "Carte" (decisione copy non presa in questa sessione: i link puntano a `/market` e `/cards`)
- i componenti si chiamano ancora `CarteClient`/`CardClient` (solo i path URL sono stati rinominati)

### Aggiunto Magic: The Gathering come quarto gioco (2026-06-11)

**File modificati:**
- `lib/tcg.ts` — `'magic'` aggiunto a `GAMES`, `GAME_LABELS` ("Magic: The Gathering"); aggiunto export `TCG_META` (emoji per gioco, 🧙 per Magic)
- `app/cards/page.tsx` — quarta card hub "Magic: The Gathering" (0 carte finché non si importa); griglia passata da `md:grid-cols-3` a `md:grid-cols-2 lg:grid-cols-4`
- `app/cards/[game]/page.tsx`, `app/cards/[game]/[slug]/page.tsx`, `app/cards/[game]/CarteClient.tsx` — aggiunta voce `magic` ai `Record<Game, ...>` locali (`GAME_LABEL`, `FILTER_LABELS`) per allineamento col tipo `Game` esteso
- `components/auth/OnboardingWizard.tsx`, `app/(app)/settings/SettingsClient.tsx` — aggiunta voce `magic` ai `TCG_META` locali (duplicati, non ancora consolidati con quello di `lib/tcg.ts`)

**Verificato senza modifiche:** `completeOnboardingSchema` (`lib/validation/auth.ts`) e `updatePreferredGamesSchema` (`settings/actions.ts`) usano `z.enum([...GAMES])` → accettano `'magic'` automaticamente.

**Note:**
- L'enum Postgres `game_type` ha già il valore `'magic'` (fatto in sessione precedente)
- Nessun import/sync carte Magic ancora implementato — `/cards/magic` mostra 0 carte
- Debito tecnico minore: `TCG_META` è duplicato in tre posti (`lib/tcg.ts`, `OnboardingWizard.tsx`, `SettingsClient.tsx`); da consolidare su un'unica fonte in futuro

### Import One Piece TCG e Magic: The Gathering (2026-06-11)

**File creati:**
- `scripts/import-onepiece.ts` — import one-shot da OPTCG API
- `scripts/import-magic.ts` — import one-shot da Scryfall bulk data (`default_cards`)

**File modificati:**
- `app/api/sync-cards/route.ts` — aggiunto supporto `?game=one_piece` e `?game=magic`; nuovo `fetchExistingSlugs` (oltre a `fetchExistingIds`) perché per Magic più righe condividono lo stesso `external_id` (uno scryfall id per carta, una riga per `finish`) e la novità va determinata sullo `slug`
- `next.config.ts` — `remotePatterns` aggiunti: `en.onepiece-cardgame.com`, `optcgapi.com`, `cards.scryfall.io`, `c1.scryfall.com`

**Deviazioni dalla spec (verificate live contro le API reali):**
- **One Piece**: l'endpoint `https://optcgapi.com/api/v1/cards?page=N&limit=100` indicato nella spec **non esiste** (404). L'API reale è `https://optcgapi.com/api/allSetCards/`: nessuna paginazione, restituisce tutte le carte (~3.330, non ~4.300) in un array diretto con campi `card_set_id`, `card_name`, `card_text`, `set_id`, `rarity`, `card_color`, `card_type`, `card_power`, `card_cost`, `card_image` (non `card_id`/`name`/`effect`/`set`/`color`/`power`/`cost`/`image_url` come da spec). Script e route adattati di conseguenza
- **One Piece — dedup per slug**: `slugify(card_set_id)` produce **2.135 slug unici su 3.330 carte** — molte varianti/art alternativa condividono lo stesso `card_set_id` (es. due "Donquixote Doflamingo" entrambi `OP01-073`). Con la dedup per slug richiesta dalla spec, solo la prima variante per `card_set_id` viene importata: ~1.195 art alternative non entreranno nel catalogo. Se servono anche le varianti, servirebbe uno slug che includa anche un identificatore di variante (es. indice o nome) — non incluso in questa sessione, da validare con l'utente prima di cambiare lo schema slug
- **Magic**: confermato Scryfall (`api.scryfall.com/bulk-data` → `default_cards`); il file bulk è ~545MB (non ~100MB come stimato in spec) — `response.json()` su file di queste dimensioni può richiedere più memoria di quella di default di Node, valutare `node --max-old-space-size=4096` se lo script va in OOM

**Non eseguiti in questa sessione** (mutano il DB, da lanciare manualmente dall'utente):
```bash
npx tsx scripts/import-onepiece.ts   # ~2.135 carte uniche per slug
npx tsx scripts/import-magic.ts      # decine di migliaia di righe (carta+finish), 15-20 min
```
Per il sync incrementale via cron, `app/api/sync-cards?game=one_piece` e `?game=magic` sono pronti ma non testati con chiamata reale (richiede `CRON_SECRET`).

### Pagina dettaglio carta: stampe YGO + carte correlate (2026-06-11)

**File modificati:**
- `app/cards/[game]/[slug]/page.tsx`
  - `Card` esteso con `card_type`, `archetype`, `affiliation` (servono alla logica delle correlate)
  - nuova sezione "Tutte le edizioni" (solo `game === 'yugioh'`): `getPrintings(cardId)` legge `card_printings` (`set_name, set_number, rarity`, ordinate per `set_name, set_number`), tabella neobrutalist (bordo 2px su tabella e celle header, header `bg-[#EAE2D4]`/dark `bg-[#1A1C19]`); non renderizzata se nessuna stampa
  - nuova sezione "Carte simili": `getRelatedCards(card)` con logica per gioco (YGO: `archetype` poi fallback `card_type`; Pokémon: stesso `name`; Magic: `set_name`+`archetype` poi fallback solo `set_name`; One Piece: `archetype`+`affiliation` poi fallback `archetype` poi `card_type`), `limit(6)`, `neq('id', card.id)`; riga scrollabile orizzontale (`overflow-x-auto [&::-webkit-scrollbar]:hidden`, niente nuovo plugin Tailwind), card 120×170 con `next/image`, bordo 2px + ombra offset 2px, link a `/cards/{game}/{slug}`; non renderizzata se 0 risultati
  - guardia: se `archetype`, `card_type`, `name`, `set_name` e `affiliation` sono tutti falsy non viene fatta alcuna fetch per le correlate (in pratica `name` è sempre presente, quindi è una guardia difensiva)

**Verifica:** `npm run typecheck` pulito; `npm run lint` stessi 3 errori preesistenti non correlati. Testato via richieste dirette al dev server (il browser preview serve la landing page cacheata dal service worker PWA su ogni navigazione client-side, problema preesistente non legato a questa modifica):
- `/cards/yugioh/blue-eyes-white-dragon` → "Tutte le edizioni" con righe da `card_printings` + "Carte simili" (6 carte)
- `/cards/pokemon/brock-s-ninetales-gym-challenge-3` → solo "Carte simili" (altre stampe di "Brock's Ninetales")
- `/cards/one_piece/op03-084` → nessuna sezione correlate (nessun'altra carta condivide `archetype=Black` + `affiliation=CP6`), comportamento corretto

### Sitemap e robots.txt (2026-06-11)

**File creati:**
- `app/sitemap.ts` — sitemap delle pagine statiche/pubbliche su `/sitemap.xml` (home, `/carte`, i tre cataloghi, `/feed`, `/privacy`) con `changeFrequency`/`priority`
- `app/carte/sitemap.ts` — sitemap delle pagine carta su `/carte/sitemap.xml`: ~38.866 URL, query Supabase paginata da 1000 con **ordinamento totale su `slug`** (senza, `range` può saltare/duplicare righe), `lastModified` da `updated_at`, `export const revalidate = 86400` (il catalogo cambia solo col sync notturno). Usa `createClient` da `@supabase/supabase-js` con `SUPABASE_SECRET_KEY` (file solo server, mai importato dal client; la publishable key ha rate limit più bassi)
- `app/robots.ts` — robots.txt nativo su `/robots.txt`: disallow sulle route autenticate **reali** (`/dashboard`, `/onboarding`, `/settings`, `/offers/`, `/hunts/new`, `/hunts/*/edit`, `/hunts/*/offer`, `/api/`, `/auth/`, `/callback`, pagine auth) e dichiara entrambe le sitemap

**Decisioni tecniche:**
- **`next-sitemap` NON installato**, in deviazione dalla spec: genera `public/sitemap.xml` in postbuild dal manifest di build, quindi (a) non vedrebbe le 34k+ pagine carta SSR dinamiche, (b) il file in `public/` andrebbe in conflitto con la route `/sitemap.xml` di `app/sitemap.ts`. Le metadata route native dell'App Router coprono tutto (sitemap, robots, esclusioni) senza dipendenze né script `postbuild` — `package.json` è rimasto intatto
- la spec proponeva disallow su `/offerte` e `/profilo/*`, path che non esistono: usate le route reali; i profili (`/profile/[username]`) sono pubblici e restano indicizzabili
- sitemap carte: ~39k URL all'epoca. ✅ **Fatto** il passaggio a `generateSitemaps()` per gioco quando il totale ha superato i 50k (Magic 146k) — vedi sezione "Sitemap per gioco con `generateSitemaps`" sopra; `app/cards/sitemap.ts` è stato sostituito
- in produzione serve `SUPABASE_SECRET_KEY` tra le env Vercel (già richiesta da import/sync)

### Sitemap per gioco con `generateSitemaps` (2026-06-11)
Sostituita la sitemap carte unica (superava i 50k URL/file di Google: solo Magic ha 146.666 carte, totale ~189k) con **una sitemap per gioco**, chunkata.

**File creati:**
- `lib/cardSitemap.ts` — helper condiviso: `SITEMAP_BATCH_SIZE = 40000` (margine sotto i 50k); `generateGameSitemaps(game)` conta le carte del gioco e ritorna i chunk `{ id }` (almeno 1); `buildGameSitemap(game, id)` pagina a 1000 con **ordinamento totale su `slug`** e `range`; `resolveSitemapId(id)` normalizza l'`id` (vedi sotto); `listCardSitemapUrls()` enumera tutti gli URL chunk per `robots.txt`. Lettura pagine con **retry su statement timeout** (`fetchPage`): su tabelle grandi gli offset profondi possono andare in timeout — se ignorato, `data` null verrebbe scambiato per "fine righe" e produrrebbe un chunk parziale poi cache-ato 24h da ISR; ora ritenta e, se persiste, **lancia** (route in errore invece di sitemap monca)
- `app/cards/s/{yugioh,pokemon,one_piece,magic}/sitemap.ts` — 4 route concrete, una per gioco, ognuna col proprio `GAME` fissato; `generateSitemaps()` + default `sitemap({ id })` delegano all'helper; `export const revalidate = 86400`

**File modificati:**
- `app/sitemap.ts` — invariato nei contenuti (home, `/cards`, i 4 hub gioco, `/market`, `/privacy`); aggiornato solo il commento al nuovo path
- `app/robots.ts` — ora **async** con `export const revalidate = 86400`: dichiara `/sitemap.xml` + tutti i chunk per gioco via `listCardSitemapUrls()`

**File eliminati:** `app/cards/sitemap.ts` (la vecchia sitemap unica).

**Deviazioni dalla spec — la spec non era implementabile così com'era in Next 16.2.7 (verificato empiricamente):**
- la spec proponeva un unico `app/cards/[game]/sitemap.ts` che legge `params.game`. **Non funziona**: il loader delle metadata route di Next 16 chiama `generateSitemaps()` **senza argomenti** e il handler `sitemap()` con **solo `{ id }`** — i `params` del segmento dinamico NON vengono inoltrati (log provati: `generateSitemaps arg = undefined`, `sitemap arg = {"id":{}}`). Quindi il gioco va **fissato staticamente file per file** → 4 route, non 1
- inoltre `/cards/{game}/sitemap.xml` collide con la route `[slug]` (interpretato come carta con slug `sitemap.xml` → 404). Le sitemap per gioco vivono perciò sotto un segmento che non collide: **`/cards/s/{game}/...`**
- Next 16 **non** espone un indice a `/cards/s/{game}/sitemap.xml` (404): sono validi solo i chunk numerati `/cards/s/{game}/sitemap/{id}.xml`, perciò `robots.txt` li elenca tutti uno per uno (non l'indice)
- `id` arriva al handler come **Promise** (non come `number` come da doc): `resolveSitemapId` await-a e fa `parseInt`

**Verifica (dev server, conteggi confrontati col DB):** Magic 4 chunk = 40k+40k+40k+26.666 = **146.666** ✓; Yu-Gi-Oh! 14.371 ✓; Pokémon 24.495 ✓; One Piece 3.290 ✓. `/robots.txt` lista `/sitemap.xml` + 7 chunk (1+1+1+4). Nessuna regressione sulle pagine dettaglio carta (`/cards/{game}/{slug}` → 200); `/cards/s` → 404 innocuo. `npm run typecheck` pulito, `npm run lint` invariato (stessi 3 errori preesistenti).

### Sitemap index carte (2026-06-12)
Search Console non riusciva a indicizzare le sitemap carta: i chunk per gioco (`/cards/s/{game}/sitemap/{id}.xml`) non avevano un indice che li aggregasse — `robots.txt` li elencava uno per uno.

**File creati:**
- `app/cards/sitemap.xml/route.ts` — route handler `GET` che restituisce un **sitemap index** XML su `/cards/sitemap.xml`, aggregando tutti i chunk per gioco. `Content-Type: application/xml`, `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`, **nessun** `export const revalidate` (solo l'header). I conteggi chunk sono **hardcodati** in `GAME_CHUNKS` (`pokemon: 5, yugioh: 3, one_piece: 1, magic: 30` = 39 loc totali), tipizzato `Record<Game, number>` (aggiungere un gioco a `GAMES` forza un errore di compilazione finché non si aggiunge il conteggio)

**File modificati:**
- `app/robots.ts` — la lista sitemap passa dai singoli chunk (enumerati via `listCardSitemapUrls()` con query al DB) a **due soli riferimenti**: `/sitemap.xml` + `/cards/sitemap.xml`. Robots torna **sincrono** (rimossi l'`await listCardSitemapUrls()`, l'import e `export const revalidate = 86400`): non tocca più il DB

**Decisione — conteggi hardcodati invece di `listCardSitemapUrls()`:** l'helper dinamico esiste ancora in `lib/cardSitemap.ts` e produce gli stessi URL, ma fa un `count` al DB per gioco. L'indice (e robots) **non devono** dipendere dal DB: le query su Magic (~146k righe) vanno in **statement timeout / 500** (visto live in questa stessa sessione sui filtri), e un indice che 500-a riporterebbe Search Console a fallire — esattamente il bug da risolvere. Il commento in `route.ts` lega `GAME_CHUNKS` a `SITEMAP_BATCH_SIZE` (5000): `chunk = ceil(carte_gioco / 5000)`, da aggiornare se il catalogo cresce. `listCardSitemapUrls()` resta nel file (ora non più usato) ma non è stato rimosso per non allargare lo scope.

**Verifica (dev server):** `GET /cards/sitemap.xml` → 200, `application/xml`, header cache corretto, 39 `<loc>` (pokemon 5, yugioh 3, one_piece 1, magic 30), primo `pokemon/sitemap/0.xml`, ultimo `magic/sitemap/29.xml`. `GET /robots.txt` → 200 con esattamente 2 righe `Sitemap:`. `npm run typecheck` pulito, `npm run lint` invariato (stessi 3 errori preesistenti non correlati).

### Vercel Analytics (2026-06-12)
Integrato Vercel Web Analytics.

**File modificati:**
- `app/layout.tsx` — `import { Analytics } from "@vercel/analytics/next"` e `<Analytics />` dentro il `<body>` dopo i children (dopo `<PWARegister />`)
- `package.json` — `@vercel/analytics ^2.0.1` (era già presente come dipendenza, nessuna reinstallazione necessaria)

**Note:**
- `npm run typecheck` pulito; pagina renderizza senza errori console
- in locale `<Analytics />` non invia dati: Vercel Web Analytics raccoglie solo in produzione su Vercel (comportamento atteso). Per i dati reali serve che il progetto abbia **Analytics abilitato** nella dashboard Vercel

### Filtri catalogo riscritti — chip hardcodati + autocomplete (2026-06-12)
I filtri di `/cards/[game]` caricavano al mount tutti i valori distinti di `archetype`/`card_type`/`set_name` dal DB (`fetchDistinct` con count + chunk da 1000 + cache TTL 1h): pesante e lento. Ora sono **statici** — la pagina carica istantaneamente senza fetch al mount.

**File modificati:**
- `app/cards/[game]/page.tsx` — rimosso interamente `fetchDistinct`, la cache in memoria, i tipi `FilterField`/`ServerSupabase` e l'import di `createClient` server. La pagina non fa più alcuna query e non passa più la prop `filtri` a `CarteClient`. Tipo `CarteFiltri` non più usato (rimosso anche da `CarteClient`)
- `app/cards/[game]/CarteClient.tsx` — riscritti i filtri:
  - `GAME_FILTERS: Record<Game, GameFilterConfig>` con valori **hardcodati** per gioco. Ogni filtro è una sezione "attributo/colore/tipo elemento" + una sezione "tipo carta"; il **filtro Set è stato rimosso del tutto**
  - chip option modellata come `{ label, value, match: 'eq' | 'ilike' }` — `label` è ciò che si vede, `value` ciò che va in query
  - **YGO**: archetipo via **autocomplete** (`useAttributeAutocomplete`), tipo carta a chip con `ilike` su parola chiave (label IT → value EN: Mostro→`%Monster%`, Spell→`%Spell%`, Trappola→`%Trap%`, Fusion, Synchro, XYZ, Link, Rituale→`%Ritual%`, Pendulum, Tuner) perché nel DB i `card_type` sono compositi ("Effect Monster", "Continuous Spell Card"…)
  - **Pokémon**: tipo elemento (`archetype`, `eq`) + tipo carta (`card_type`, `eq`), entrambi a chip
  - **One Piece**: colore (`archetype`, **`ilike`** così "Blue" cattura "Blue Black") + tipo carta (`card_type`, `eq`), a chip
  - **Magic**: colore (`archetype`, `eq`) a chip + tipo carta via **autocomplete**
  - `AutocompleteFilter`: input separato dalla barra ricerca, debounce 300ms, query `ilike` su `archetype`/`card_type` con `.limit(8)` + dedup via `Set`, dropdown max 8 voci, `AbortController`, click → imposta filtro (`eq` esatto) e chiude. Valore selezionato mostrato come chip Chartreuse con × per deselezionare
  - reset `pagina` a 0 ad ogni cambio filtro; `AbortController` su ogni fetch della griglia

**Verifica (dev server, dark mode):** `/cards/yugioh` carica istantaneamente, mostra autocomplete "Archetipo" + 10 chip "Tipo carta", nessun "Set"; digitando "Sky" il dropdown mostra "Sky Striker"/"The Sanctuary in the Sky", click su "Sky Striker" → chip selezionato + griglia filtrata (Aileron, Combined Maneuver…). `/cards/pokemon` → chip "Tipo elemento" (11) + "Tipo carta" (Pokémon/Trainer/Energy), nessun fetch al mount. `/cards/magic` → chip "Colore" (W/U/B/R/G/Multicolor/Colorless) + autocomplete "Tipo carta". `npm run typecheck` pulito; `npm run lint` invariato (stessi 3 errori preesistenti non correlati); nessun errore console.

**Note / debito:**
- per i chip colore Magic vale la spec ("per tutti gli altri usa `eq` esatto"): nel DB `archetype` Magic è `colors.join('')` (es. "WU", "WUBRG"), quindi i chip a colore singolo "W"/"U"/… matchano solo le mono-colore e "Multicolor"/"Colorless" probabilmente non matchano nessuna riga finché non si normalizza il dato all'import. Comportamento voluto da spec in questa sessione, da rivedere se i filtri colore Magic devono catturare anche le multicolore
- i chip "Tipo elemento" Pokémon funzionano solo quando l'import popola `archetype` (= `types[0]`, aggiunto in `scripts/import-pokemon.ts` in questa stessa sessione): finché il DB non viene re-importato, i chip rendono ma filtrano a vuoto

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
                  card_type, archetype, affiliation, atk/def/level, hp/damage, power/cost,
                  external_id, views)
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
/market                 → feed pubblico Hunt (pubblico; ex /feed, che redirige 301)
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

/cards                  → hub selezione gioco (pubblico)
/cards/[game]           → griglia carte con ricerca + filtri chip (pubblico, yugioh|pokemon|one_piece|magic)
/cards/[game]/[slug]    → dettaglio carta + JSON-LD (pubblico)
/carte/:path*           → redirect 301 a /cards/:path* (next.config.ts)
/feed[/:path*]          → redirect 301 a /market[/:path*] (next.config.ts)
/[game]/carte[/slug]    → redirect 301 diretto a /cards/... (next.config.ts)
/sitemap.xml            → sitemap pagine statiche (app/sitemap.ts)
/cards/sitemap.xml      → sitemap INDEX delle carte: aggrega i 39 chunk per gioco (app/cards/sitemap.xml/route.ts)
/cards/s/{game}/sitemap/{id}.xml → chunk sitemap per gioco (app/cards/s/{game}/sitemap.ts, revalidate 24h)
/robots.txt             → robots nativo con disallow route private + 2 sitemap (app/robots.ts)
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

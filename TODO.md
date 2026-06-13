# Bug noti

> Aggiornato: giugno 2026

## Priorità alta

- **Visualizzazioni carte si resettano** — una carta mostrava 7 views, dopo qualche ora tornava a 0 su un altro account. Probabile bug nella RPC `increment_card_views` o nella logica di lettura.
- **Redirect /feed non aggiornati** — alcuni link nella landing puntano ancora a `/feed` invece di `/market`. Da cercare in `LandingClient.tsx`. Non era un bug dice Claude, i redirect 301 in `next.config.ts` coprono comunque qualsiasi link vecchio rimasto.
- **Vercel: errore su www.huntlist.eu e huntlist.eu** — aprendo direttamente da dashboard Vercel dà "ops qualcosa è andato storto". Da investigare (potrebbe essere il dominio primario non configurato correttamente su Vercel).

## Priorità media

- **Edizioni mancanti su alcune carte** — alcune carte non mostrano le stampe nella sezione edizioni. Probabilmente carte YGO senza righe corrispondenti in `card_printings`.
- **Filtri Magic non funzionanti** — alcuni chip non filtrano correttamente; il filtro per tipo carta (Creature, Artifact, ecc.) non funziona. Da rivedere la logica `ilike` in `CarteClient.tsx` per il gioco `magic`.

## Priorità bassa / non risolvibile ora

- **Login Google mostra dominio Supabase** — il popup dice "Continua su xeuqikkusciglevzbdsr.supabase.co". Comportamento standard di Google OAuth con Supabase, risolvibile solo con OAuth custom (non vale la pena).
- **3 errori preesistenti di lint** — Claude Code li menziona ma non ne è nota la natura. Da investigare con `npm run lint` e documentare qui. (Risolto)
- entrando direttamente su huntlist.eu/market non carica le hunt finchè non cambio filtro, dobbiamo fare audit di tutte le call al database e della gestione dei dati al caricamento del sito e alle cache
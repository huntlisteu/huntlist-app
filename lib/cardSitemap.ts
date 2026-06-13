import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { Game } from '@/lib/tcg'

const SITE_URL = 'https://www.huntlist.eu'

/**
 * Numero massimo di URL per file sitemap. Google ne ammette 50.000;
 * 5.000 lascia margine. Magic (~146k carte) richiede quindi piu' chunk,
 * Yu-Gi-Oh!/Pokemon/One Piece stanno in pochi chunk ciascuno.
 *
 * Sitemap per gioco: 4 route concrete in `app/cards/s/{game}/sitemap.ts`,
 * ognuna col proprio `game` fissato. In Next 16 il loader delle metadata
 * route NON inoltra i `params` del segmento dinamico al handler della
 * sitemap (`generateSitemaps()` riceve `undefined`, `sitemap()` riceve solo
 * `{ id }`), quindi un unico `app/cards/[game]/sitemap.ts` non saprebbe quale
 * gioco rendere: il gioco va fissato staticamente file per file.
 */
export const SITEMAP_BATCH_SIZE = 5000

/**
 * Dimensione pagina delle letture keyset: allineata al max-rows di
 * PostgREST su Supabase (1000), oltre il quale le righe verrebbero troncate.
 */
const PAGE_SIZE = 1000
const PAGE_RETRIES = 3

/**
 * TTL della memo in-process delle entry per gioco. Serve soprattutto al
 * build/ISR: i 30 chunk Magic condividono la stessa lettura invece di
 * rileggere ~146k righe a testa. A runtime ogni rigenerazione ISR parte
 * tipicamente da un processo freddo, quindi il TTL conta poco; resta basso
 * per non servire dati piu' vecchi della finestra di revalidate.
 */
const ENTRIES_TTL_MS = 60 * 60 * 1000

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error(
      'Variabili Supabase mancanti per la sitemap: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY richieste.',
    )
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type SitemapRow = {
  slug: string
  updated_at: string | null
}

/**
 * Legge una pagina di slug con keyset pagination (`slug > afterSlug`),
 * servita dall'indice UNIQUE `cards_game_slug_key (game, slug)`: costo
 * O(log n) + PAGE_SIZE indipendentemente dalla profondita', al contrario
 * dell'OFFSET usato in passato che su Magic (~146k righe) scansionava tutte
 * le righe precedenti e incappava nello statement timeout di Postgres.
 * `slug` e' unico per gioco, quindi l'ordinamento e' totale e nessuna riga
 * viene saltata o duplicata tra le pagine.
 *
 * Con `onlyWithRuling` filtra le sole carte con `ruling_data` valorizzato
 * (per gli URL `/ruling` di Yu-Gi-Oh!), senza mai scaricare il JSONB.
 *
 * Un errore transitorio viene ritentato; se persiste si lancia, cosi' la
 * route fallisce invece di servire una sitemap monca (che ISR cache-erebbe).
 */
async function fetchSlugPage(
  supabase: ReturnType<typeof adminClient>,
  game: Game,
  afterSlug: string | null,
  onlyWithRuling: boolean,
): Promise<SitemapRow[]> {
  for (let attempt = 0; attempt < PAGE_RETRIES; attempt++) {
    let query = supabase
      .from('cards')
      .select('slug, updated_at')
      .eq('game', game)
      .order('slug', { ascending: true })
      .limit(PAGE_SIZE)

    if (afterSlug !== null) query = query.gt('slug', afterSlug)
    if (onlyWithRuling) query = query.not('ruling_data', 'is', null)

    const { data, error } = await query

    if (!error) return (data ?? []) as SitemapRow[]

    if (attempt === PAGE_RETRIES - 1) {
      throw new Error(
        `Sitemap ${game}: lettura pagina dopo slug "${afterSlug ?? '(inizio)'}" fallita dopo ${PAGE_RETRIES} tentativi: ${error.message}`,
      )
    }

    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
  }

  return []
}

/** Legge tutte le righe (slug, updated_at) di un gioco via keyset. */
async function fetchAllRows(
  supabase: ReturnType<typeof adminClient>,
  game: Game,
  onlyWithRuling = false,
): Promise<SitemapRow[]> {
  const rows: SitemapRow[] = []
  let afterSlug: string | null = null

  while (true) {
    const page = await fetchSlugPage(supabase, game, afterSlug, onlyWithRuling)
    rows.push(...page)

    const last = page[page.length - 1]
    if (page.length < PAGE_SIZE || !last) break
    afterSlug = last.slug
  }

  return rows
}

/**
 * Costruisce TUTTE le entry sitemap di un gioco, in ordine di slug.
 * Per Yu-Gi-Oh!, ogni carta con `ruling_data` aggiunge anche l'URL
 * `/cards/yugioh/{slug}/ruling` subito dopo quello della carta.
 */
async function buildGameEntries(game: Game): Promise<MetadataRoute.Sitemap> {
  const supabase = adminClient()
  const rows = await fetchAllRows(supabase, game)
  const rulingSlugs =
    game === 'yugioh'
      ? new Set((await fetchAllRows(supabase, game, true)).map((row) => row.slug))
      : null

  const entries: MetadataRoute.Sitemap = []
  for (const card of rows) {
    entries.push({
      url: `${SITE_URL}/cards/${game}/${card.slug}`,
      lastModified: card.updated_at ?? undefined,
      changeFrequency: 'monthly',
      priority: 0.7,
    })

    if (rulingSlugs?.has(card.slug)) {
      entries.push({
        url: `${SITE_URL}/cards/yugioh/${card.slug}/ruling`,
        lastModified: card.updated_at ?? undefined,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    }
  }

  return entries
}

type EntriesCacheSlot = {
  at: number
  promise: Promise<MetadataRoute.Sitemap>
}

const entriesCache = new Map<Game, EntriesCacheSlot>()

/**
 * Entry sitemap di un gioco, memoizzate in-process: `generateGameSitemaps`
 * e i singoli chunk di `buildGameSitemap` condividono una sola lettura dal
 * DB. La promise viene cache-ata subito (non il risultato) cosi' anche le
 * chiamate concorrenti durante il prerender si agganciano alla stessa
 * lettura; in caso di errore lo slot viene rimosso e il chiamante successivo
 * ritenta da zero.
 */
function loadGameEntries(game: Game): Promise<MetadataRoute.Sitemap> {
  const cached = entriesCache.get(game)
  if (cached && Date.now() - cached.at < ENTRIES_TTL_MS) return cached.promise

  const slot: EntriesCacheSlot = { at: Date.now(), promise: buildGameEntries(game) }
  entriesCache.set(game, slot)

  slot.promise.catch(() => {
    if (entriesCache.get(game) === slot) entriesCache.delete(game)
  })

  return slot.promise
}

/**
 * Calcola i chunk necessari per un gioco. Restituisce sempre almeno un chunk
 * (`{ id: 0 }`) cosi' la route esiste anche con catalogo vuoto.
 *
 * Il conteggio deriva dalle stesse entry servite da `buildGameSitemap`
 * (carte + eventuali URL ruling), quindi enumerazione e contenuto dei chunk
 * sono sempre coerenti tra loro.
 */
export async function generateGameSitemaps(game: Game): Promise<{ id: number }[]> {
  const entries = await loadGameEntries(game)
  const numSitemaps = Math.max(1, Math.ceil(entries.length / SITEMAP_BATCH_SIZE))
  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }))
}

/**
 * In Next 16 il handler della sitemap riceve `id` come Promise (non come
 * numero, a differenza di quanto documentato). Questa funzione normalizza
 * entrambe le forme a un intero >= 0.
 */
export async function resolveSitemapId(id: unknown): Promise<number> {
  const resolved = await Promise.resolve(
    id as PromiseLike<string | number | undefined> | string | number | undefined,
  )
  const parsed =
    typeof resolved === 'number'
      ? resolved
      : typeof resolved === 'string'
        ? parseInt(resolved, 10)
        : 0
  return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed
}

/**
 * Entry della sitemap per un gioco e un chunk: slice di SITEMAP_BATCH_SIZE
 * entry dall'elenco completo memoizzato. A differenza della vecchia versione
 * (range numerico sulle sole carte), i chunk partizionano l'elenco gia'
 * comprensivo degli URL ruling: nessun chunk supera SITEMAP_BATCH_SIZE URL
 * e nessun chunk enumerato risulta vuoto.
 */
export async function buildGameSitemap(game: Game, id: number): Promise<MetadataRoute.Sitemap> {
  const entries = await loadGameEntries(game)
  const from = id * SITEMAP_BATCH_SIZE
  return entries.slice(from, from + SITEMAP_BATCH_SIZE)
}

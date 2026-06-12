import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GAMES, type Game } from '@/lib/tcg'

const SITE_URL = 'https://www.huntlist.eu'

/**
 * Numero massimo di URL per file sitemap. Google ne ammette 50.000;
 * 40.000 lascia margine. Magic (~146k carte) richiede quindi piu' chunk,
 * Yu-Gi-Oh!/Pokemon/One Piece stanno in un solo chunk ciascuno.
 *
 * Sitemap per gioco: 4 route concrete in `app/cards/s/{game}/sitemap.ts`,
 * ognuna col proprio `game` fissato. In Next 16 il loader delle metadata
 * route NON inoltra i `params` del segmento dinamico al handler della
 * sitemap (`generateSitemaps()` riceve `undefined`, `sitemap()` riceve solo
 * `{ id }`), quindi un unico `app/cards/[game]/sitemap.ts` non saprebbe quale
 * gioco rendere: il gioco va fissato staticamente file per file.
 */
export const SITEMAP_BATCH_SIZE = 5000
const PAGE_SIZE = 1000

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

/**
 * Calcola i chunk necessari per un gioco. Restituisce sempre almeno un chunk
 * (`{ id: 0 }`) cosi' la route esiste anche con catalogo vuoto.
 *
 * Per Yu-Gi-Oh!, ogni carta con `ruling_data` aggiunge anche l'URL
 * `/cards/yugioh/{slug}/ruling` (vedi buildGameSitemap), quindi il totale
 * di URL include anche il conteggio delle carte con ruling.
 */
export async function generateGameSitemaps(game: Game): Promise<{ id: number }[]> {
  const supabase = adminClient()
  const { count } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .eq('game', game)

  let total = count ?? 0

  if (game === 'yugioh') {
    const { count: rulingCount } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('game', 'yugioh')
      .not('ruling_data', 'is', null)
    total += rulingCount ?? 0
  }

  const numSitemaps = Math.max(1, Math.ceil(total / SITEMAP_BATCH_SIZE))
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
 * URL di tutti i chunk sitemap per gioco, da dichiarare in robots.txt.
 * Next 16 NON espone un indice a `/cards/s/{game}/sitemap.xml` (404): sono
 * validi solo i chunk numerati `/cards/s/{game}/sitemap/{id}.xml`, quindi
 * robots deve elencarli uno per uno. La cardinalita' dei chunk e' calcolata
 * a runtime (Magic puo' averne piu' di uno).
 */
export async function listCardSitemapUrls(): Promise<string[]> {
  const perGame = await Promise.all(
    GAMES.map(async (game) => {
      const chunks = await generateGameSitemaps(game)
      return chunks.map(({ id }) => `${SITE_URL}/cards/s/${game}/sitemap/${id}.xml`)
    }),
  )
  return perGame.flat()
}

type CardRow = {
  slug: string
  updated_at: string | null
  ruling_data?: unknown
}

/**
 * Costruisce le entry della sitemap per un gioco e un chunk.
 * Pagina a `PAGE_SIZE` con ordinamento totale su `slug` (unico per gioco):
 * senza un ordine totale, `range` puo' saltare o duplicare righe.
 */
export async function buildGameSitemap(game: Game, id: number): Promise<MetadataRoute.Sitemap> {
  const supabase = adminClient()
  const from = id * SITEMAP_BATCH_SIZE
  const to = from + SITEMAP_BATCH_SIZE - 1

  const entries: MetadataRoute.Sitemap = []
  let offset = from

  while (offset <= to) {
    const upper = Math.min(offset + PAGE_SIZE - 1, to)
    const rows = await fetchPage(supabase, game, offset, upper)
    if (rows.length === 0) break

    for (const card of rows) {
      entries.push({
        url: `${SITE_URL}/cards/${game}/${card.slug}`,
        lastModified: card.updated_at ?? undefined,
        changeFrequency: 'monthly',
        priority: 0.7,
      })

      if (game === 'yugioh' && card.ruling_data !== null && card.ruling_data !== undefined) {
        entries.push({
          url: `${SITE_URL}/cards/yugioh/${card.slug}/ruling`,
          lastModified: card.updated_at ?? undefined,
          changeFrequency: 'monthly',
          priority: 0.6,
        })
      }
    }

    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return entries
}

/**
 * Legge una pagina di carte con retry. Su tabelle grandi (Magic ~146k) le
 * query con offset profondo possono incappare nello statement timeout di
 * Postgres: in quel caso `data` e' null e `error` valorizzato. NON va trattato
 * come "fine righe" (produrrebbe un chunk parziale, poi cache-ato 24h da ISR):
 * si ritenta e, se l'errore persiste, si lancia cosi' la route fallisce invece
 * di servire una sitemap monca.
 */
async function fetchPage(
  supabase: ReturnType<typeof adminClient>,
  game: Game,
  from: number,
  to: number,
  retries = 3,
): Promise<CardRow[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const query = supabase
      .from('cards')
      .select(game === 'yugioh' ? 'slug, updated_at, ruling_data' : 'slug, updated_at')
      .eq('game', game)
      .order('slug', { ascending: true })
      .range(from, to)

    const { data, error } = await query

    if (!error) {
      // Il select è scelto a runtime in base a `game`, quindi Supabase non
      // riesce a tipizzare staticamente il risultato: il cast via `unknown`
      // riflette le colonne richieste sopra (CardRow.ruling_data è opzionale).
      return (data ?? []) as unknown as CardRow[]
    }

    if (attempt === retries - 1) {
      throw new Error(
        `Sitemap ${game}: lettura righe ${from}-${to} fallita dopo ${retries} tentativi: ${error.message}`,
      )
    }

    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
  }

  return []
}

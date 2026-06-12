import type { Game } from '@/lib/tcg'

const SITE_URL = 'https://www.huntlist.eu'

/**
 * Sitemap index delle pagine carta, servito su /cards/sitemap.xml.
 *
 * Aggrega i chunk per gioco esposti da `app/cards/s/{game}/sitemap/{id}.xml`
 * (Next 16 non espone un indice nativo per quelle sitemap per-gioco). Search
 * Console scopre tutti i chunk da questo unico indice, dichiarato in robots.txt.
 *
 * I conteggi sono FISSI di proposito: l'equivalente dinamico e'
 * `listCardSitemapUrls()` in lib/cardSitemap.ts, ma qui l'indice NON deve
 * dipendere da una query al DB — un timeout su Magic (~146k righe) farebbe 500
 * l'indice e Search Console tornerebbe a fallire. Tenere allineati a
 * `SITEMAP_BATCH_SIZE` (5000) e al numero di carte per gioco:
 * chunk = ceil(carte_gioco / 5000). Aggiornare se il catalogo cresce.
 */
const GAME_CHUNKS: Record<Game, number> = {
  pokemon: 5,
  yugioh: 3,
  one_piece: 1,
  magic: 30,
}

export function GET(): Response {
  const locs: string[] = []
  for (const [game, count] of Object.entries(GAME_CHUNKS)) {
    for (let id = 0; id < count; id++) {
      locs.push(`${SITE_URL}/cards/s/${game}/sitemap/${id}.xml`)
    }
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    locs.map((loc) => `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`).join('\n') +
    '\n</sitemapindex>\n'

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}

import type { MetadataRoute } from 'next'
import { listCardSitemapUrls } from '@/lib/cardSitemap'

const SITE_URL = 'https://www.huntlist.eu'

/**
 * robots.txt nativo App Router (servito su /robots.txt). I disallow coprono
 * le route autenticate/private reali dell'app; le pagine pubbliche (feed,
 * carte, dettaglio hunt, profili) restano indicizzabili.
 *
 * Async perche' enumera i chunk delle sitemap carta per gioco (numero di
 * chunk calcolato a runtime; Magic puo' superare un chunk).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const cardSitemaps = await listCardSitemapUrls()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/onboarding',
          '/settings',
          '/offers/',
          '/hunts/new',
          '/hunts/*/edit',
          '/hunts/*/offer',
          '/api/',
          '/auth/',
          '/callback',
          '/login',
          '/signup',
          '/forgot-password',
          '/update-password',
        ],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, ...cardSitemaps],
  }
}

export const revalidate = 86400

import type { MetadataRoute } from 'next'

const SITE_URL = 'https://huntlist.eu'

/**
 * robots.txt nativo App Router (servito su /robots.txt). I disallow coprono
 * le route autenticate/private reali dell'app; le pagine pubbliche (feed,
 * carte, dettaglio hunt, profili) restano indicizzabili.
 */
export default function robots(): MetadataRoute.Robots {
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
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/carte/sitemap.xml`],
  }
}

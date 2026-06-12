import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.huntlist.eu'

/**
 * robots.txt nativo App Router (servito su /robots.txt). I disallow coprono
 * le route autenticate/private reali dell'app; le pagine pubbliche (feed,
 * carte, dettaglio hunt, profili) restano indicizzabili.
 *
 * Dichiara due sole sitemap: l'indice delle pagine statiche (/sitemap.xml) e
 * l'indice delle pagine carta (/cards/sitemap.xml), che a sua volta aggrega
 * tutti i chunk per gioco. Prima i singoli chunk erano elencati qui uno per
 * uno (con una query al DB): l'indice li sostituisce.
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
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/cards/sitemap.xml`],
  }
}

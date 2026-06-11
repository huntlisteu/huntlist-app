import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { GAMES } from '@/lib/tcg'

// Rigenerata al massimo una volta al giorno: il catalogo cambia solo con i
// sync notturni, e la query completa scorre tutte le ~34k righe.
export const revalidate = 86400

const SITE_URL = 'https://huntlist.eu'
const PAGE_SIZE = 1000

type CardRow = {
  slug: string
  updated_at: string | null
}

/**
 * Sitemap delle pagine carta, servita su /carte/sitemap.xml.
 * Usa la secret key (solo server: questo file non è mai importato dal client)
 * perché la publishable key ha rate limit più bassi; la query resta una
 * lettura di dati pubblici. Paginazione da 1000 con ordinamento totale su
 * slug per non saltare/duplicare righe tra una pagina e l'altra.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error(
      'Variabili Supabase mancanti: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY',
    )
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  })

  const entries: MetadataRoute.Sitemap = []

  for (const game of GAMES) {
    let from = 0

    for (;;) {
      const { data, error } = await supabase
        .from('cards')
        .select('slug, updated_at')
        .eq('game', game)
        .order('slug')
        .range(from, from + PAGE_SIZE - 1)

      if (error) {
        throw new Error(`Sitemap carte: query fallita per ${game}: ${error.message}`)
      }

      const rows = (data ?? []) as CardRow[]
      if (rows.length === 0) break

      for (const card of rows) {
        entries.push({
          url: `${SITE_URL}/carte/${game}/${card.slug}`,
          lastModified: card.updated_at ?? undefined,
          changeFrequency: 'monthly',
          priority: 0.7,
        })
      }

      if (rows.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }
  }

  return entries
}

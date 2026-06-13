import type { MetadataRoute } from 'next'
import { buildGameSitemap, generateGameSitemaps, resolveSitemapId } from '@/lib/cardSitemap'

const GAME = 'one_piece' as const

export async function generateSitemaps(): Promise<{ id: number }[]> {
  return generateGameSitemaps(GAME)
}

export default async function sitemap({ id }: { id: unknown }): Promise<MetadataRoute.Sitemap> {
  return buildGameSitemap(GAME, await resolveSitemapId(id))
}

export const revalidate = 86400

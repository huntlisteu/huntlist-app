import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type YGOCard = {
  id: number
  name: string
  type: string
  desc: string
  atk?: number
  def?: number
  level?: number
  card_sets?: Array<{ set_name: string; set_rarity: string }>
  card_images: Array<{ image_url: string }>
}

type YGOApiResponse = {
  data: YGOCard[]
}

type CardInsert = {
  slug: string
  game: 'yugioh'
  name: string
  image_url: string | null
  description: string | null
  set_name: string | null
  rarity: string | null
  card_type: string | null
  atk: number | null
  def: number | null
  level: number | null
  hp: null
  damage: null
  power: null
  cost: null
  external_id: string
}

const MAX_PER_RUN = 500
const API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function mapCard(card: YGOCard): CardInsert {
  return {
    slug: slugify(card.name),
    game: 'yugioh',
    name: card.name,
    image_url: card.card_images[0]?.image_url ?? null,
    description: card.desc || null,
    set_name: card.card_sets?.[0]?.set_name ?? null,
    rarity: card.card_sets?.[0]?.set_rarity ?? null,
    card_type: card.type || null,
    atk: card.atk ?? null,
    def: card.def ?? null,
    level: card.level ?? null,
    hp: null,
    damage: null,
    power: null,
    cost: null,
    external_id: String(card.id),
  }
}

async function fetchExistingIds(): Promise<Set<string>> {
  const supabase = createAdminClient()
  const existingIds = new Set<string>()
  const CHUNK = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('external_id')
      .eq('game', 'yugioh')
      .range(from, from + CHUNK - 1)

    if (error || !data || data.length === 0) break
    for (const row of data) {
      if (row.external_id) existingIds.add(row.external_id as string)
    }
    if (data.length < CHUNK) break
    from += CHUNK
  }

  return existingIds
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiResponse = await fetch(API_URL)
  if (!apiResponse.ok) {
    return Response.json(
      { error: `YGOPRODeck API error: ${apiResponse.status}` },
      { status: 502 },
    )
  }

  const json = (await apiResponse.json()) as YGOApiResponse
  const allCards = json.data
  const total = allCards.length

  const existingIds = await fetchExistingIds()

  const newCards = allCards
    .filter((c) => !existingIds.has(String(c.id)))
    .slice(0, MAX_PER_RUN)
    .map(mapCard)

  const skipped = total - allCards.filter((c) => !existingIds.has(String(c.id))).length
  const hasMore =
    allCards.filter((c) => !existingIds.has(String(c.id))).length > MAX_PER_RUN

  if (newCards.length === 0) {
    return Response.json({ inserted: 0, skipped, total, hasMore: false })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('cards').insert(newCards)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ inserted: newCards.length, skipped, total, hasMore })
}

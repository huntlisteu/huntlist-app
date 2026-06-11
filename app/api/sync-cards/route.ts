import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Types ───────────────────────────────────────────────────────────────────

type SupportedGame = 'yugioh' | 'pokemon' | 'one_piece' | 'magic'

type CardInsert = {
  slug: string
  game: SupportedGame
  name: string
  image_url: string | null
  description: string | null
  set_name: string | null
  rarity: string | null
  card_type: string | null
  archetype?: string | null
  atk: number | null
  def: number | null
  level: number | null
  hp: number | null
  damage: number | null
  power: number | null
  cost: number | null
  external_id: string
}

// ── YGOPRODeck ──────────────────────────────────────────────────────────────

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

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function mapYGOCard(card: YGOCard): CardInsert {
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

async function fetchNewYGOCards(
  existingIds: Set<string>,
  maxNew: number,
): Promise<{ cards: CardInsert[]; hasMore: boolean }> {
  const response = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes')
  if (!response.ok) {
    throw new Error(`YGOPRODeck API error: ${response.status}`)
  }
  const json = (await response.json()) as YGOApiResponse
  const allNew = json.data.filter((c) => !existingIds.has(String(c.id)))
  return {
    cards: allNew.slice(0, maxNew).map(mapYGOCard),
    hasMore: allNew.length > maxNew,
  }
}

// ── PokéTCG ─────────────────────────────────────────────────────────────────

type PokemonCard = {
  id: string
  name: string
  supertype?: string
  hp?: string
  attacks?: Array<{ damage?: string }>
  images?: { small?: string; large?: string }
  rarity?: string
  set?: { name?: string }
}

type PokemonApiResponse = {
  data: PokemonCard[]
  count: number
  totalCount: number
}

function mapPokemonCard(card: PokemonCard): CardInsert {
  const rawDamage = card.attacks?.[0]?.damage
  const parsedDamage = rawDamage ? parseInt(rawDamage, 10) : null
  const parsedHp = card.hp ? parseInt(card.hp, 10) : null

  return {
    slug: slugify(card.name),
    game: 'pokemon',
    name: card.name,
    image_url: card.images?.large ?? card.images?.small ?? null,
    description: null,
    set_name: card.set?.name ?? null,
    rarity: card.rarity ?? null,
    card_type: card.supertype ?? null,
    atk: null,
    def: null,
    level: null,
    hp: parsedHp !== null && !isNaN(parsedHp) ? parsedHp : null,
    damage: parsedDamage !== null && !isNaN(parsedDamage) ? parsedDamage : null,
    power: null,
    cost: null,
    external_id: card.id,
  }
}

async function fetchNewPokemonCards(
  existingIds: Set<string>,
  maxNew: number,
): Promise<{ cards: CardInsert[]; hasMore: boolean }> {
  const PAGE_SIZE = 250
  const newCards: CardInsert[] = []
  let page = 1
  let apiHasMore = true

  while (apiHasMore && newCards.length < maxNew) {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?pageSize=${PAGE_SIZE}&page=${page}`,
    )
    if (!response.ok) {
      throw new Error(`PokéTCG API error: ${response.status}`)
    }
    const json = (await response.json()) as PokemonApiResponse
    for (const card of json.data) {
      if (!existingIds.has(card.id) && newCards.length < maxNew) {
        newCards.push(mapPokemonCard(card))
      }
    }
    apiHasMore = json.data.length === PAGE_SIZE
    page++
    if (apiHasMore && newCards.length < maxNew) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  return {
    cards: newCards,
    hasMore: newCards.length >= maxNew,
  }
}

// ── OPTCG (One Piece) ────────────────────────────────────────────────────────

type OPTCGCard = {
  card_set_id: string
  card_name: string
  card_text: string | null
  set_id: string | null
  rarity: string | null
  card_color: string | null
  card_type: string | null
  card_power: string | null
  card_cost: string | null
  card_image: string | null
}

function mapOnePieceCard(card: OPTCGCard): CardInsert {
  const parsedPower = card.card_power ? parseInt(card.card_power, 10) : null
  const parsedCost = card.card_cost ? parseInt(card.card_cost, 10) : null

  return {
    slug: slugify(card.card_set_id),
    game: 'one_piece',
    name: card.card_name,
    image_url: card.card_image ?? null,
    description: card.card_text ?? null,
    set_name: card.set_id ?? null,
    rarity: card.rarity ?? null,
    card_type: card.card_type ?? null,
    archetype: card.card_color ?? null,
    atk: null,
    def: null,
    level: null,
    hp: null,
    damage: null,
    power: parsedPower !== null && !isNaN(parsedPower) ? parsedPower : null,
    cost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost : null,
    external_id: card.card_set_id,
  }
}

async function fetchNewOnePieceCards(
  existingIds: Set<string>,
  maxNew: number,
): Promise<{ cards: CardInsert[]; hasMore: boolean }> {
  // L'endpoint restituisce tutte le carte di tutti i set in un'unica risposta
  // (nessuna paginazione page/limit).
  const response = await fetch('https://optcgapi.com/api/allSetCards/')
  if (!response.ok) {
    throw new Error(`OPTCG API error: ${response.status}`)
  }
  const cards = (await response.json()) as OPTCGCard[]
  const allNew = cards.filter((c) => !existingIds.has(c.card_set_id))
  return {
    cards: allNew.slice(0, maxNew).map(mapOnePieceCard),
    hasMore: allNew.length > maxNew,
  }
}

// ── Scryfall (Magic: The Gathering) ─────────────────────────────────────────

type ScryfallBulkDataEntry = {
  type: string
  download_uri: string
}

type ScryfallBulkDataResponse = {
  data: ScryfallBulkDataEntry[]
}

type ScryfallCardFace = {
  oracle_text?: string
  image_uris?: { normal?: string }
}

type ScryfallCard = {
  id: string
  name: string
  lang: string
  layout: string
  digital: boolean
  finishes: string[]
  set: string
  set_name: string
  collector_number: string
  rarity: string
  type_line: string
  colors?: string[]
  power?: string
  oracle_text?: string
  image_uris?: { normal?: string }
  card_faces?: ScryfallCardFace[]
}

const MAGIC_EXCLUDED_LAYOUTS = new Set(['token', 'emblem', 'art_series'])

function isImportableMagicCard(card: ScryfallCard): boolean {
  return card.digital === false && !MAGIC_EXCLUDED_LAYOUTS.has(card.layout) && card.lang === 'en'
}

function mapMagicCard(card: ScryfallCard, finish: string): CardInsert {
  const parsedPower = card.power ? parseInt(card.power, 10) : null

  return {
    slug: slugify(`${card.name} ${card.set} ${card.collector_number} ${finish}`),
    game: 'magic',
    name: card.name,
    image_url: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null,
    description: card.oracle_text ?? card.card_faces?.[0]?.oracle_text ?? null,
    set_name: card.set_name,
    rarity: card.rarity,
    card_type: card.type_line,
    archetype: card.colors && card.colors.length > 0 ? card.colors.join('') : null,
    atk: null,
    def: null,
    level: null,
    hp: null,
    damage: null,
    power: parsedPower !== null && !isNaN(parsedPower) ? parsedPower : null,
    cost: null,
    external_id: card.id,
  }
}

async function fetchNewMagicCards(
  existingSlugs: Set<string>,
  maxNew: number,
): Promise<{ cards: CardInsert[]; hasMore: boolean }> {
  const indexResponse = await fetch('https://api.scryfall.com/bulk-data')
  if (!indexResponse.ok) {
    throw new Error(`Scryfall bulk-data API error: ${indexResponse.status}`)
  }
  const index = (await indexResponse.json()) as ScryfallBulkDataResponse
  const defaultCards = index.data.find((entry) => entry.type === 'default_cards')
  if (!defaultCards) {
    throw new Error('Voce "default_cards" non trovata nei bulk data Scryfall')
  }

  const bulkResponse = await fetch(defaultCards.download_uri)
  if (!bulkResponse.ok) {
    throw new Error(`Scryfall bulk download error: ${bulkResponse.status}`)
  }
  const cards = (await bulkResponse.json()) as ScryfallCard[]

  const newCards: CardInsert[] = []
  let hasMore = false

  for (const card of cards) {
    if (!isImportableMagicCard(card)) continue

    for (const finish of card.finishes) {
      if (newCards.length >= maxNew) {
        hasMore = true
        break
      }
      const mappedCard = mapMagicCard(card, finish)
      if (existingSlugs.has(mappedCard.slug)) continue
      newCards.push(mappedCard)
    }

    if (hasMore) break
  }

  return { cards: newCards, hasMore }
}

// ── Shared ──────────────────────────────────────────────────────────────────

async function fetchExistingSlugs(game: SupportedGame): Promise<Set<string>> {
  const supabase = createAdminClient()
  const existingSlugs = new Set<string>()
  const CHUNK = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('slug')
      .eq('game', game)
      .range(from, from + CHUNK - 1)

    if (error || !data || data.length === 0) break
    for (const row of data) {
      existingSlugs.add(row.slug as string)
    }
    if (data.length < CHUNK) break
    from += CHUNK
  }

  return existingSlugs
}

async function fetchExistingIds(game: SupportedGame): Promise<Set<string>> {
  const supabase = createAdminClient()
  const existingIds = new Set<string>()
  const CHUNK = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('external_id')
      .eq('game', game)
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

// ── Route ────────────────────────────────────────────────────────────────────

const MAX_PER_RUN = 500
const SUPPORTED_GAMES: SupportedGame[] = ['yugioh', 'pokemon', 'one_piece', 'magic']

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawGame = request.nextUrl.searchParams.get('game') ?? 'yugioh'
  if (!SUPPORTED_GAMES.includes(rawGame as SupportedGame)) {
    return Response.json({ error: `Game non supportato: ${rawGame}` }, { status: 400 })
  }
  const game = rawGame as SupportedGame

  // Per Magic le righe condividono `external_id` (uno scryfall id per carta, una
  // riga per finish): la novità si determina sullo `slug`, non sull'`external_id`.
  const existingKeys =
    game === 'magic' ? await fetchExistingSlugs(game) : await fetchExistingIds(game)

  let result: { cards: CardInsert[]; hasMore: boolean }
  try {
    switch (game) {
      case 'yugioh':
        result = await fetchNewYGOCards(existingKeys, MAX_PER_RUN)
        break
      case 'pokemon':
        result = await fetchNewPokemonCards(existingKeys, MAX_PER_RUN)
        break
      case 'one_piece':
        result = await fetchNewOnePieceCards(existingKeys, MAX_PER_RUN)
        break
      case 'magic':
        result = await fetchNewMagicCards(existingKeys, MAX_PER_RUN)
        break
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return Response.json({ error: message }, { status: 502 })
  }

  const { cards: newCards, hasMore } = result
  const skipped = existingKeys.size

  if (newCards.length === 0) {
    return Response.json({ inserted: 0, skipped, total: skipped, hasMore: false })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('cards').insert(newCards)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    inserted: newCards.length,
    skipped,
    total: skipped + newCards.length,
    hasMore,
  })
}

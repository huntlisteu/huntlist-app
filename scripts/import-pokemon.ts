import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: '.env.local' })

type PokemonCard = {
  id: string
  name: string
  number?: string
  supertype?: string
  hp?: string
  attacks?: Array<{ damage?: string }>
  images?: { small?: string; large?: string }
  rarity?: string
  set?: { name?: string }
  types?: string[]
}

type PokemonApiResponse = {
  data: PokemonCard[]
  count: number
  totalCount: number
}

type CardInsert = {
  slug: string
  game: 'pokemon'
  name: string
  image_url: string | null
  description: null
  set_name: string | null
  rarity: string | null
  archetype: string | null
  card_type: string | null
  atk: null
  def: null
  level: null
  hp: number | null
  damage: number | null
  power: null
  cost: null
  external_id: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function mapCard(card: PokemonCard): CardInsert {
  const rawDamage = card.attacks?.[0]?.damage
  const parsedDamage = rawDamage ? parseInt(rawDamage, 10) : null
  const parsedHp = card.hp ? parseInt(card.hp, 10) : null

  return {
    slug: slugify(`${card.name} ${card.set?.name ?? ''} ${card.number ?? ''}`),
    game: 'pokemon',
    name: card.name,
    image_url: card.images?.large ?? card.images?.small ?? null,
    description: null,
    set_name: card.set?.name ?? null,
    rarity: card.rarity ?? null,
    archetype: card.types?.[0] ?? null,
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

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const isLastAttempt = attempt === retries - 1

    try {
      const response = await fetch(url)

      if (response.ok || isLastAttempt || (response.status !== 500 && response.status !== 504)) {
        return response
      }

      console.error(`Tentativo ${attempt + 1}/${retries} fallito (status ${response.status}), riprovo...`)
    } catch (err) {
      if (isLastAttempt) throw err

      const message = err instanceof Error ? err.message : 'Errore sconosciuto'
      console.error(`Tentativo ${attempt + 1}/${retries} fallito (${message}), riprovo...`)
    }

    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
  }

  throw new Error('fetchWithRetry: numero massimo di tentativi raggiunto')
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    console.error('Env mancanti: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY richiesti.')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const BATCH_SIZE = 100
  const PAGE_SIZE = 250
  const BASE_URL = 'https://api.pokemontcg.io/v2/cards'

  console.log('Scaricando carte da PokéTCG...')

  const allCards: PokemonCard[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await fetchWithRetry(`${BASE_URL}?pageSize=${PAGE_SIZE}&page=${page}`)
    if (!response.ok) {
      console.error(`Errore API pagina ${page}: ${response.status} ${response.statusText}`)
      process.exit(1)
    }

    const json = (await response.json()) as PokemonApiResponse
    allCards.push(...json.data)
    hasMore = json.data.length === PAGE_SIZE

    console.log(`Pagina ${page} scaricata (${allCards.length} carte totali)...`)
    page++

    if (hasMore) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  const mapped = allCards.map(mapCard)
  const deduped = Array.from(
    mapped.reduce((map, card) => {
      if (!map.has(card.slug)) map.set(card.slug, card)
      return map
    }, new Map<string, CardInsert>()).values()
  )
  const total = deduped.length

  console.log(`\n${total} carte da importare.`)

  let imported = 0
  let errors = 0

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('cards')
      .upsert(batch, { onConflict: 'game,slug' })

    if (error) {
      console.error(`Errore batch ${i + 1}-${i + batch.length}: ${error.message}`)
      errors++
    } else {
      imported += batch.length
    }

    if ((i / BATCH_SIZE + 1) % 10 === 0 || i + BATCH_SIZE >= deduped.length) {
      console.log(`Importate ${Math.min(imported + errors * BATCH_SIZE, total)}/${total} carte...`)
    }
  }

  console.log(`\nFatto. ${imported} carte importate, ${errors} batch con errori.`)
}

main().catch(console.error)

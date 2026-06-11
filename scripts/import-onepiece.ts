import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

loadEnv({ path: '.env.local' })

type OPTCGCard = {
  card_set_id: string
  card_image_id: string
  card_name: string
  card_text: string | null
  set_id: string | null
  set_name: string | null
  rarity: string | null
  card_color: string | null
  card_type: string | null
  card_power: string | null
  card_cost: string | null
  card_image: string | null
  sub_types: string | null
}

type CardInsert = {
  slug: string
  game: 'one_piece'
  name: string
  image_url: string | null
  description: string | null
  set_name: string | null
  rarity: string | null
  card_type: string | null
  archetype: string | null
  affiliation: string | null
  atk: null
  def: null
  level: null
  hp: null
  damage: null
  power: number | null
  cost: number | null
  external_id: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function mapCard(card: OPTCGCard): CardInsert {
  const parsedPower = card.card_power ? parseInt(card.card_power, 10) : null
  const parsedCost = card.card_cost ? parseInt(card.card_cost, 10) : null

  return {
    slug: slugify(card.card_image_id),
    game: 'one_piece',
    name: card.card_name,
    image_url: card.card_image ?? null,
    description: card.card_text ?? null,
    set_name: card.set_name ?? null,
    rarity: card.rarity ?? null,
    card_type: card.card_type ?? null,
    archetype: card.card_color ?? null,
    affiliation: card.sub_types ?? null,
    atk: null,
    def: null,
    level: null,
    hp: null,
    damage: null,
    power: parsedPower !== null && !isNaN(parsedPower) ? parsedPower : null,
    cost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost : null,
    external_id: card.card_image_id,
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
  // L'endpoint restituisce tutte le carte di tutti i set in un'unica risposta
  // (nessuna paginazione page/limit, a differenza di quanto documentato altrove).
  const API_URL = 'https://optcgapi.com/api/allSetCards/'

  console.log('Scaricando carte da OPTCG API...')

  const response = await fetchWithRetry(API_URL)
  if (!response.ok) {
    console.error(`Errore API: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const cards = (await response.json()) as OPTCGCard[]
  console.log(`${cards.length} carte scaricate.`)

  const mapped: CardInsert[] = []
  for (let i = 0; i < cards.length; i++) {
    mapped.push(mapCard(cards[i]))
    if ((i + 1) % 500 === 0) {
      console.log(`Mappate ${i + 1}/${cards.length} carte...`)
    }
  }

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

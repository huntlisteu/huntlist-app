import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

loadEnv({ path: '.env.local' })

type YGOCard = {
  id: number
  name: string
  type: string
  desc: string
  atk?: number
  def?: number
  level?: number
  archetype?: string
  card_sets?: Array<{
    set_name: string
    set_code: string
    set_rarity: string
    set_rarity_code: string
  }>
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
  archetype: string | null
  atk: number | null
  def: number | null
  level: number | null
  hp: null
  damage: null
  power: null
  cost: null
  external_id: string
}

type PrintingInsert = {
  card_id: string
  set_name: string
  set_code: string
  rarity: string
  rarity_code: string
}

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
    archetype: card.archetype ?? null,
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

async function fetchCardIdMap(
  supabase: SupabaseClient,
  game: string,
): Promise<Map<string, string>> {
  const idMap = new Map<string, string>()
  const CHUNK = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('id, external_id')
      .eq('game', game)
      .range(from, from + CHUNK - 1)

    if (error || !data || data.length === 0) break
    for (const row of data) {
      if (row.external_id) idMap.set(row.external_id as string, row.id as string)
    }
    if (data.length < CHUNK) break
    from += CHUNK
  }

  return idMap
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
  const API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes'

  console.log('Scaricando carte da YGOPRODeck...')

  const response = await fetch(API_URL)
  if (!response.ok) {
    console.error(`Errore API: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const json = (await response.json()) as YGOApiResponse
  const cards = json.data
  const mapped = cards.map(mapCard)
  const total = mapped.length

  console.log(`${total} carte da importare.`)

  let imported = 0
  let errors = 0

  for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
    const batch = mapped.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('cards')
      .upsert(batch, { onConflict: 'game,slug' })

    if (error) {
      console.error(`Errore batch ${i + 1}-${i + batch.length}: ${error.message}`)
      errors++
    } else {
      imported += batch.length
    }

    if ((i / BATCH_SIZE + 1) % 10 === 0 || i + BATCH_SIZE >= mapped.length) {
      console.log(`Importate ${Math.min(imported + errors * BATCH_SIZE, total)}/${total} carte...`)
    }
  }

  console.log(`\nFatto. ${imported} carte importate, ${errors} batch con errori.`)

  // ── Fase 2: stampe (card_printings) ──────────────────────────────────────

  console.log('\nRecuperando id delle carte importate...')

  const idMap = await fetchCardIdMap(supabase, 'yugioh')

  const printings: PrintingInsert[] = []

  for (const card of cards) {
    const cardId = idMap.get(String(card.id))
    if (!cardId) continue

    for (const set of card.card_sets ?? []) {
      printings.push({
        card_id: cardId,
        set_name: set.set_name,
        set_code: set.set_code,
        rarity: set.set_rarity,
        rarity_code: set.set_rarity_code,
      })
    }
  }

  const totalPrintings = printings.length
  console.log(`${totalPrintings} stampe da importare.`)

  let importedPrintings = 0
  let printingErrors = 0

  for (let i = 0; i < printings.length; i += BATCH_SIZE) {
    const batch = printings.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('card_printings')
      .upsert(batch, { onConflict: 'card_id,set_code,rarity_code' })

    if (error) {
      console.error(`Errore batch stampe ${i + 1}-${i + batch.length}: ${error.message}`)
      printingErrors++
    } else {
      importedPrintings += batch.length
    }

    if ((i / BATCH_SIZE + 1) % 10 === 0 || i + BATCH_SIZE >= printings.length) {
      console.log(
        `Importate ${Math.min(importedPrintings + printingErrors * BATCH_SIZE, totalPrintings)}/${totalPrintings} stampe...`,
      )
    }
  }

  console.log(`\nFatto. ${importedPrintings} stampe importate, ${printingErrors} batch con errori.`)
}

main().catch(console.error)

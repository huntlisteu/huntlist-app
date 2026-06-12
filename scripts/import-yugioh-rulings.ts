import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

loadEnv({ path: '.env.local' })

type RulingLang = 'en' | 'it' | 'de' | 'fr' | 'es' | 'pt'
type AllLang = RulingLang | 'ja' | 'ko' | 'cn' | 'ae'

const RULING_LANGS: RulingLang[] = ['en', 'it', 'de', 'fr', 'es', 'pt']
const CONCURRENCY = 30
const BATCH_DELAY_MS = 50

type RulingEntry = Partial<Record<RulingLang, string>>
type RulingSection = RulingEntry[]
type RulingData = Record<string, RulingSection>

type EffectData = Partial<Record<RulingLang, string>>

type YGOResourcesResponse = {
  cardData?: Partial<Record<AllLang, { effectText?: string }>>
  faqData?: {
    entries?: Record<string, Array<Partial<Record<AllLang, string>>>>
  }
}

type CardRow = {
  external_id: string
  konami_id: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Sostituisce i placeholder <<konami_id>> usati da YGOResources per i
// riferimenti ad altre carte con il nome della carta corrispondente.
function resolveCardRefs(text: string, konamiMap: Map<number, string>): string {
  return text.replace(/<<(\d+)>>/g, (_, id) => {
    return konamiMap.get(Number(id)) ?? `[Carta #${id}]`
  })
}

// Tiene solo le lingue europee (en/it/de/fr/es/pt), scartando ja/ko/cn/ae.
function extractRulingData(
  response: YGOResourcesResponse,
  konamiMap: Map<number, string>,
): RulingData | null {
  const entries = response.faqData?.entries
  if (!entries) return null

  const result: RulingData = {}
  for (const [effectKey, section] of Object.entries(entries)) {
    const filteredSection: RulingSection = section.map((entry) => {
      const filtered: RulingEntry = {}
      for (const lang of RULING_LANGS) {
        const value = entry[lang]
        if (value !== undefined) filtered[lang] = resolveCardRefs(value, konamiMap)
      }
      return filtered
    })
    result[effectKey] = filteredSection
  }

  return Object.keys(result).length > 0 ? result : null
}

// Tiene solo il testo effetto delle lingue europee (en/it/de/fr/es/pt).
function extractEffectData(response: YGOResourcesResponse): EffectData | null {
  const cardData = response.cardData
  if (!cardData) return null

  const result: EffectData = {}
  for (const lang of RULING_LANGS) {
    const text = cardData[lang]?.effectText
    if (text !== undefined) result[lang] = text
  }

  return Object.keys(result).length > 0 ? result : null
}

type ProcessResult = {
  updated: boolean
  hasRuling: boolean
  hasEffect: boolean
  error: boolean
}

async function processCard(
  supabase: SupabaseClient,
  card: CardRow,
  konamiMap: Map<number, string>,
): Promise<ProcessResult> {
  let rulingData: RulingData | null = null
  let effectData: EffectData | null = null
  let error = false

  try {
    const response = await fetch(`https://db.ygoresources.com/data/card/${card.konami_id}`)
    if (response.ok) {
      const json = (await response.json()) as YGOResourcesResponse
      rulingData = extractRulingData(json, konamiMap)
      effectData = extractEffectData(json)
    } else if (response.status !== 404) {
      console.error(
        `Errore API per konami_id ${card.konami_id}: ${response.status} ${response.statusText}`,
      )
      error = true
    }
  } catch (err) {
    console.error(`Errore fetch per konami_id ${card.konami_id}: ${(err as Error).message}`)
    error = true
  }

  const { error: updateError } = await supabase
    .from('cards')
    .update({ ruling_data: rulingData, effect_data: effectData })
    .eq('game', 'yugioh')
    .eq('external_id', card.external_id)

  if (updateError) {
    console.error(`Errore update per external_id ${card.external_id}: ${updateError.message}`)
    error = true
  }

  return { updated: !updateError, hasRuling: rulingData !== null, hasEffect: effectData !== null, error }
}

async function fetchKonamiIdToNameMap(supabase: SupabaseClient): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  const CHUNK = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('konami_id, name')
      .eq('game', 'yugioh')
      .not('konami_id', 'is', null)
      .range(from, from + CHUNK - 1)

    if (error || !data || data.length === 0) break
    for (const row of data) {
      if (row.konami_id) map.set(row.konami_id as number, row.name as string)
    }
    if (data.length < CHUNK) break
    from += CHUNK
  }

  return map
}

async function fetchCardsWithKonamiId(supabase: SupabaseClient): Promise<CardRow[]> {
  const rows: CardRow[] = []
  const CHUNK = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('cards')
      .select('external_id, konami_id')
      .eq('game', 'yugioh')
      .not('konami_id', 'is', null)
      .range(from, from + CHUNK - 1)

    if (error) {
      console.error(`Errore lettura carte: ${error.message}`)
      break
    }
    if (!data || data.length === 0) break

    for (const row of data) {
      if (row.external_id && row.konami_id != null) {
        rows.push({
          external_id: row.external_id as string,
          konami_id: row.konami_id as number,
        })
      }
    }

    if (data.length < CHUNK) break
    from += CHUNK
  }

  return rows
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

  console.log('Recuperando carte Yu-Gi-Oh! con konami_id...')
  const cards = await fetchCardsWithKonamiId(supabase)
  console.log(`${cards.length} carte da processare.`)

  console.log('Costruendo mappa konami_id -> nome carta...')
  const konamiMap = await fetchKonamiIdToNameMap(supabase)
  console.log(`${konamiMap.size} carte in mappa.`)

  let processed = 0
  let updated = 0
  let withRulings = 0
  let withEffects = 0
  let errors = 0

  for (let i = 0; i < cards.length; i += CONCURRENCY) {
    const batch = cards.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map((card) => processCard(supabase, card, konamiMap)))

    for (const result of results) {
      processed++
      if (result.updated) updated++
      if (result.hasRuling) withRulings++
      if (result.hasEffect) withEffects++
      if (result.error) errors++
    }

    if (processed % 300 === 0 || processed >= cards.length) {
      console.log(
        `Processate ${processed}/${cards.length} carte (${withRulings} con ruling, ${withEffects} con effect, ${errors} errori)...`,
      )
    }

    await sleep(BATCH_DELAY_MS)
  }

  console.log(
    `\nFatto. ${updated}/${cards.length} carte aggiornate, ${withRulings} con ruling_data, ${withEffects} con effect_data, ${errors} errori.`,
  )
}

main().catch(console.error)

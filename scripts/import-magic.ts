#!/usr/bin/env node --max-old-space-size=4096
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import streamArray from 'stream-json/streamers/stream-array.js'

loadEnv({ path: '.env.local' })

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

type CardInsert = {
  slug: string
  game: 'magic'
  name: string
  image_url: string | null
  description: string | null
  set_name: string
  rarity: string
  card_type: string
  archetype: string | null
  atk: null
  def: null
  level: null
  hp: null
  damage: null
  power: number | null
  cost: null
  external_id: string
}

const EXCLUDED_LAYOUTS = new Set(['token', 'emblem', 'art_series'])

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function isImportableCard(card: ScryfallCard): boolean {
  return (
    card.digital === false &&
    !EXCLUDED_LAYOUTS.has(card.layout) &&
    card.lang === 'en'
  )
}

function mapCard(card: ScryfallCard, finish: string): CardInsert {
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

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const isLastAttempt = attempt === retries - 1

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Huntlist/1.0 (huntlist.eu)',
          'Accept': 'application/json',
        },
      })

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

  console.log('Recuperando indice bulk data da Scryfall...')

  const indexResponse = await fetchWithRetry('https://api.scryfall.com/bulk-data')
  if (!indexResponse.ok) {
    console.error(`Errore API bulk-data: ${indexResponse.status} ${indexResponse.statusText}`)
    process.exit(1)
  }

  const index = (await indexResponse.json()) as ScryfallBulkDataResponse
  const defaultCards = index.data.find((entry) => entry.type === 'default_cards')
  if (!defaultCards) {
    console.error('Voce "default_cards" non trovata nei bulk data Scryfall.')
    process.exit(1)
  }

  console.log(`Scaricando default_cards da ${defaultCards.download_uri}...`)

  const bulkResponse = await fetchWithRetry(defaultCards.download_uri)
  if (!bulkResponse.ok || !bulkResponse.body) {
    console.error(`Errore download bulk data: ${bulkResponse.status} ${bulkResponse.statusText}`)
    process.exit(1)
  }

  // Il file bulk di Scryfall e' troppo grande (~545MB) per essere caricato
  // interamente in memoria con response.json() (ERR_STRING_TOO_LONG): viene
  // salvato su disco e poi processato in streaming, una carta alla volta.
  const tmpDir = await mkdtemp(join(tmpdir(), 'huntlist-magic-'))
  const bulkFilePath = join(tmpDir, 'default-cards.json')

  await pipeline(
    Readable.fromWeb(bulkResponse.body as unknown as NodeReadableStream<Uint8Array>),
    createWriteStream(bulkFilePath),
  )
  console.log('Download completato. Parsing in streaming...')

  const mapped: CardInsert[] = []
  let processed = 0

  await new Promise<void>((resolve, reject) => {
    const jsonStream = createReadStream(bulkFilePath).pipe(streamArray.withParserAsStream())

    jsonStream.on('data', ({ value }: { value: unknown }) => {
      const card = value as ScryfallCard
      if (isImportableCard(card)) {
        for (const finish of card.finishes) {
          mapped.push(mapCard(card, finish))
        }
      }
      processed++
      if (processed % 1000 === 0) {
        console.log(`Processate ${processed} carte (${mapped.length} righe finora)...`)
      }
    })
    jsonStream.on('end', () => resolve())
    jsonStream.on('error', reject)
  })

  await rm(tmpDir, { recursive: true, force: true })

  console.log(`${processed} carte processate da Scryfall.`)

  const deduped = Array.from(
    mapped.reduce((map, card) => {
      if (!map.has(card.slug)) map.set(card.slug, card)
      return map
    }, new Map<string, CardInsert>()).values()
  )
  const total = deduped.length

  console.log(`\n${total} righe da importare.`)

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
      console.log(`Importate ${Math.min(imported + errors * BATCH_SIZE, total)}/${total} righe...`)
    }
  }

  console.log(`\nFatto. ${imported} righe importate, ${errors} batch con errori.`)
}

main().catch(console.error)

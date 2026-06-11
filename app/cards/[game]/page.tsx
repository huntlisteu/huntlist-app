import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GAMES, type Game } from '@/lib/tcg'
import { CarteClient, type CarteFiltri } from './CarteClient'

const GAME_LABEL: Record<Game, string> = {
  yugioh: 'Yu-Gi-Oh!',
  pokemon: 'Pokémon TCG',
  one_piece: 'One Piece TCG',
}

type Props = {
  params: Promise<{ game: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params
  if (!GAMES.includes(game as Game)) return {}
  const typedGame = game as Game
  return {
    title: `Carte ${GAME_LABEL[typedGame]} | Huntlist`,
    description: `Esplora le carte ${GAME_LABEL[typedGame]} su Huntlist: cerca per nome, filtra per set e rarita, trova venditori o pubblica la tua Hunt.`,
  }
}

type FilterField = 'archetype' | 'card_type' | 'set_name'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

// PostgREST non espone SELECT DISTINCT e tronca ogni risposta a 1000 righe:
// si scarica la colonna a chunk paralleli e si deduplica lato JS. La cache in
// memoria evita di rifarlo a ogni richiesta (i valori cambiano solo al sync).
const CHUNK_SIZE = 1000
const MAX_ROWS = 30000
const CACHE_TTL_MS = 60 * 60 * 1000

const distinctCache = new Map<string, { values: string[]; expires: number }>()

async function fetchDistinct(
  supabase: ServerSupabase,
  game: Game,
  field: FilterField,
): Promise<string[]> {
  const cacheKey = `${game}:${field}`
  const cached = distinctCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.values

  const { count } = await supabase
    .from('cards')
    .select(field, { count: 'exact', head: true })
    .eq('game', game)
    .not(field, 'is', null)

  const total = Math.min(count ?? 0, MAX_ROWS)
  const chunkCount = Math.ceil(total / CHUNK_SIZE)

  const chunks = await Promise.all(
    Array.from({ length: chunkCount }, (_, i) =>
      supabase
        .from('cards')
        .select(field)
        .eq('game', game)
        .not(field, 'is', null)
        .order(field)
        .range(i * CHUNK_SIZE, i * CHUNK_SIZE + CHUNK_SIZE - 1),
    ),
  )

  const unique = new Set<string>()
  for (const { data } of chunks) {
    const rows = (data ?? []) as unknown as Record<FilterField, string | null>[]
    for (const row of rows) {
      const value = row[field]
      if (value) unique.add(value)
    }
  }

  const values = [...unique]
  distinctCache.set(cacheKey, { values, expires: Date.now() + CACHE_TTL_MS })
  return values
}

export default async function CarteGamePage({ params }: Props) {
  const { game } = await params

  if (!GAMES.includes(game as Game)) notFound()
  const typedGame = game as Game

  const supabase = await createClient()
  const [archetipi, tipi, sets] = await Promise.all([
    fetchDistinct(supabase, typedGame, 'archetype'),
    fetchDistinct(supabase, typedGame, 'card_type'),
    fetchDistinct(supabase, typedGame, 'set_name'),
  ])

  const filtri: CarteFiltri = { archetipi, tipi, sets }

  return (
    <main className="container py-8 md:py-12">
      <nav
        className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
        aria-label="Breadcrumb"
      >
        <Link href="/cards" className="hover:text-foreground transition-colors">
          Carte
        </Link>
        <span aria-hidden="true">→</span>
        <span className="text-foreground font-medium">{GAME_LABEL[typedGame]}</span>
      </nav>

      <div className="mb-8 space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Catalogo carte
        </p>
        <h1 className="font-heading font-black text-3xl md:text-4xl text-foreground">
          {GAME_LABEL[typedGame]}
        </h1>
      </div>

      <CarteClient game={typedGame} filtri={filtri} />
    </main>
  )
}

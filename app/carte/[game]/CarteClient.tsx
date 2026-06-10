'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/tcg'

export type CarteFiltri = {
  archetipi: string[]
  tipi: string[]
  sets: string[]
}

type CardResult = {
  id: string
  slug: string
  name: string
  image_url: string | null
  rarity: string | null
  card_type: string | null
  archetype: string | null
}

type CarteClientProps = {
  game: Game
  filtri: CarteFiltri
}

const PAGE_SIZE = 48

const FILTER_LABELS: Record<Game, { archetipo: string; tipo: string; set: string }> = {
  yugioh: { archetipo: 'Archetipo', tipo: 'Tipo carta', set: 'Set' },
  pokemon: { archetipo: 'Tipo elemento', tipo: 'Categoria', set: 'Set' },
  one_piece: { archetipo: 'Colore', tipo: 'Tipo carta', set: 'Set' },
}

function truncateChip(value: string): string {
  return value.length > 20 ? `${value.slice(0, 20)}…` : value
}

function ChipSection({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string
  values: string[]
  selected: string | null
  onToggle: (value: string) => void
}) {
  if (values.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible">
        {values.map((value) => {
          const isSelected = selected === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={isSelected}
              title={value}
              className={[
                'shrink-0 whitespace-nowrap rounded-[4px] border-2 px-3 py-1 font-sans text-xs font-medium transition-colors',
                isSelected
                  ? 'border-[#1A1A18] dark:border-[#1A1A18] bg-[#6DBE00] dark:bg-[#9ADE00] text-[#1A1A18]'
                  : 'border-[#1A1A18] dark:border-[#3A3D38] bg-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {truncateChip(value)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card overflow-hidden shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38]">
      <div className="w-full aspect-[5/7] bg-muted animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 rounded-sm bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded-sm bg-muted animate-pulse" />
      </div>
    </div>
  )
}

export function CarteClient({ game, filtri }: CarteClientProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filtroArchetipo, setFiltroArchetipo] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [filtroSet, setFiltroSet] = useState<string | null>(null)
  const [results, setResults] = useState<CardResult[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const labels = FILTER_LABELS[game]

  // Debounce 300ms sulla query; al cambio si riparte da pagina 0.
  useEffect(() => {
    if (query === debouncedQuery) return
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setPagina(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, debouncedQuery])

  useEffect(() => {
    const controller = new AbortController()
    const supabase = createClient()
    setLoading(true)

    // Tiebreaker su id: tanti nomi sono duplicati (stessa carta in set diversi)
    // e senza un ordinamento totale le pagine successive ripescano le stesse righe.
    let q = supabase
      .from('cards')
      .select('id, slug, name, image_url, rarity, card_type, archetype')
      .eq('game', game)
      .order('name')
      .order('id')
      .range(pagina * PAGE_SIZE, pagina * PAGE_SIZE + PAGE_SIZE - 1)

    if (debouncedQuery.length >= 2) q = q.ilike('name', `%${debouncedQuery}%`)
    if (filtroArchetipo) q = q.eq('archetype', filtroArchetipo)
    if (filtroTipo) q = q.eq('card_type', filtroTipo)
    if (filtroSet) q = q.eq('set_name', filtroSet)

    void q.abortSignal(controller.signal).then(({ data, error }) => {
      if (controller.signal.aborted) return
      if (error) {
        setLoading(false)
        return
      }
      const rows = (data ?? []) as CardResult[]
      setResults((prev) => (pagina === 0 ? rows : [...prev, ...rows]))
      setHasMore(rows.length === PAGE_SIZE)
      setLoading(false)
    })

    return () => controller.abort()
  }, [game, debouncedQuery, filtroArchetipo, filtroTipo, filtroSet, pagina])

  function toggleFiltro(
    setter: (value: string | null) => void,
    current: string | null,
    value: string,
  ) {
    setter(current === value ? null : value)
    setPagina(0)
  }

  const showSkeleton = loading && pagina === 0

  return (
    <div className="space-y-6">
      {/* Barra di ricerca */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca una carta..."
        aria-label="Cerca una carta"
        className="w-full rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card px-4 py-3 font-sans text-sm text-foreground placeholder:text-muted-foreground shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6DBE00] dark:focus-visible:ring-[#9ADE00]"
      />

      {/* Filtri a chip */}
      <div className="space-y-4">
        <ChipSection
          label={labels.archetipo}
          values={filtri.archetipi}
          selected={filtroArchetipo}
          onToggle={(value) => toggleFiltro(setFiltroArchetipo, filtroArchetipo, value)}
        />
        <ChipSection
          label={labels.tipo}
          values={filtri.tipi}
          selected={filtroTipo}
          onToggle={(value) => toggleFiltro(setFiltroTipo, filtroTipo, value)}
        />
        <ChipSection
          label={labels.set}
          values={filtri.sets}
          selected={filtroSet}
          onToggle={(value) => toggleFiltro(setFiltroSet, filtroSet, value)}
        />
      </div>

      {/* Risultati */}
      {showSkeleton ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-20 text-center rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card">
          <p className="text-muted-foreground">Nessuna carta trovata</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.map((card) => (
              <Link
                key={card.id}
                href={`/carte/${game}/${card.slug}`}
                className="group rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card overflow-hidden shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1A1A18] dark:hover:shadow-[2px_2px_0_#3A3D38] transition-all duration-100"
              >
                {card.image_url ? (
                  <div className="relative w-full aspect-[5/7]">
                    <Image
                      src={card.image_url}
                      alt={card.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[5/7] bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs text-center px-3">
                      Nessuna immagine
                    </span>
                  </div>
                )}
                <div className="p-3 space-y-1">
                  <p className="font-medium text-sm leading-tight text-foreground line-clamp-2">
                    {card.name}
                  </p>
                  {card.rarity && (
                    <p className="text-xs text-muted-foreground">{card.rarity}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setPagina((p) => p + 1)}
                disabled={loading}
                className="inline-flex items-center justify-center h-10 px-6 rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card font-sans text-sm font-medium text-foreground shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1A1A18] dark:hover:shadow-[2px_2px_0_#3A3D38] transition-all duration-100 disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? 'Caricamento…' : 'Carica altre'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

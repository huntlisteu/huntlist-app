'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Game } from '@/lib/tcg'

type FilterField = 'archetype' | 'card_type'

// Un'opzione di chip: `label` è ciò che si vede, `value` ciò che finisce nella
// query, `match` decide se filtrare per uguaglianza esatta o `ilike`.
type ChipOption = {
  label: string
  value: string
  match: 'eq' | 'ilike'
}

type GameFilterConfig = {
  attributeLabel: string
  attributeField: FilterField
  attributeOptions: ChipOption[]
  attributeAutocomplete: boolean
  typeLabel: string
  typeField: FilterField
  typeOptions: ChipOption[]
  typeAutocomplete: boolean
}

// Filtro attivo applicato alla query della griglia.
type ActiveFilter = {
  field: FilterField
  value: string
  match: 'eq' | 'ilike'
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
}

const PAGE_SIZE = 48

function eqOptions(values: string[]): ChipOption[] {
  return values.map((value) => ({ label: value, value, match: 'eq' }))
}

function ilikeOptions(values: string[]): ChipOption[] {
  return values.map((value) => ({ label: value, value, match: 'ilike' }))
}

// Per Yu-Gi-Oh! i tipi carta nel DB sono compositi (es. "Effect Monster",
// "Normal Monster", "Continuous Spell Card"): ogni chip filtra per `ilike` su
// una parola chiave, con label italiana separata dal valore di ricerca.
const YGO_TYPE_OPTIONS: ChipOption[] = [
  { label: 'Mostro', value: 'Monster', match: 'ilike' },
  { label: 'Spell', value: 'Spell', match: 'ilike' },
  { label: 'Trappola', value: 'Trap', match: 'ilike' },
  { label: 'Fusion', value: 'Fusion', match: 'ilike' },
  { label: 'Synchro', value: 'Synchro', match: 'ilike' },
  { label: 'XYZ', value: 'XYZ', match: 'ilike' },
  { label: 'Link', value: 'Link', match: 'ilike' },
  { label: 'Rituale', value: 'Ritual', match: 'ilike' },
  { label: 'Pendulum', value: 'Pendulum', match: 'ilike' },
  { label: 'Tuner', value: 'Tuner', match: 'ilike' },
]

// Per Magic il `card_type` nel DB è la type line completa (es. "Artifact
// Creature — Golem", "Legendary Creature — Human Wizard"): ogni chip filtra
// per `ilike` su uno degli 8 macrotipi, con label italiana separata dal
// valore di ricerca.
const MAGIC_CARD_TYPES: ChipOption[] = [
  { label: 'Creatura', value: 'Creature', match: 'ilike' },
  { label: 'Istantaneo', value: 'Instant', match: 'ilike' },
  { label: 'Stregoneria', value: 'Sorcery', match: 'ilike' },
  { label: 'Incantesimo', value: 'Enchantment', match: 'ilike' },
  { label: 'Artefatto', value: 'Artifact', match: 'ilike' },
  { label: 'Terra', value: 'Land', match: 'ilike' },
  { label: 'Planeswalker', value: 'Planeswalker', match: 'ilike' },
  { label: 'Battaglia', value: 'Battle', match: 'ilike' },
]

const GAME_FILTERS: Record<Game, GameFilterConfig> = {
  yugioh: {
    attributeLabel: 'Archetipo',
    attributeField: 'archetype',
    attributeOptions: [],
    attributeAutocomplete: true,
    typeLabel: 'Tipo carta',
    typeField: 'card_type',
    typeOptions: YGO_TYPE_OPTIONS,
    typeAutocomplete: false,
  },
  pokemon: {
    attributeLabel: 'Tipo elemento',
    attributeField: 'archetype',
    attributeOptions: eqOptions([
      'Colorless',
      'Darkness',
      'Dragon',
      'Fairy',
      'Fighting',
      'Fire',
      'Grass',
      'Lightning',
      'Metal',
      'Psychic',
      'Water',
    ]),
    attributeAutocomplete: false,
    typeLabel: 'Tipo carta',
    typeField: 'card_type',
    typeOptions: eqOptions(['Pokémon', 'Trainer', 'Energy']),
    typeAutocomplete: false,
  },
  one_piece: {
    attributeLabel: 'Colore',
    attributeField: 'archetype',
    // I colori One Piece nel DB possono essere combinati ("Blue Black"): `ilike`
    // così il chip "Blue" cattura anche le carte bicolore.
    attributeOptions: ilikeOptions(['Black', 'Blue', 'Green', 'Purple', 'Red', 'Yellow']),
    attributeAutocomplete: false,
    typeLabel: 'Tipo carta',
    typeField: 'card_type',
    typeOptions: eqOptions(['Character', 'Event', 'Leader', 'Stage']),
    typeAutocomplete: false,
  },
  magic: {
    attributeLabel: 'Colore',
    attributeField: 'archetype',
    attributeOptions: ilikeOptions(['W', 'U', 'B', 'R', 'G', 'Multicolor', 'Colorless']),
    attributeAutocomplete: false,
    typeLabel: 'Tipo carta',
    typeField: 'card_type',
    typeOptions: MAGIC_CARD_TYPES,
    typeAutocomplete: false,
  },
}

function truncateChip(value: string): string {
  return value.length > 20 ? `${value.slice(0, 20)}…` : value
}

function ChipSection({
  label,
  options,
  selectedValue,
  onToggle,
}: {
  label: string
  options: ChipOption[]
  selectedValue: string | null
  onToggle: (option: ChipOption) => void
}) {
  if (options.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible">
        {options.map((option) => {
          const isSelected = selectedValue === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={isSelected}
              title={option.label}
              className={[
                'shrink-0 whitespace-nowrap rounded-[4px] border-2 px-3 py-1 font-sans text-xs font-medium transition-colors',
                isSelected
                  ? 'border-[#1A1A18] dark:border-[#1A1A18] bg-[#6DBE00] dark:bg-[#9ADE00] text-[#1A1A18]'
                  : 'border-[#1A1A18] dark:border-[#3A3D38] bg-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {truncateChip(option.label)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AutocompleteFilter({
  game,
  field,
  label,
  placeholder,
  selected,
  onSelect,
  onClear,
}: {
  game: Game
  field: FilterField
  label: string
  placeholder: string
  selected: string | null
  onSelect: (value: string) => void
  onClear: () => void
}) {
  const [input, setInput] = useState('')
  const [debounced, setDebounced] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  // Debounce 300ms sull'input dell'autocomplete.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  useEffect(() => {
    if (debounced.length < 2) {
      setOptions([])
      return
    }

    const controller = new AbortController()
    const supabase = createClient()

    void supabase
      .from('cards')
      .select(field)
      .eq('game', game)
      .ilike(field, `%${debounced}%`)
      .not(field, 'is', null)
      .limit(8)
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted || error) return
        const rows = (data ?? []) as unknown as Record<FilterField, string | null>[]
        const unique = new Set<string>()
        for (const row of rows) {
          const value = row[field]
          if (value) unique.add(value)
        }
        setOptions([...unique].slice(0, 8))
        setOpen(true)
      })

    return () => controller.abort()
  }, [game, field, debounced])

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>

      {selected ? (
        <button
          type="button"
          onClick={onClear}
          aria-pressed="true"
          title={selected}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border-2 border-[#1A1A18] bg-[#6DBE00] px-3 py-1 font-sans text-xs font-medium text-[#1A1A18] transition-colors dark:bg-[#9ADE00]"
        >
          {truncateChip(selected)}
          <span aria-hidden="true">×</span>
        </button>
      ) : (
        <div className="relative max-w-xs">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              if (options.length > 0) setOpen(true)
            }}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-[4px] border-2 border-[#1A1A18] bg-[#F2EDE3] px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground shadow-[2px_2px_0_#1A1A18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6DBE00] dark:border-[#3A3D38] dark:bg-[#1A1C19] dark:shadow-[2px_2px_0_#3A3D38] dark:focus-visible:ring-[#9ADE00]"
          />
          {open && options.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-[4px] border-2 border-[#1A1A18] bg-[#F2EDE3] shadow-[2px_2px_0_#1A1A18] dark:border-[#3A3D38] dark:bg-[#1A1C19] dark:shadow-[2px_2px_0_#3A3D38]">
              {options.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(option)
                      setInput('')
                      setOpen(false)
                    }}
                    className="block w-full px-3 py-2 text-left font-sans text-sm text-foreground transition-colors hover:bg-[#6DBE00] hover:text-[#1A1A18] dark:hover:bg-[#9ADE00]"
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
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

export function CarteClient({ game }: CarteClientProps) {
  const config = GAME_FILTERS[game]

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [attributeFilter, setAttributeFilter] = useState<ActiveFilter | null>(null)
  const [typeFilter, setTypeFilter] = useState<ActiveFilter | null>(null)
  const [results, setResults] = useState<CardResult[]>([])
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(0)
  const [hasMore, setHasMore] = useState(false)

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
    if (attributeFilter) {
      q =
        attributeFilter.match === 'ilike'
          ? q.ilike(attributeFilter.field, `%${attributeFilter.value}%`)
          : q.eq(attributeFilter.field, attributeFilter.value)
    }
    if (typeFilter) {
      q =
        typeFilter.match === 'ilike'
          ? q.ilike(typeFilter.field, `%${typeFilter.value}%`)
          : q.eq(typeFilter.field, typeFilter.value)
    }

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
  }, [game, debouncedQuery, attributeFilter, typeFilter, pagina])

  function toggleAttribute(option: ChipOption) {
    setAttributeFilter((current) =>
      current && current.value === option.value
        ? null
        : { field: config.attributeField, value: option.value, match: option.match },
    )
    setPagina(0)
  }

  function toggleType(option: ChipOption) {
    setTypeFilter((current) =>
      current && current.value === option.value
        ? null
        : { field: config.typeField, value: option.value, match: option.match },
    )
    setPagina(0)
  }

  function selectAttribute(value: string) {
    setAttributeFilter({ field: config.attributeField, value, match: 'eq' })
    setPagina(0)
  }

  function selectType(value: string) {
    setTypeFilter({ field: config.typeField, value, match: 'eq' })
    setPagina(0)
  }

  function clearAttribute() {
    setAttributeFilter(null)
    setPagina(0)
  }

  function clearType() {
    setTypeFilter(null)
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

      {/* Filtri */}
      <div className="space-y-4">
        {config.attributeAutocomplete ? (
          <AutocompleteFilter
            game={game}
            field={config.attributeField}
            label={config.attributeLabel}
            placeholder={`Cerca ${config.attributeLabel.toLowerCase()}...`}
            selected={attributeFilter?.value ?? null}
            onSelect={selectAttribute}
            onClear={clearAttribute}
          />
        ) : (
          <ChipSection
            label={config.attributeLabel}
            options={config.attributeOptions}
            selectedValue={attributeFilter?.value ?? null}
            onToggle={toggleAttribute}
          />
        )}

        {config.typeAutocomplete ? (
          <AutocompleteFilter
            game={game}
            field={config.typeField}
            label={config.typeLabel}
            placeholder={`Cerca ${config.typeLabel.toLowerCase()}...`}
            selected={typeFilter?.value ?? null}
            onSelect={selectType}
            onClear={clearType}
          />
        ) : (
          <ChipSection
            label={config.typeLabel}
            options={config.typeOptions}
            selectedValue={typeFilter?.value ?? null}
            onToggle={toggleType}
          />
        )}
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
                href={`/cards/${game}/${card.slug}`}
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

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { GAMES, type Game } from '@/lib/tcg'
import { Button } from '@/components/ui/button'
import { CardClient } from './CardClient'

type EffectData = {
  en?: string
  it?: string
  de?: string
  fr?: string
  es?: string
  pt?: string
}

type Card = {
  id: string
  game: Game
  slug: string
  name: string
  image_url: string | null
  description: string | null
  rarity: string | null
  views: number
  set_name: string | null
  card_type: string | null
  archetype: string | null
  affiliation: string | null
  atk: number | null
  def: number | null
  level: number | null
  hp: number | null
  damage: string | null
  power: number | null
  cost: number | null
  effect_data: EffectData | null
}

type Printing = {
  set_name: string | null
  set_number: string | null
  rarity: string | null
}

type RelatedCard = {
  id: string
  game: Game
  slug: string
  name: string
  image_url: string | null
  rarity: string | null
}

const GAME_LABEL: Record<Game, string> = {
  yugioh: 'Yu-Gi-Oh!',
  pokemon: 'Pokémon TCG',
  one_piece: 'One Piece TCG',
  magic: 'Magic: The Gathering',
}

type Props = {
  params: Promise<{ game: string; slug: string }>
}

async function getCard(game: Game, slug: string): Promise<Card | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cards')
    .select('*')
    .eq('game', game)
    .eq('slug', slug)
    .single()
  return (data as Card) ?? null
}

async function getPrintings(cardId: string): Promise<Printing[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('card_printings')
    .select('set_name, set_number, rarity')
    .eq('card_id', cardId)
    .order('set_name', { ascending: true })
    .order('set_number', { ascending: true })
  return (data as Printing[]) ?? []
}

async function getRelatedCards(card: Card): Promise<RelatedCard[]> {
  const supabase = await createClient()
  const columns = 'id, game, slug, name, image_url, rarity'

  if (card.game === 'yugioh') {
    if (card.archetype) {
      const { data } = await supabase
        .from('cards')
        .select(columns)
        .eq('game', 'yugioh')
        .eq('archetype', card.archetype)
        .neq('id', card.id)
        .limit(6)
      return (data as RelatedCard[]) ?? []
    }
    if (card.card_type) {
      const { data } = await supabase
        .from('cards')
        .select(columns)
        .eq('game', 'yugioh')
        .eq('card_type', card.card_type)
        .neq('id', card.id)
        .limit(6)
      return (data as RelatedCard[]) ?? []
    }
    return []
  }

  if (card.game === 'pokemon') {
    const { data } = await supabase
      .from('cards')
      .select(columns)
      .eq('game', 'pokemon')
      .eq('name', card.name)
      .neq('id', card.id)
      .limit(6)
    return (data as RelatedCard[]) ?? []
  }

  if (card.game === 'magic') {
    if (card.set_name && card.archetype) {
      const { data } = await supabase
        .from('cards')
        .select(columns)
        .eq('game', 'magic')
        .eq('set_name', card.set_name)
        .eq('archetype', card.archetype)
        .neq('id', card.id)
        .limit(6)
      return (data as RelatedCard[]) ?? []
    }
    if (card.set_name) {
      const { data } = await supabase
        .from('cards')
        .select(columns)
        .eq('game', 'magic')
        .eq('set_name', card.set_name)
        .neq('id', card.id)
        .limit(6)
      return (data as RelatedCard[]) ?? []
    }
    return []
  }

  // one_piece
  if (card.archetype && card.affiliation) {
    const { data } = await supabase
      .from('cards')
      .select(columns)
      .eq('game', 'one_piece')
      .eq('archetype', card.archetype)
      .eq('affiliation', card.affiliation)
      .neq('id', card.id)
      .limit(6)
    return (data as RelatedCard[]) ?? []
  }
  if (card.archetype) {
    const { data } = await supabase
      .from('cards')
      .select(columns)
      .eq('game', 'one_piece')
      .eq('archetype', card.archetype)
      .neq('id', card.id)
      .limit(6)
    return (data as RelatedCard[]) ?? []
  }
  if (card.card_type) {
    const { data } = await supabase
      .from('cards')
      .select(columns)
      .eq('game', 'one_piece')
      .eq('card_type', card.card_type)
      .neq('id', card.id)
      .limit(6)
    return (data as RelatedCard[]) ?? []
  }
  return []
}

async function getActiveHuntsCount(cardName: string, game: Game): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('hunt_cards')
    .select('hunts!inner(id)', { count: 'exact', head: true })
    .eq('name', cardName)
    .eq('hunts.game', game)
    .eq('hunts.status', 'open')
  return count ?? 0
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game, slug } = await params
  if (!GAMES.includes(game as Game)) return {}
  const card = await getCard(game as Game, slug)
  if (!card) return {}
  return {
    title: `${card.name} | ${GAME_LABEL[card.game]} — Huntlist`,
    description: `Cerca ${card.name} su Huntlist. ${card.views} visualizzazioni questo mese. Trova venditori o pubblica la tua wishlist.`,
    openGraph: {
      title: `${card.name} — ${GAME_LABEL[card.game]}`,
      description: `${card.views} collezionisti interessati su Huntlist`,
      images: card.image_url ? [card.image_url] : [],
    },
  }
}

function StatBox({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card px-4 py-3 min-w-[72px]">
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="font-heading font-bold text-xl leading-none text-foreground">
        {value}
      </span>
    </div>
  )
}

function GameStats({ card }: { card: Card }) {
  if (card.game === 'yugioh') {
    return (
      <div className="flex flex-wrap gap-3">
        <StatBox label="ATK" value={card.atk} />
        <StatBox label="DEF" value={card.def} />
        <StatBox label="Livello" value={card.level} />
      </div>
    )
  }
  if (card.game === 'pokemon') {
    return (
      <div className="flex flex-wrap gap-3">
        <StatBox label="HP" value={card.hp} />
        <StatBox label="Danno" value={card.damage} />
      </div>
    )
  }
  if (card.game === 'one_piece') {
    return (
      <div className="flex flex-wrap gap-3">
        <StatBox label="Potere" value={card.power} />
        <StatBox label="Costo" value={card.cost} />
      </div>
    )
  }
  return null
}

export default async function CartaDettaglioPage({ params }: Props) {
  const { game, slug } = await params

  if (!GAMES.includes(game as Game)) notFound()
  const typedGame = game as Game

  const card = await getCard(typedGame, slug)
  if (!card) notFound()

  const activeHuntsCount = await getActiveHuntsCount(card.name, typedGame)

  const printings = typedGame === 'yugioh' ? await getPrintings(card.id) : []

  // Per Yu-Gi-Oh!, preferisci il testo effetto YGOResources (IT, poi EN) alla
  // description originale di YGOPRODeck.
  const displayDescription =
    typedGame === 'yugioh'
      ? card.effect_data?.it ?? card.effect_data?.en ?? card.description
      : card.description

  const hasRelatedCriteria = Boolean(
    card.archetype || card.card_type || card.name || card.set_name || card.affiliation
  )
  const relatedCards = hasRelatedCriteria ? await getRelatedCards(card) : []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: card.name,
    image: card.image_url,
    description: displayDescription,
    brand: {
      '@type': 'Brand',
      name: GAME_LABEL[typedGame],
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      offerCount: activeHuntsCount,
      availability:
        activeHuntsCount > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="container py-8 md:py-12">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
          aria-label="Breadcrumb"
        >
          <Link href="/cards" className="hover:text-foreground transition-colors">
            Carte
          </Link>
          <span aria-hidden="true">→</span>
          <Link
            href={`/cards/${typedGame}`}
            className="hover:text-foreground transition-colors"
          >
            {GAME_LABEL[typedGame]}
          </Link>
          <span aria-hidden="true">→</span>
          <span className="text-foreground font-medium truncate">{card.name}</span>
        </nav>

        {/* Layout carta */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-10">
          {/* Immagine */}
          <div className="flex-shrink-0 self-start">
            {card.image_url ? (
              <div className="relative w-full md:w-[200px] rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] overflow-hidden shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38]">
                <Image
                  src={card.image_url}
                  alt={card.name}
                  width={200}
                  height={280}
                  className="w-full object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="w-full md:w-[200px] h-[280px] rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-muted flex items-center justify-center shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38]">
                <span className="text-muted-foreground text-xs text-center px-4">
                  Nessuna immagine
                </span>
              </div>
            )}
          </div>

          {/* Dettagli */}
          <div className="flex-1 space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-[4px] border border-accent bg-accent/10 dark:bg-accent/20 text-accent-foreground">
                  {GAME_LABEL[typedGame]}
                </span>
                {card.rarity && (
                  <span className="text-xs text-muted-foreground">{card.rarity}</span>
                )}
                {card.set_name && (
                  <span className="text-xs text-muted-foreground">· {card.set_name}</span>
                )}
              </div>
              <h1 className="font-heading font-black text-3xl md:text-4xl text-foreground leading-tight">
                {card.name}
              </h1>
            </div>

            {/* Statistiche per gioco */}
            <GameStats card={card} />

            {/* Descrizione */}
            {displayDescription && (
              <p className="text-muted-foreground leading-relaxed max-w-prose whitespace-pre-line">
                {displayDescription}
              </p>
            )}

            {/* Hunt attive */}
            <div className="rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38]">
              <span
                className="font-heading font-black text-6xl leading-none text-[#6DBE00] dark:text-[#9ADE00]"
                aria-label={`${activeHuntsCount} hunt attive`}
              >
                {activeHuntsCount}
              </span>
              <div className="flex flex-col gap-3 text-center sm:text-left">
                <p className="text-foreground font-medium">
                  {activeHuntsCount === 1
                    ? 'utente la sta cercando'
                    : 'utenti la stanno cercando'}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/market?card=${card.slug}&game=${typedGame}`}>
                    Vedi tutte
                  </Link>
                </Button>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href={`/hunts/new?card=${card.slug}&game=${typedGame}`}>
                  Aggiungi alla tua Hunt
                </Link>
              </Button>
              <Button variant="ember" asChild>
                <Link href={`/market?card=${card.slug}&game=${typedGame}`}>
                  Ho questa carta — Fai offerta
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Tutte le edizioni (solo Yu-Gi-Oh!) */}
        {typedGame === 'yugioh' && printings.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border">
            <h2 className="font-heading font-bold text-xl text-foreground mb-4">
              Tutte le edizioni
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-2 border-[#1A1A18] dark:border-[#3A3D38] text-sm">
                <thead>
                  <tr className="bg-[#EAE2D4] dark:bg-[#1A1C19]">
                    <th className="border-2 border-[#1A1A18] dark:border-[#3A3D38] px-3 py-2 text-left font-heading font-bold text-foreground">
                      Set
                    </th>
                    <th className="border-2 border-[#1A1A18] dark:border-[#3A3D38] px-3 py-2 text-left font-heading font-bold text-foreground">
                      Codice
                    </th>
                    <th className="border-2 border-[#1A1A18] dark:border-[#3A3D38] px-3 py-2 text-left font-heading font-bold text-foreground">
                      Rarità
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {printings.map((printing, index) => (
                    <tr key={`${printing.set_name}-${printing.set_number}-${printing.rarity}-${index}`}>
                      <td className="border border-border px-3 py-2 text-foreground">
                        {printing.set_name ?? '—'}
                      </td>
                      <td className="border border-border px-3 py-2 text-foreground">
                        {printing.set_number ?? '—'}
                      </td>
                      <td className="border border-border px-3 py-2 text-muted-foreground">
                        {printing.rarity ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Carte simili */}
        {relatedCards.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border">
            <h2 className="font-heading font-bold text-xl text-foreground mb-4">
              Carte simili
            </h2>
            <div className="flex overflow-x-auto gap-3 pb-2 [&::-webkit-scrollbar]:hidden">
              {relatedCards.map((related) => (
                <Link
                  key={related.id}
                  href={`/cards/${related.game}/${related.slug}`}
                  className="min-w-[120px] flex-shrink-0 rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card overflow-hidden shadow-[2px_2px_0_#1A1A18] dark:shadow-[2px_2px_0_#3A3D38]"
                >
                  {related.image_url ? (
                    <Image
                      src={related.image_url}
                      alt={related.name}
                      width={120}
                      height={170}
                      className="w-full h-[170px] object-cover"
                    />
                  ) : (
                    <div className="w-full h-[170px] bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-[10px] text-center px-2">
                        Nessuna immagine
                      </span>
                    </div>
                  )}
                  <div className="p-2 space-y-0.5">
                    <p className="text-xs text-foreground line-clamp-2 leading-tight">
                      {related.name}
                    </p>
                    {related.rarity && (
                      <p className="text-xs text-muted-foreground">{related.rarity}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Visualizzazioni */}
        <div className="mt-10 pt-6 border-t border-border">
          <CardClient cardId={card.id} views={card.views} />
        </div>
      </main>
    </>
  )
}

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { GAMES, type Game } from '@/lib/tcg'

type CardListItem = {
  id: string
  slug: string
  name: string
  image_url: string | null
  rarity: string | null
}

const GAME_LABEL: Record<Game, string> = {
  yugioh: 'Yu-Gi-Oh!',
  pokemon: 'Pokémon TCG',
  one_piece: 'One Piece TCG',
}

const PAGE_SIZE = 48

type Props = {
  params: Promise<{ game: string }>
  searchParams: Promise<{ pagina?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params
  if (!GAMES.includes(game as Game)) return {}
  const typedGame = game as Game
  return {
    title: `Carte ${GAME_LABEL[typedGame]} | Huntlist`,
    description: `Esplora le carte ${GAME_LABEL[typedGame]} su Huntlist. Trova venditori o pubblica la tua Hunt.`,
  }
}

export default async function CartaListaPage({ params, searchParams }: Props) {
  const { game } = await params
  const { pagina } = await searchParams

  if (!GAMES.includes(game as Game)) notFound()
  const typedGame = game as Game

  const rawPage = parseInt(pagina ?? '1', 10)
  const pageNum = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const limit = pageNum * PAGE_SIZE

  const supabase = await createClient()
  const { data, count } = await supabase
    .from('cards')
    .select('id, slug, name, image_url, rarity', { count: 'exact' })
    .eq('game', typedGame)
    .order('name')
    .range(0, limit - 1)

  const cards = (data as CardListItem[]) ?? []
  const totalCount = count ?? 0
  const hasMore = totalCount > limit

  return (
    <main className="container py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Catalogo carte
        </p>
        <h1 className="font-heading font-black text-3xl md:text-4xl text-foreground">
          {GAME_LABEL[typedGame]}
        </h1>
        {totalCount > 0 && (
          <p className="text-muted-foreground text-sm">
            {totalCount.toLocaleString('it-IT')} carte disponibili
          </p>
        )}
      </div>

      {/* Griglia */}
      {cards.length === 0 ? (
        <div className="py-20 text-center rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card">
          <p className="text-muted-foreground">Nessuna carta ancora disponibile.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={`/${typedGame}/carte/${card.slug}`}
                className="group rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card overflow-hidden shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1A1A18] dark:hover:shadow-[2px_2px_0_#3A3D38] transition-all duration-100"
              >
                {card.image_url ? (
                  <div className="relative w-full aspect-[5/7]">
                    <Image
                      src={card.image_url}
                      alt={card.name}
                      fill
                      unoptimized
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
                <div className="p-3 space-y-1.5">
                  <p className="font-medium text-sm leading-tight text-foreground line-clamp-2">
                    {card.name}
                  </p>
                  {card.rarity && (
                    <p className="text-xs text-muted-foreground">{card.rarity}</p>
                  )}
                  <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-sm border border-accent/50 text-accent-foreground bg-accent/10 dark:bg-accent/20">
                    {GAME_LABEL[typedGame]}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Paginazione */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <Link
                href={`/${typedGame}/carte?pagina=${pageNum + 1}`}
                className="inline-flex items-center justify-center h-10 px-6 rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card text-sm font-medium text-foreground shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1A1A18] dark:hover:shadow-[2px_2px_0_#3A3D38] transition-all duration-100"
              >
                Carica altre
              </Link>
            </div>
          )}
        </>
      )}
    </main>
  )
}

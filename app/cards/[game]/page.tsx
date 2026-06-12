import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GAMES, type Game } from '@/lib/tcg'
import { CarteClient } from './CarteClient'

const GAME_LABEL: Record<Game, string> = {
  yugioh: 'Yu-Gi-Oh!',
  pokemon: 'Pokémon TCG',
  one_piece: 'One Piece TCG',
  magic: 'Magic: The Gathering',
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

export default async function CarteGamePage({ params }: Props) {
  const { game } = await params

  if (!GAMES.includes(game as Game)) notFound()
  const typedGame = game as Game

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

      <CarteClient game={typedGame} />
    </main>
  )
}

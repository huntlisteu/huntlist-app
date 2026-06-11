import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Game } from '@/lib/tcg'

export const metadata: Metadata = {
  title: 'Carte TCG | Huntlist',
  description:
    'Esplora il catalogo carte di Huntlist: Yu-Gi-Oh!, Pokémon TCG e One Piece TCG. Trova la carta che cerchi e pubblica la tua Hunt.',
}

type HubGame = {
  game: Game
  label: string
  tagline: string
}

const HUB_GAMES: HubGame[] = [
  {
    game: 'yugioh',
    label: 'Yu-Gi-Oh!',
    tagline: 'Archetipi, mostri, magie e trappole',
  },
  {
    game: 'pokemon',
    label: 'Pokémon TCG',
    tagline: 'Dal set base alle espansioni piu recenti',
  },
  {
    game: 'one_piece',
    label: 'One Piece TCG',
    tagline: 'Leader, personaggi ed eventi',
  },
]

export default async function CarteHubPage() {
  const supabase = await createClient()

  const counts = await Promise.all(
    HUB_GAMES.map(async ({ game }) => {
      const { count } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('game', game)
      return count ?? 0
    }),
  )

  return (
    <main className="container py-8 md:py-12">
      <div className="mb-10 space-y-1">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Catalogo carte
        </p>
        <h1 className="font-heading font-black text-3xl md:text-4xl text-foreground">
          Scegli il tuo gioco
        </h1>
        <p className="text-muted-foreground text-sm max-w-prose">
          Cerca tra le carte nel database, scopri quanti collezionisti le stanno
          cacciando e pubblica la tua Hunt.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {HUB_GAMES.map(({ game, label, tagline }, index) => (
          <Link
            key={game}
            href={`/cards/${game}`}
            className="group flex flex-col gap-4 rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card p-6 shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1A1A18] dark:hover:shadow-[2px_2px_0_#3A3D38] transition-all duration-100"
          >
            <div className="space-y-1">
              <h2 className="font-heading font-extrabold text-2xl text-foreground leading-tight">
                {label}
              </h2>
              <p className="text-sm text-muted-foreground">{tagline}</p>
            </div>

            <div className="mt-auto flex items-end justify-between gap-3">
              <div>
                <p className="font-heading font-black text-4xl leading-none text-[#6DBE00] dark:text-[#9ADE00]">
                  {counts[index].toLocaleString('it-IT')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {counts[index] === 1 ? 'carta nel database' : 'carte nel database'}
                </p>
              </div>
              <span
                className="text-sm font-bold text-foreground group-hover:translate-x-0.5 transition-transform"
                aria-hidden="true"
              >
                Esplora →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}

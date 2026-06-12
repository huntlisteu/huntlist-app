import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

type RulingEntry = Partial<Record<'en' | 'it' | 'de' | 'fr' | 'es' | 'pt', string>>
type RulingData = Record<string, RulingEntry[]>

type CardRow = {
  name: string
  image_url: string | null
  ruling_data: RulingData | null
  konami_id: number | null
}

type Props = {
  params: Promise<{ game: string; slug: string }>
}

async function getCard(slug: string): Promise<CardRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cards')
    .select('name, image_url, ruling_data, konami_id')
    .eq('game', 'yugioh')
    .eq('slug', slug)
    .single()
  return (data as CardRow) ?? null
}

function effectTitle(key: string): string {
  if (key === '0.5') return 'Regola generale'
  return `Effetto ${key}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game, slug } = await params
  if (game !== 'yugioh') return {}
  const card = await getCard(slug)
  if (!card) return {}
  return {
    title: `${card.name} Ruling | Huntlist`,
  }
}

export default async function RulingPage({ params }: Props) {
  const { game, slug } = await params
  if (game !== 'yugioh') notFound()

  const card = await getCard(slug)

  const sections = card?.ruling_data
    ? Object.entries(card.ruling_data)
        .filter(([, entries]) => entries.some((entry) => entry.en))
        .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
    : []

  return (
    <main className="container py-8 md:py-12">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-sm text-muted-foreground mb-8 flex-wrap"
        aria-label="Breadcrumb"
      >
        <Link href="/cards" className="hover:text-foreground transition-colors">
          Carte
        </Link>
        <span aria-hidden="true">→</span>
        <Link href="/cards/yugioh" className="hover:text-foreground transition-colors">
          Yu-Gi-Oh!
        </Link>
        <span aria-hidden="true">→</span>
        <Link
          href={`/cards/yugioh/${slug}`}
          className="hover:text-foreground transition-colors truncate"
        >
          {card?.name ?? slug}
        </Link>
        <span aria-hidden="true">→</span>
        <span className="text-foreground font-medium">Ruling</span>
      </nav>

      <h1 className="font-heading font-black text-3xl md:text-4xl text-foreground leading-tight mb-8">
        {card?.name ?? slug} — Ruling
      </h1>

      {sections.length === 0 ? (
        <div className="rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card p-6 shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38] max-w-prose">
          <p className="text-foreground mb-4">Nessun ruling disponibile per questa carta.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/cards/yugioh/${slug}`}>← Torna alla carta</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6 max-w-prose">
          {sections.map(([key, entries]) => (
            <div
              key={key}
              className="rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-card p-5 shadow-[4px_4px_0_#1A1A18] dark:shadow-[4px_4px_0_#3A3D38]"
            >
              <h2 className="font-heading font-bold text-lg text-foreground mb-3">
                {effectTitle(key)}
              </h2>
              <ul className="space-y-3">
                {entries
                  .filter((entry) => entry.en)
                  .map((entry, index) => (
                    <li
                      key={index}
                      className="text-muted-foreground leading-relaxed whitespace-pre-line"
                    >
                      {entry.en}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {card?.konami_id != null && (
        <p className="mt-8 text-xs text-muted-foreground">
          Fonte:{' '}
          <a
            href={`https://db.ygoresources.com/card#${card.konami_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            YGOResources
          </a>
        </p>
      )}
    </main>
  )
}

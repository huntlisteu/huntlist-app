'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type CardClientProps = {
  cardId: string
  views: number
}

export function CardClient({ cardId, views }: CardClientProps) {
  useEffect(() => {
    const supabase = createClient()
    void supabase.rpc('increment_card_views', { card_id: cardId }).then(null, () => {})
  }, [cardId])

  return (
    <p className="text-sm text-muted-foreground">
      {views.toLocaleString('it-IT')} visualizzazioni questo mese
    </p>
  )
}

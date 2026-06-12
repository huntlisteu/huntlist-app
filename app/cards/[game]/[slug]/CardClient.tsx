'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type CardClientProps = {
  cardId: string
}

export function CardClient({ cardId }: CardClientProps) {
  useEffect(() => {
    const supabase = createClient()
    void supabase.rpc('increment_card_views', { card_id: cardId }).then(null, () => {})
  }, [cardId])

  return null
}

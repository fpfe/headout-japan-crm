// PATCH /api/news/items/[id]  body: { category: NewsCategory }
//
// Manual category override — for when Gemini's auto-classification got
// it wrong. Validates against the allowed set and updates news_items.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NEWS_CATEGORIES } from '@/lib/news-sources'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const category = typeof body?.category === 'string' ? body.category : ''
    if (!(NEWS_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${NEWS_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }
    const { data, error } = await supabaseAdmin
      .from('news_items')
      .update({ category })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('[api/news/items] update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

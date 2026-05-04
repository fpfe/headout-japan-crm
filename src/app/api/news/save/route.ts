// POST   /api/news/save  body: { newsItemId }   → save (idempotent)
// DELETE /api/news/save?newsItemId=<id>         → unsave

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newsItemId = typeof body?.newsItemId === 'string' ? body.newsItemId : ''
    if (!newsItemId) {
      return NextResponse.json(
        { error: 'newsItemId is required' },
        { status: 400 }
      )
    }
    // ON CONFLICT (news_item_id) DO NOTHING — saved_news has UNIQUE on news_item_id
    const { data, error } = await supabaseAdmin
      .from('saved_news')
      .upsert({ news_item_id: newsItemId }, { onConflict: 'news_item_id', ignoreDuplicates: true })
      .select()
    if (error) throw error
    return NextResponse.json({ saved: data?.[0] ?? { news_item_id: newsItemId } })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const newsItemId = searchParams.get('newsItemId')
    if (!newsItemId) {
      return NextResponse.json(
        { error: 'newsItemId is required' },
        { status: 400 }
      )
    }
    const { error } = await supabaseAdmin
      .from('saved_news')
      .delete()
      .eq('news_item_id', newsItemId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

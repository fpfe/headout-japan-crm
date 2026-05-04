import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NEWS_CATEGORIES } from '@/lib/news-sources'

// Two-query approach (no PostgREST joins) — robust whether or not
// foreign-key relationships are auto-detected.

type NewsRow = {
  id: string
  url: string
  title: string
  source: string
  source_lang: string
  published_at: string
  summary: string | null
  category: string | null
  fetched_at: string
}

type SavedRow = {
  id: string
  news_item_id: string
  saved_at: string
  is_read: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const onlySaved = searchParams.get('saved') === 'true'
    const limit = Math.min(
      parseInt(searchParams.get('limit') ?? '60', 10) || 60,
      200
    )

    // 1) Get all saved rows once (small table, fine to load)
    const { data: savedRows, error: savedErr } = await supabaseAdmin
      .from('saved_news')
      .select('id, news_item_id, saved_at, is_read')
    if (savedErr) {
      console.error('[api/news] saved_news select failed:', savedErr)
      return NextResponse.json(
        { error: `saved_news: ${savedErr.message}` },
        { status: 500 }
      )
    }
    const savedById = new Map<string, SavedRow>()
    for (const s of (savedRows ?? []) as SavedRow[]) {
      savedById.set(s.news_item_id, s)
    }

    // 2) Get news_items
    let q = supabaseAdmin
      .from('news_items')
      .select(
        'id, url, title, source, source_lang, published_at, summary, category, fetched_at'
      )
      .order('published_at', { ascending: false })
      .limit(onlySaved ? 500 : limit)
    if (category && (NEWS_CATEGORIES as readonly string[]).includes(category)) {
      q = q.eq('category', category)
    }
    const { data: news, error: newsErr } = await q
    if (newsErr) {
      console.error('[api/news] news_items select failed:', newsErr)
      return NextResponse.json(
        { error: `news_items: ${newsErr.message}` },
        { status: 500 }
      )
    }

    // 3) Merge & shape, optionally filter to saved-only
    const out = ((news ?? []) as NewsRow[])
      .map((r) => {
        const saved = savedById.get(r.id) ?? null
        return {
          id: r.id,
          url: r.url,
          title: r.title,
          source: r.source,
          sourceLang: r.source_lang,
          publishedAt: r.published_at,
          summary: r.summary,
          category: r.category,
          fetchedAt: r.fetched_at,
          saved: saved
            ? { id: saved.id, savedAt: saved.saved_at, isRead: saved.is_read }
            : null,
        }
      })
      .filter((r) => (onlySaved ? r.saved !== null : true))
      .slice(0, limit)

    return NextResponse.json(out)
  } catch (err) {
    console.error('[api/news] unexpected:', err)
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type BriefShape = {
  activity_title?: string
  score?: number
  companies?: Array<{ legal_name_en?: string }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, brief } = body as { query?: string; brief?: BriefShape }
    if (!query || !brief) {
      return Response.json(
        { error: 'query and brief are required' },
        { status: 400 }
      )
    }
    const { data, error } = await supabaseAdmin
      .from('deep_search_history')
      .insert({ query, brief })
      .select()
      .single()
    if (error) throw error
    return Response.json(data, { status: 201 })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('deep_search_history')
      .select('id, created_at, query, brief, saved_as_lead_id')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    const rows = (data ?? []).map((r) => {
      const b = (r.brief ?? {}) as BriefShape
      return {
        id: r.id,
        created_at: r.created_at,
        query: r.query,
        activity_title: b.activity_title ?? null,
        score: typeof b.score === 'number' ? b.score : null,
        company: b.companies?.[0]?.legal_name_en ?? null,
        saved_as_lead_id: r.saved_as_lead_id,
      }
    })
    return Response.json(rows)
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

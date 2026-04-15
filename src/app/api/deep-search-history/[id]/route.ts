import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabaseAdmin
      .from('deep_search_history')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return Response.json(data)
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { saved_as_lead_id } = body as { saved_as_lead_id?: string | null }
    const { data, error } = await supabaseAdmin
      .from('deep_search_history')
      .update({ saved_as_lead_id: saved_as_lead_id ?? null })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return Response.json(data)
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

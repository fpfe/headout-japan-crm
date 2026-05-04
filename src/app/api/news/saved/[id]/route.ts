// PATCH /api/news/saved/[id]  body: { isRead: boolean }
//
// Toggle the read flag on a saved_news row. id is the saved_news row id.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const isRead = !!body?.isRead
    const { data, error } = await supabaseAdmin
      .from('saved_news')
      .update({ is_read: isRead })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

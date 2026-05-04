import { NextRequest } from 'next/server'
import { getLeads, updateLead, deleteLead } from '@/lib/sheets'
import type { Lead } from '@/types'

/**
 * POST /api/leads/merge
 * Body: { keepId: string, deleteIds: string[] }
 *
 * Merges missing fields from the duplicates into the kept lead,
 * then deletes the duplicates.
 * - Interaction logs, internal notes, and documents stay linked to
 *   their leadId and are NOT touched.
 * - Only empty/missing scalar fields on the kept lead get enriched.
 * - notes field is concatenated (kept lead's notes come first).
 */
export async function POST(request: NextRequest) {
  try {
    const { keepId, deleteIds } = (await request.json()) as {
      keepId: string
      deleteIds: string[]
    }

    if (!keepId || !Array.isArray(deleteIds) || deleteIds.length === 0) {
      return Response.json(
        { error: 'keepId and deleteIds[] are required' },
        { status: 400 }
      )
    }

    // Fetch all leads to find the ones we're merging
    const allLeads = await getLeads()
    const keepLead = allLeads.find((l) => l.id === keepId)
    if (!keepLead) {
      return Response.json({ error: 'Keep lead not found' }, { status: 404 })
    }

    const dupes = allLeads.filter((l) => deleteIds.includes(l.id))

    // Build merged field values — only fill in blanks on the kept lead
    const fillable: (keyof Lead)[] = [
      'contactName',
      'email',
      'phone',
      'serviceType',
      'leadSource',
      'region',
      'dealValue',
      'competitorKkday',
      'competitorKlook',
      'competitorGyg',
      'competitorViator',
      'competitorAirbnb',
    ]

    const patch: Partial<Lead> = {}

    for (const field of fillable) {
      const current = keepLead[field]
      if (!current || current === 'N/a' || current === 'n/a') {
        // Find the first duplicate that has a value for this field
        for (const dupe of dupes) {
          const val = dupe[field]
          if (val && val !== 'N/a' && val !== 'n/a') {
            patch[field] = val as never
            break
          }
        }
      }
    }

    // Concatenate notes — keep lead's notes first, then append unique dupe notes
    const keepNotes = (keepLead.notes || '').trim()
    const dupeNotes = dupes
      .map((d) => (d.notes || '').trim())
      .filter((n) => n && n !== keepNotes)

    if (dupeNotes.length > 0) {
      const separator = '\n\n--- Merged from duplicate ---\n'
      patch.notes = [keepNotes, ...dupeNotes.map((n) => separator + n)]
        .filter(Boolean)
        .join('')
    }

    // Update the kept lead with merged data
    if (Object.keys(patch).length > 0) {
      await updateLead(keepId, patch)
    }

    // Delete duplicates
    const deleteResults = await Promise.allSettled(
      deleteIds.map((id) => deleteLead(id))
    )

    const deletedCount = deleteResults.filter(
      (r) => r.status === 'fulfilled' && r.value
    ).length

    return Response.json({
      ok: true,
      merged: Object.keys(patch),
      deletedCount,
    })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

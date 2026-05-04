import { NextRequest } from 'next/server'
import { createLead } from '@/lib/sheets'
import type { LeadStatus } from '@/types'

const VALID_STATUSES: LeadStatus[] = [
  'New', 'Contacted', 'Qualified', 'Proposal Sent',
  'Negotiation', 'Closed Won', 'Closed Lost',
]

export async function POST(request: NextRequest) {
  try {
    const { rows } = await request.json() as { rows: Record<string, string>[] }
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'No rows provided' }, { status: 400 })
    }
    if (rows.length > 100) {
      return Response.json({ error: 'Max 100 rows per import' }, { status: 400 })
    }

    const results: { success: number; errors: string[] } = { success: 0, errors: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        if (!row.company) {
          results.errors.push(`Row ${i + 1}: company is required`)
          continue
        }
        const status = (VALID_STATUSES.includes(row.status as LeadStatus)
          ? row.status
          : 'New') as LeadStatus

        await createLead({
          contactName: row.contactName || row.contact_name || row.name || '',
          email: row.email || '',
          phone: row.phone || '',
          company: row.company || '',
          serviceType: row.serviceType || row.service_type || '',
          leadSource: row.leadSource || row.lead_source || 'CSV Import',
          assignedTo: row.assignedTo || row.assigned_to || '',
          status,
          region: row.region || '',
          notes: row.notes || '',
          dealValue: row.dealValue || row.deal_value || '0',
          tags: row.tags || '',
          followUpDate: row.followUpDate || row.follow_up_date || '',
          competitorKkday: '',
          competitorKlook: '',
          competitorGyg: '',
          competitorViator: '',
          competitorAirbnb: '',
        })
        results.success++
        // Small delay to avoid rate limiting Google Sheets
        if (i < rows.length - 1) {
          await new Promise((r) => setTimeout(r, 300))
        }
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${(err as Error).message}`)
      }
    }

    return Response.json(results)
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500 }
    )
  }
}

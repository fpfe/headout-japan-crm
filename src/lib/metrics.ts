import { Lead } from '@/types'

export function calcMetrics(leads: Lead[]) {
  const total = leads.length
  const closedWon = leads.filter((l) => l.status === 'Closed Won').length
  const closedLost = leads.filter((l) => l.status === 'Closed Lost').length
  const closed = closedWon + closedLost

  const acquisitionRate =
    total > 0 ? ((closedWon / total) * 100).toFixed(1) : '0.0'

  const conversionRate =
    closed > 0 ? ((closedWon / closed) * 100).toFixed(1) : '0.0'

  const wonLeads = leads.filter((l) => l.status === 'Closed Won')
  const avgCycleDays =
    wonLeads.length > 0
      ? Math.round(
          wonLeads.reduce((sum, l) => {
            const created = new Date(l.createdAt)
            const now = new Date()
            const days = Math.floor(
              (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
            )
            return sum + days
          }, 0) / wonLeads.length
        )
      : 0

  const stageCounts = {
    New: leads.filter((l) => l.status === 'New').length,
    Contacted: leads.filter((l) => l.status === 'Contacted').length,
    Qualified: leads.filter((l) => l.status === 'Qualified').length,
    'Proposal Sent': leads.filter((l) => l.status === 'Proposal Sent').length,
    Negotiation: leads.filter((l) => l.status === 'Negotiation').length,
    'Closed Won': closedWon,
    'Closed Lost': leads.filter((l) => l.status === 'Closed Lost').length,
  }

  const totalValue = leads.reduce(
    (sum, l) => sum + parseInt(l.dealValue || '0', 10),
    0
  )

  return {
    acquisitionRate,
    conversionRate,
    avgCycleDays,
    stageCounts,
    totalValue,
    totalLeads: total,
    closedWon,
  }
}

'use client'

type Props = {
  acquisitionRate: string
  conversionRate: string
  avgCycleDays: number
}

function TrendBadge({
  label,
  tone,
}: {
  label: string
  tone: 'green' | 'gray' | 'red' | 'amber'
}) {
  const styles: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  return (
    <span
      className={`px-3 py-1 rounded-none text-[11px] font-bold tracking-wider ${styles[tone]}`}
    >
      {label}
    </span>
  )
}

export default function KpiCards({
  acquisitionRate,
  conversionRate,
  avgCycleDays,
}: Props) {
  const acqNum = parseFloat(acquisitionRate)
  const cycleTone: 'green' | 'amber' | 'red' =
    avgCycleDays === 0
      ? 'gray' as never
      : avgCycleDays <= 14
      ? 'green'
      : avgCycleDays > 20
      ? 'red'
      : 'amber'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Card 1 */}
      <div className="bg-white rounded-none p-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-none bg-[#a83900]/5 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[#a83900]"
              style={{ fontSize: 24 }}
            >
              trending_up
            </span>
          </div>
          {acqNum > 0 ? (
            <TrendBadge label={`+${acquisitionRate}%`} tone="green" />
          ) : (
            <TrendBadge label="No data" tone="gray" />
          )}
        </div>
        <div className="mt-8 text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Merchant Acquisition Rate
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className="font-display text-[#181c23]"
            style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}
          >
            {acquisitionRate}
          </span>
          <span className="text-[1.25rem] text-gray-400 font-semibold">%</span>
        </div>
        {acquisitionRate === '0.0' && (
          <div className="mt-2 text-[12px] italic text-gray-500">
            Move leads to Closed Won to track rate
          </div>
        )}
      </div>

      {/* Card 2 */}
      <div className="bg-white rounded-none p-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-none bg-[#b60056]/5 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[#b60056]"
              style={{ fontSize: 24 }}
            >
              hub
            </span>
          </div>
        </div>
        <div className="mt-8 text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Lead Conversion Rate
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className="font-display text-[#181c23]"
            style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}
          >
            {conversionRate}
          </span>
          <span className="text-[1.25rem] text-gray-400 font-semibold">%</span>
        </div>
        {conversionRate === '0.0' && (
          <div className="mt-2 text-[12px] italic text-gray-500">
            Close your first deal to see conversion
          </div>
        )}
      </div>

      {/* Card 3 */}
      <div className="bg-white rounded-none p-8 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-none bg-[#685588]/5 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[#685588]"
              style={{ fontSize: 24 }}
            >
              schedule
            </span>
          </div>
          {avgCycleDays > 0 && (
            <TrendBadge
              label={
                cycleTone === 'green'
                  ? 'On track'
                  : cycleTone === 'amber'
                  ? 'Watch'
                  : 'Slow'
              }
              tone={cycleTone}
            />
          )}
        </div>
        <div className="mt-8 text-[12px] uppercase tracking-[0.18em] font-bold text-[#5b4137]/60">
          Average Sales Cycle
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className="font-display text-[#181c23]"
            style={{ fontSize: '4rem', fontWeight: 900, lineHeight: 1 }}
          >
            {avgCycleDays}
          </span>
          <span className="text-[1.25rem] text-gray-400 font-semibold">
            days
          </span>
        </div>
        {avgCycleDays === 0 && (
          <div className="mt-2 text-[12px] italic text-gray-500">
            Close your first deal to track cycle time
          </div>
        )}
      </div>
    </div>
  )
}

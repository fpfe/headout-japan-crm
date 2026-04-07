'use client'

type StageCounts = {
  New: number
  Contacted: number
  Qualified: number
  'Proposal Sent': number
  Negotiation: number
  'Closed Won': number
  'Closed Lost': number
}

type Props = {
  stageCounts: StageCounts
}

const STAGES: {
  label: string
  key: keyof StageCounts
  fill: string
  inner?: boolean
}[] = [
  { label: 'Prospecting', key: 'New', fill: 'bg-[#a83900]/15' },
  { label: 'Contacted', key: 'Contacted', fill: 'bg-[#a83900]/25' },
  { label: 'Qualification', key: 'Qualified', fill: 'bg-[#a83900]/35' },
  { label: 'Proposal', key: 'Proposal Sent', fill: 'bg-[#a83900]/50' },
  { label: 'Negotiation', key: 'Negotiation', fill: 'bg-[#a83900]/65' },
  { label: 'Closed Won', key: 'Closed Won', fill: 'bg-[#a83900]', inner: true },
]

export default function PipelineHealth({ stageCounts }: Props) {
  const max = Math.max(...STAGES.map((s) => stageCounts[s.key]), 1)
  const active =
    stageCounts.New +
    stageCounts.Contacted +
    stageCounts.Qualified +
    stageCounts['Proposal Sent'] +
    stageCounts.Negotiation

  return (
    <div className="bg-[#f1f3fe] rounded-[2.5rem] p-8 xl:col-span-2">
      <div className="flex items-center justify-between mb-8">
        <h2
          className="font-display font-bold text-[#181c23]"
          style={{ fontSize: 22 }}
        >
          Pipeline Health
        </h2>
        <span className="px-4 py-1.5 rounded-full bg-white text-[#a83900] text-[12px] font-bold tracking-wider">
          Active: {active} Deals
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {STAGES.map((s) => {
          const count = stageCounts[s.key]
          const pct = Math.round((count / max) * 100)
          return (
            <div key={s.key}>
              <div className="flex items-center mb-2">
                <span className="text-[12px] font-bold text-gray-600 uppercase tracking-wider">
                  {s.label}
                </span>
              </div>
              <div
                className="bg-[#dfe2ed] rounded-2xl overflow-hidden"
                style={{ height: 32 }}
              >
                <div
                  className={`${s.fill} h-full rounded-2xl transition-all flex items-center`}
                  style={{ width: `${Math.max(pct, 4)}%` }}
                >
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'white',
                        paddingLeft: 12,
                        opacity: 0.9,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

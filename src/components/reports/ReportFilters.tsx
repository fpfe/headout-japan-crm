'use client'

export type ReportFilterValue = {
  dateRange: 'all' | 'month' | '3months' | '6months' | 'year'
  serviceType: string
  assignedTo: string
}

type Props = {
  value: ReportFilterValue
  onChange: (v: ReportFilterValue) => void
  serviceTypes: string[]
  reps: string[]
}

const DATE_OPTIONS: { value: ReportFilterValue['dateRange']; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'month', label: 'This month' },
  { value: '3months', label: 'Last 3 months' },
  { value: '6months', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
]

function Pill({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative inline-flex items-center bg-white border border-[#e5e8f3] rounded-none pl-3 pr-8 py-2 text-[13px] text-[#181c23]">
      {children}
      <span
        className="material-symbols-outlined absolute right-2 pointer-events-none text-[#5b4137]"
        style={{ fontSize: 16 }}
      >
        expand_more
      </span>
    </div>
  )
}

export default function ReportFilters({
  value,
  onChange,
  serviceTypes,
  reps,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <Pill>
        <select
          value={value.dateRange}
          onChange={(e) =>
            onChange({
              ...value,
              dateRange: e.target.value as ReportFilterValue['dateRange'],
            })
          }
          className="bg-transparent outline-none appearance-none pr-2 text-[13px] font-medium"
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Pill>

      <Pill>
        <select
          value={value.serviceType}
          onChange={(e) => onChange({ ...value, serviceType: e.target.value })}
          className="bg-transparent outline-none appearance-none pr-2 text-[13px] font-medium"
        >
          <option value="">All types</option>
          {serviceTypes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Pill>

      <Pill>
        <select
          value={value.assignedTo}
          onChange={(e) => onChange({ ...value, assignedTo: e.target.value })}
          className="bg-transparent outline-none appearance-none pr-2 text-[13px] font-medium"
        >
          <option value="">All reps</option>
          {reps.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Pill>
    </div>
  )
}

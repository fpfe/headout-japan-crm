'use client'

import { LEAD_STATUSES, type LeadStatus } from '@/types'

export type CrmSort =
  | 'newest'
  | 'oldest'
  | 'company-asc'
  | 'company-desc'
  | 'status'

export type CrmFilterValue = {
  status: '' | LeadStatus
  serviceType: string
  search: string
  sort: CrmSort
}

type Props = {
  value: CrmFilterValue
  onChange: (v: CrmFilterValue) => void
  serviceTypes: string[]
  filteredCount: number
  totalCount: number
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-flex items-center bg-white border border-[#e5e8f3] rounded-lg pl-3 pr-8 py-2 text-[13px] text-[#181c23]">
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

export default function CrmFilters({
  value,
  onChange,
  serviceTypes,
  filteredCount,
  totalCount,
}: Props) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3 items-center">
        <Pill>
          <select
            value={value.status}
            onChange={(e) =>
              onChange({ ...value, status: e.target.value as CrmFilterValue['status'] })
            }
            className="bg-transparent outline-none appearance-none pr-2 text-[13px] font-medium"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
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
            value={value.sort}
            onChange={(e) =>
              onChange({ ...value, sort: e.target.value as CrmSort })
            }
            className="bg-transparent outline-none appearance-none pr-2 text-[13px] font-medium"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="company-asc">Company A→Z</option>
            <option value="company-desc">Company Z→A</option>
            <option value="status">Status</option>
          </select>
        </Pill>

        <div
          className="relative inline-flex items-center bg-white border border-[#e5e8f3] rounded-lg pl-9 pr-3 py-2 text-[13px]"
          style={{ minWidth: 200 }}
        >
          <span
            className="material-symbols-outlined absolute left-2 text-[#5b4137]"
            style={{ fontSize: 16 }}
          >
            search
          </span>
          <input
            type="text"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Search merchants..."
            className="bg-transparent outline-none w-full text-[13px]"
          />
        </div>
      </div>

      <div className="mt-3 text-[12px] text-[#5b4137]/70">
        Showing {filteredCount} of {totalCount} merchants
      </div>
    </div>
  )
}

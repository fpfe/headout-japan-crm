'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Lead, LeadStatus } from '@/types'
import { LEAD_STATUSES } from '@/types'
import StatusBadge from './StatusBadge'

function temperatureColor(status: string): string {
  if (['Negotiation', 'Proposal Sent', 'Closed Won'].includes(status))
    return '#ef4444'
  if (['Qualified', 'Contacted'].includes(status)) return '#f59e0b'
  return '#9ca3af'
}

function SourceIcon({ source }: { source: string }) {
  const s = source.toLowerCase()
  if (s.includes('referral')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    )
  }
  if (s.includes('linkedin') || s.includes('ad')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l18-8-8 18-2-8-8-2z" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z" />
    </svg>
  )
}

const GRID_COLS =
  'grid-cols-[40px_1.4fr_1.4fr_1fr_1fr_1fr_1.1fr_60px]'

type Props = {
  leads: Lead[]
  rowSelection: RowSelectionState
  onRowSelectionChange: (state: RowSelectionState) => void
  onView: (lead: Lead) => void
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
  onStatusChange: (lead: Lead, status: LeadStatus) => void
}

export default function LeadTable({
  leads,
  rowSelection,
  onRowSelectionChange,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="accent-[#a83900]"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="accent-[#a83900]"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        id: 'contact',
        header: 'Contact Person',
        cell: ({ row }) => {
          const lead = row.original
          if (!lead.contactName && !lead.email) return null
          return (
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-[#181c23] truncate" title={lead.contactName}>
                {lead.contactName}
              </div>
              {lead.email && (
                <div className="text-[12px] text-gray-500 truncate" title={lead.email}>
                  {lead.email}
                </div>
              )}
            </div>
          )
        },
      },
      {
        id: 'company',
        header: 'Company',
        cell: ({ row }) => {
          const lead = row.original
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2 h-2 rounded-none shrink-0"
                style={{ background: temperatureColor(lead.status) }}
              />
              <Link
                href={`/leads/${lead.id}`}
                className="text-[13px] font-medium text-[#181c23] truncate cursor-pointer hover:text-[#a83900] hover:underline"
              >
                {lead.company}
              </Link>
            </div>
          )
        },
      },
      {
        accessorKey: 'serviceType',
        header: 'Service Type',
        cell: ({ getValue }) => {
          const value = getValue<string>()
          return (
            <span
              className="inline-block max-w-[180px] px-2.5 py-1 rounded-none text-[11px] font-semibold text-gray-700 bg-gray-100 truncate"
              title={value}
            >
              {value}
            </span>
          )
        },
      },
      {
        accessorKey: 'leadSource',
        header: 'Lead Source',
        cell: ({ getValue }) => {
          const value = getValue<string>()
          return (
            <div className="flex items-center gap-2 text-[12px] text-gray-600">
              <SourceIcon source={value} />
              <span className="truncate">{value}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned To',
        cell: ({ getValue }) => {
          const value = getValue<string>()
          return (
            <span className="text-[12px] text-gray-600 truncate block" title={value}>
              {value || '\u2014'}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const lead = row.original
          if (editingStatusId === lead.id) {
            return (
              <select
                autoFocus
                defaultValue={lead.status}
                onBlur={() => setEditingStatusId(null)}
                onChange={(e) => {
                  setEditingStatusId(null)
                  onStatusChange(lead, e.target.value as LeadStatus)
                }}
                className="text-[12px] rounded-none border border-gray-200 px-2 py-1 bg-white"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )
          }
          return (
            <button
              type="button"
              onClick={() => setEditingStatusId(lead.id)}
              title="Click to change status"
            >
              <StatusBadge status={lead.status} />
            </button>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const lead = row.original
          return (
            <div className="relative flex justify-end group">
              <button
                className="text-gray-400 group-hover:text-[#a83900] p-1"
                title="Actions"
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              <div
                className="absolute right-0 top-full z-30 w-32 bg-white rounded-none py-1 text-[13px] hidden group-hover:block"
                style={{ boxShadow: '0 8px 24px rgba(15,15,30,0.12)' }}
              >
                <button
                  className="w-full text-left px-3 py-2 hover:bg-[#ebedf8]"
                  onClick={() => onEdit(lead)}
                >
                  Edit
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-[#ebedf8]"
                  onClick={() => onView(lead)}
                >
                  View
                </button>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-[#ebedf8] text-red-600"
                  onClick={() => {
                    if (confirm(`Delete ${lead.contactName}?`)) onDelete(lead)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        },
      },
    ],
    [editingStatusId, onView, onEdit, onDelete, onStatusChange]
  )

  const table = useReactTable({
    data: leads,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(rowSelection) : updater
      onRowSelectionChange(next)
    },
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-none overflow-visible">
      {table.getHeaderGroups().map((hg) => (
        <div
          key={hg.id}
          className={`grid ${GRID_COLS} px-5 py-3 text-[11px] font-bold tracking-wider text-gray-500 uppercase`}
        >
          {hg.headers.map((header) => (
            <div key={header.id}>
              {header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext())}
            </div>
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-1">
        {table.getRowModel().rows.map((row) => (
          <div
            key={row.id}
            className={`grid ${GRID_COLS} items-center px-5 py-3 rounded-none transition-colors hover:bg-[#ebedf8]`}
            style={row.getIsSelected() ? { background: '#ebedf8' } : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <div key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            ))}
          </div>
        ))}
        {leads.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            No leads match the current filters.
          </div>
        )}
      </div>

    </div>
  )
}

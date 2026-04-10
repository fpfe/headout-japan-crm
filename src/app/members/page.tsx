'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Member } from '@/types'
import MemberFormModal from '@/components/members/MemberFormModal'

const AVATAR_COLORS = [
  '#fde68a',
  '#fca5a5',
  '#a5f3fc',
  '#bbf7d0',
  '#ddd6fe',
  '#fbcfe8',
]

function hashIndex(s: string, mod: number) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % mod
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<Member | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/members', { cache: 'no-store' })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setMembers(await res.json())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openCreate = () => {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (m: Member) => {
    setFormMode('edit')
    setEditing(m)
    setFormOpen(true)
  }
  const handleDelete = async (m: Member) => {
    if (!confirm(`Remove ${m.name} from the team?`)) return
    try {
      const res = await fetch(`/api/members/${m.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      refresh()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-6">
        <div>
          <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
            Team
          </div>
          <h1 className="font-display font-extrabold text-[2.6rem] leading-tight text-[#181c23] mt-2">
            Members
          </h1>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <span className="px-4 py-2 rounded-none bg-gray-100 text-gray-700 text-[12px] font-bold tracking-wider">
            {members.length} REGISTERED
          </span>
          <button
            onClick={openCreate}
            className="brand-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-none shadow-sm hover:opacity-95 transition"
          >
            + Register Member
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-none bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-12 text-center text-sm text-gray-500">
          Loading members…
        </div>
      ) : (
        <div className="rounded-none overflow-visible">
          <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_60px] px-5 py-3 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Business Title</div>
            <div>Slack ID</div>
            <div></div>
          </div>

          <div className="flex flex-col gap-1">
            {members.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_60px] items-center px-5 py-3 rounded-none transition-colors hover:bg-[#ebedf8]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-none flex items-center justify-center text-[11px] font-bold text-gray-700 shrink-0"
                    style={{
                      background:
                        AVATAR_COLORS[
                          hashIndex(m.name || m.id, AVATAR_COLORS.length)
                        ],
                    }}
                  >
                    {initials(m.name)}
                  </div>
                  <div className="text-[14px] font-bold text-[#181c23] truncate">
                    {m.name}
                  </div>
                </div>
                <div className="text-[12px] text-gray-600 truncate">
                  {m.email}
                </div>
                <div className="text-[12px] text-gray-600 truncate">
                  {m.phone || '—'}
                </div>
                <div className="text-[12px] text-gray-600 truncate">
                  {m.businessTitle || '—'}
                </div>
                <div className="text-[12px] text-gray-600 truncate">
                  {m.slackId || '—'}
                </div>
                <div className="relative flex justify-end group">
                  <button
                    type="button"
                    className="text-gray-400 group-hover:text-[#a83900] p-1"
                    title="Actions"
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
                      onClick={() => openEdit(m)}
                    >
                      Edit
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-[#ebedf8] text-red-600"
                      onClick={() => handleDelete(m)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="px-5 py-12 text-center text-sm text-gray-500">
                No members yet. Click <b>+ Register Member</b> to add one.
              </div>
            )}
          </div>
        </div>
      )}

      <MemberFormModal
        open={formOpen}
        mode={formMode}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onCreated={() => refresh()}
      />
    </div>
  )
}

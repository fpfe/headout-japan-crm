'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Interaction, InteractionType } from '@/types'

const TYPE_META: Record<
  InteractionType,
  { label: string; bg: string; fg: string; icon: React.ReactNode }
> = {
  call: {
    label: 'Call',
    bg: '#d3e3fd',
    fg: '#003e8a',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    ),
  },
  email: {
    label: 'Email',
    bg: '#ffd8e7',
    fg: '#7a0042',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  meeting: {
    label: 'Meeting',
    bg: '#ffd9c2',
    fg: '#a83900',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
        <path d="M15 20c0-2 2-4 4-4" />
      </svg>
    ),
  },
  video_call: {
    label: 'Video Call',
    bg: '#ffd9c2',
    fg: '#a83900',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="14" height="12" rx="2" />
        <path d="M22 8l-6 4 6 4V8z" />
      </svg>
    ),
  },
  note: {
    label: 'Note',
    bg: '#ebedf8',
    fg: '#181c23',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="14 3 14 9 20 9" />
      </svg>
    ),
  },
}

function fmtDate(s: string): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function InteractionLog({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/interactions?leadId=${leadId}`, {
        cache: 'no-store',
      })
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section
      className="bg-white p-8"
      style={{
        borderRadius: 0,
        border: '1px solid rgba(228,190,177,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          className="font-display font-bold text-[24px] text-[#181c23]"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          Interaction Log
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[#a83900] text-[13px] font-bold inline-flex items-center gap-1.5 hover:opacity-80"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          Add Interaction
        </button>
      </div>

      {loading ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-[15px] font-bold text-[#181c23]">
            No interactions yet
          </div>
          <div className="text-[13px] text-gray-500 mt-1">
            Add the first interaction to start the log
          </div>
        </div>
      ) : (
        <div className="relative pl-14">
          <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-[#ebedf8]" />
          <div className="flex flex-col gap-6">
            {items.map((it) => {
              const meta = TYPE_META[it.type] ?? TYPE_META.note
              const tags = it.tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
              return (
                <div key={it.id} className="relative">
                  <div
                    className="absolute -left-14 top-0 w-10 h-10 rounded-none flex items-center justify-center"
                    style={{ background: meta.bg, color: meta.fg }}
                  >
                    {meta.icon}
                  </div>
                  <div className="bg-[#f1f3fe] rounded-none p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-bold text-[16px] text-[#181c23]">
                        {it.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold whitespace-nowrap">
                        {fmtDate(it.date)}
                      </div>
                    </div>
                    <div
                      className="text-[14px] text-[#5b4137] mt-2"
                      style={{ lineHeight: 1.6 }}
                    >
                      {it.body}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 bg-white rounded-none text-[10px] font-bold text-[#5b4137]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {adding && (
        <AddModal
          leadId={leadId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            load()
          }}
        />
      )}
    </section>
  )
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-none bg-[#f1f3fe] animate-pulse" />
      ))}
    </div>
  )
}

function AddModal({
  leadId,
  onClose,
  onSaved,
}: {
  leadId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<InteractionType>('call')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [date, setDate] = useState(todayISO())
  const [createdBy, setCreatedBy] = useState('You')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, type, title, body, tags, date, createdBy }),
      })
      if (!res.ok) throw new Error('save failed')
      onSaved()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,30,0.45)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white w-full max-w-md p-7"
        style={{ borderRadius: 0 }}
      >
        <h3
          className="font-display font-bold text-[20px] mb-5 text-[#181c23]"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          New Interaction
        </h3>
        <div className="flex flex-col gap-3">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as InteractionType)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="video_call">Video Call</option>
              <option value="note">Note</option>
            </select>
          </Field>
          <Field label="Title">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
          <Field label="Body">
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px] resize-none"
            />
          </Field>
          <Field label="Tags">
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="#Pricing, #Contract"
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
          <Field label="Created by">
            <input
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-bold text-gray-600 rounded-none hover:bg-[#f1f3fe]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="brand-gradient text-white text-[13px] font-bold px-5 py-2 rounded-none disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-gray-600 mb-1">
        {label}
      </div>
      {children}
    </label>
  )
}

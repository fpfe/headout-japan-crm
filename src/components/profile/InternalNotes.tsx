'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Note } from '@/types'

function fmt(d: string): string {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function InternalNotes({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [reminderText, setReminderText] = useState('')
  const [reminderDate, setReminderDate] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notes?leadId=${leadId}`, {
        cache: 'no-store',
      })
      if (res.ok) setNotes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    load()
  }, [load])

  async function saveQuick() {
    if (!draft.trim()) return
    setBusy(true)
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          content: draft,
          isReminder: 'false',
          reminderDate: '',
          createdAt: new Date().toISOString(),
        }),
      })
      setDraft('')
      load()
    } finally {
      setBusy(false)
    }
  }

  async function saveReminder() {
    if (!reminderText.trim() || !reminderDate) return
    setBusy(true)
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          content: reminderText,
          isReminder: 'true',
          reminderDate,
          createdAt: new Date().toISOString(),
        }),
      })
      setReminderText('')
      setReminderDate('')
      setShowReminder(false)
      load()
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <section
      className="bg-white p-8"
      style={{
        borderRadius: 0,
        border: '1px solid rgba(228,190,177,0.05)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2
          className="font-display font-bold text-[20px] text-[#181c23]"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          Internal Notes
        </h2>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a83900" strokeWidth="2">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        {loading ? (
          <div className="h-16 rounded-none bg-[#f1f3fe] animate-pulse" />
        ) : notes.length === 0 ? (
          <div className="text-[12px] text-gray-500 text-center py-3">
            No notes yet
          </div>
        ) : (
          notes.map((n) => {
            const isReminder = n.isReminder === 'true'
            return (
              <div
                key={n.id}
                className="group relative rounded-none p-3"
                style={{
                  background: isReminder
                    ? 'rgba(168,57,0,0.05)'
                    : 'rgba(104,85,136,0.05)',
                  borderLeft: `4px solid ${isReminder ? '#a83900' : '#685588'}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => remove(n.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
                {isReminder ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase text-[#a83900]">
                        Reminder
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {fmt(n.reminderDate)}
                      </span>
                    </div>
                    <div className="text-[13px] font-semibold text-[#181c23]">
                      {n.content}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[13px] italic text-gray-600">
                      {n.content}
                    </div>
                    <div className="text-[10px] font-bold text-gray-500 text-right mt-1">
                      {fmt(n.createdAt)}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      <div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              saveQuick()
            }
          }}
          placeholder="Type a quick note..."
          className="w-full bg-[#f1f3fe] rounded-none p-4 text-[13px] resize-none outline-none"
          style={{ height: 96 }}
        />
        {focused && draft.trim() && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={saveQuick}
              disabled={busy}
              className="text-[12px] font-bold text-white px-4 py-1.5 rounded-none"
              style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
            >
              Save
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowReminder((v) => !v)}
          className="text-[11px] text-[#a83900] font-bold mt-2 hover:opacity-80"
        >
          {showReminder ? '− Hide reminder' : '+ Set reminder'}
        </button>
        {showReminder && (
          <div className="mt-2 flex flex-col gap-2">
            <input
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="Reminder text"
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="flex-1 bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
              />
              <button
                type="button"
                onClick={saveReminder}
                disabled={busy}
                className="text-[12px] font-bold text-white px-4 py-1.5 rounded-none"
                style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

'use client'

import { useState, useEffect } from 'react'
import type { Member } from '@/types'

type Mode = 'create' | 'edit'

type Props = {
  open: boolean
  mode?: Mode
  initial?: Member | null
  onClose: () => void
  onCreated: (member: Member) => void
}

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  businessTitle: '',
  slackId: '',
}

const inputStyle: React.CSSProperties = {
  background: '#ebedf8',
  border: 'none',
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
}

export default function MemberFormModal({
  open,
  mode = 'create',
  initial,
  onClose,
  onCreated,
}: Props) {
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (mode === 'edit' && initial) {
      setForm({
        name: initial.name,
        email: initial.email,
        phone: initial.phone,
        businessTitle: initial.businessTitle,
        slackId: initial.slackId,
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, mode, initial])

  if (!open) return null

  function update<K extends keyof typeof EMPTY>(
    key: K,
    value: (typeof EMPTY)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const url =
        mode === 'edit' && initial
          ? `/api/members/${initial.id}`
          : '/api/members'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      const member = (await res.json()) as Member
      onCreated(member)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(15,15,30,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none w-full max-w-[480px] p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
            Team
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[#181c23] mt-1">
            {mode === 'edit' ? 'Edit Member' : 'Register New Member'}
          </h2>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Name">
            <input
              required
              autoFocus
              style={inputStyle}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              style={inputStyle}
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </Field>
          <Field label="Business Title">
            <input
              style={inputStyle}
              placeholder="e.g. Account Executive"
              value={form.businessTitle}
              onChange={(e) => update('businessTitle', e.target.value)}
            />
          </Field>
          <Field label="Slack ID">
            <input
              style={inputStyle}
              placeholder="@username or U01234ABCDE"
              value={form.slackId}
              onChange={(e) => update('slackId', e.target.value)}
            />
          </Field>

          {error && (
            <div className="text-[12px] text-red-600 bg-red-50 p-2 rounded-none">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-[#a83900]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="brand-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-none disabled:opacity-60"
            >
              {submitting
                ? 'Saving…'
                : mode === 'edit'
                  ? 'Save Changes'
                  : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  )
}

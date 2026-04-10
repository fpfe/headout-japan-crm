'use client'

import { useEffect, useState } from 'react'
import {
  LEAD_STATUSES,
  DEFAULT_SERVICE_TYPES,
  type Lead,
  type LeadStatus,
  type Member,
} from '@/types'
import MemberFormModal from '@/components/members/MemberFormModal'

type Mode = 'create' | 'edit'

type Props = {
  open: boolean
  mode: Mode
  initial?: Lead | null
  onClose: () => void
  onSaved: (lead: Lead) => void
}

const EMPTY_FORM = {
  contactName: '',
  email: '',
  phone: '',
  company: '',
  serviceType: 'Tea Ceremony',
  leadSource: '',
  region: '',
  assignedTo: '',
  status: 'New' as LeadStatus,
  notes: '',
  dealValue: '',
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

const ADD_NEW_VALUE = '__add_new__'
const ADD_NEW_MEMBER_VALUE = '__add_new_member__'

export default function LeadFormModal({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [serviceTypes, setServiceTypes] = useState<string[]>(DEFAULT_SERVICE_TYPES)
  const [members, setMembers] = useState<Member[]>([])
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/service-types')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length) setServiceTypes(data)
      })
      .catch(() => {})
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMembers(data)
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      setForm({
        contactName: initial.contactName,
        email: initial.email,
        phone: initial.phone,
        company: initial.company,
        serviceType: initial.serviceType,
        leadSource: initial.leadSource,
        region: initial.region,
        assignedTo: initial.assignedTo,
        status: initial.status,
        notes: initial.notes,
        dealValue: initial.dealValue ?? '',
      })
    } else if (initial) {
      setForm({ ...EMPTY_FORM, ...initial } as typeof EMPTY_FORM)
    } else {
      setForm(EMPTY_FORM)
    }
    setError(null)
  }, [open, mode, initial])

  if (!open) return null

  function update<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleServiceTypeChange(value: string) {
    if (value !== ADD_NEW_VALUE) {
      update('serviceType', value)
      return
    }
    const name = window.prompt('New service type name:')?.trim()
    if (!name) return
    try {
      const res = await fetch('/api/service-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      // refresh list and select the new one
      const refreshed = await fetch('/api/service-types').then((r) => r.json())
      if (Array.isArray(refreshed)) setServiceTypes(refreshed)
      update('serviceType', name)
    } catch (err) {
      alert((err as Error).message)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const url =
        mode === 'edit' && initial
          ? `/api/leads/${initial.id}`
          : '/api/leads'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      const lead = (await res.json()) as Lead
      onSaved(lead)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,15,30,0.4)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5">
          <div className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#a83900]">
            Merchant Pipeline
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[#181c23] mt-1">
            {mode === 'edit' ? 'Edit Lead' : 'Add New Lead'}
          </h2>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name">
              <input
                required
                style={inputStyle}
                value={form.contactName}
                onChange={(e) => update('contactName', e.target.value)}
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
            <Field label="Company name">
              <input
                required
                style={inputStyle}
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
              />
            </Field>
            <Field label="Service type">
              <select
                style={inputStyle}
                value={
                  serviceTypes.includes(form.serviceType)
                    ? form.serviceType
                    : ''
                }
                onChange={(e) => handleServiceTypeChange(e.target.value)}
              >
                {!serviceTypes.includes(form.serviceType) && (
                  <option value="" disabled>
                    Select a service type
                  </option>
                )}
                {serviceTypes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value={ADD_NEW_VALUE}>+ Add new type…</option>
              </select>
            </Field>
            <Field label="Lead source">
              <input
                style={inputStyle}
                placeholder="e.g. Direct Website"
                value={form.leadSource}
                onChange={(e) => update('leadSource', e.target.value)}
              />
            </Field>
            <Field label="Region">
              <input
                style={inputStyle}
                placeholder="Tokyo / Kyoto / Osaka"
                value={form.region}
                onChange={(e) => update('region', e.target.value)}
              />
            </Field>
            <Field label="Assigned to">
              <select
                style={inputStyle}
                value={
                  form.assignedTo &&
                  members.some((m) => m.name === form.assignedTo)
                    ? form.assignedTo
                    : form.assignedTo
                      ? '__legacy__'
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value
                  if (v === ADD_NEW_MEMBER_VALUE) {
                    setMemberModalOpen(true)
                    return
                  }
                  if (v === '__legacy__') return
                  update('assignedTo', v)
                }}
              >
                <option value="">Unassigned</option>
                {form.assignedTo &&
                  !members.some((m) => m.name === form.assignedTo) && (
                    <option value="__legacy__">
                      {form.assignedTo} (legacy)
                    </option>
                  )}
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                    {m.businessTitle ? ` — ${m.businessTitle}` : ''}
                  </option>
                ))}
                <option value={ADD_NEW_MEMBER_VALUE}>
                  + Add new member…
                </option>
              </select>
            </Field>
            <Field label="Deal value (¥)">
              <input
                type="number"
                style={inputStyle}
                placeholder="e.g. 3500000"
                value={form.dealValue}
                onChange={(e) => update('dealValue', e.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                style={inputStyle}
                value={form.status}
                onChange={(e) => update('status', e.target.value as LeadStatus)}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
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
                  : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>

      <MemberFormModal
        open={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        onCreated={(m) => {
          setMembers((prev) => [...prev, m])
          update('assignedTo', m.name)
        }}
      />
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
      <span className="text-[12px] font-semibold text-gray-600">
        {label}
      </span>
      {children}
    </label>
  )
}

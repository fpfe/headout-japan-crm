'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Document } from '@/types'

const FILE_TYPES = ['pdf', 'docx', 'xlsx', 'other'] as const

function fileMeta(type: string) {
  switch (type) {
    case 'pdf':
      return { bg: 'rgba(168,57,0,0.1)', fg: '#a83900', label: 'PDF' }
    case 'docx':
      return { bg: 'rgba(104,85,136,0.1)', fg: '#685588', label: 'DOC' }
    case 'xlsx':
      return { bg: 'rgba(34,139,34,0.1)', fg: '#1e7a1e', label: 'XLS' }
    default:
      return { bg: '#ebedf8', fg: '#5b4137', label: 'FILE' }
  }
}

function timeAgo(s: string): string {
  if (!s) return ''
  const t = Date.parse(s)
  if (Number.isNaN(t)) return s
  const days = Math.floor((Date.now() - t) / 86400_000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export default function DocumentStorage({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents?leadId=${leadId}`, {
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

  async function remove(id: string) {
    if (!confirm('Delete this document?')) return
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
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
      <div className="flex items-center justify-between mb-6">
        <h2
          className="font-display font-bold text-[24px] text-[#181c23]"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          Document Storage
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-[#a83900] hover:opacity-80 p-2"
          title="Upload"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-none bg-[#f1f3fe] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-gray-500">
          No documents yet
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map((d) => {
            const m = fileMeta(d.fileType)
            return (
              <div
                key={d.id}
                className="group bg-[#f1f3fe] rounded-none p-4 border border-transparent hover:border-[rgba(168,57,0,0.2)] transition"
              >
                <div
                  className="w-12 h-12 rounded-none flex items-center justify-center text-[10px] font-bold mb-3"
                  style={{ background: m.bg, color: m.fg }}
                >
                  {m.label}
                </div>
                <div className="text-[13px] font-bold text-[#181c23] truncate">
                  {d.fileName}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Added {timeAgo(d.uploadedAt)} • {d.fileSize}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-3 mt-2 text-[11px] font-bold">
                  {d.driveFileId ? (
                    <a
                      href={`https://drive.google.com/file/d/${d.driveFileId}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#a83900]"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-gray-400">No file</span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(d.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adding && (
        <AddDocModal
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

function AddDocModal({
  leadId,
  onClose,
  onSaved,
}: {
  leadId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState<(typeof FILE_TYPES)[number]>('pdf')
  const [fileSize, setFileSize] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fileName.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          fileName,
          fileType,
          fileSize,
          driveFileId: '',
          uploadedAt: new Date().toISOString(),
        }),
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
          className="font-display font-bold text-[20px] mb-2 text-[#181c23]"
          style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}
        >
          Add Document
        </h3>
        <p className="text-[11px] text-gray-500 mb-5">
          Phase 2 saves metadata only. Drive upload comes later.
        </p>
        <div className="flex flex-col gap-3">
          <label className="block">
            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">
              File Name
            </div>
            <input
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </label>
          <label className="block">
            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">
              File Type
            </div>
            <select
              value={fileType}
              onChange={(e) =>
                setFileType(e.target.value as (typeof FILE_TYPES)[number])
              }
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            >
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="xlsx">Excel</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-1">
              File Size
            </div>
            <input
              value={fileSize}
              onChange={(e) => setFileSize(e.target.value)}
              placeholder="2.4 MB"
              className="w-full bg-[#f1f3fe] rounded-none px-3 py-2 text-[13px]"
            />
          </label>
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
            className="text-white text-[13px] font-bold px-5 py-2 rounded-none disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #a83900 0%, #ff5a00 100%)' }}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

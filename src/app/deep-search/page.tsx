'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'headout_api_key'
const LS_CURRENT = 'deep_search_current'
const LS_COUNTERS = 'deep_search_counters'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

const SYSTEM_PROMPT = `Return ONLY a valid JSON object matching the schema below. No markdown, no prose, no code fences. If a field is unknown, use null. Do not invent data.

You are a Headout Japan partnership analyst.

INPUT: a Klook / GetYourGuide / Viator activity title.

TASKS (use web search):
1. Identify the REAL operating company (not the OTA listing). If jointly operated, list all parties with their roles.
2. For each company, find: legal_name_en, legal_name_ja, homepage, hq_address, phone, inquiry_form_url, linkedin_url, likely_decision_maker_role (e.g. "BD / Licensing").
3. Reputation signals: rating (e.g. "4.6 (12k reviews)"), other OTAs they're listed on, recent news (last 12 months, 1-2 sentences).
4. Score partnership attractiveness 0-100 based on: demand, price premium, OTA availability, negotiation leverage, fit with Headout's bundle strategy. Include a 1-sentence score_rationale.
5. next_action: 1-2 sentences, blunt.

SCHEMA:
{
  "activity_title": string,
  "companies": [
    {
      "legal_name_en": string,
      "legal_name_ja": string | null,
      "role": string,
      "homepage": string | null,
      "hq_address": string | null,
      "phone": string | null,
      "inquiry_form_url": string | null,
      "linkedin_url": string | null,
      "likely_decision_maker_role": string | null
    }
  ],
  "reputation": {
    "rating": string | null,
    "listed_on_otas": string[],
    "recent_news": string | null
  },
  "score": number,
  "score_rationale": string,
  "next_action": string
}

TONE: blunt, partnership-analyst. No fluff. No emojis.`

type Company = {
  legal_name_en: string
  legal_name_ja: string | null
  role: string
  homepage: string | null
  hq_address: string | null
  phone: string | null
  inquiry_form_url: string | null
  linkedin_url: string | null
  likely_decision_maker_role: string | null
}

type HistoryRow = {
  id: string
  created_at: string
  query: string
  activity_title: string | null
  score: number | null
  company: string | null
  saved_as_lead_id: string | null
}

type Brief = {
  activity_title: string
  companies: Company[]
  reputation: {
    rating: string | null
    listed_on_otas: string[]
    recent_news: string | null
  }
  score: number
  score_rationale: string
  next_action: string
}

function scoreColor100(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function deriveRegion(addr: string | null): string {
  if (!addr) return ''
  const a = addr.toLowerCase()
  if (a.includes('tokyo')) return 'Tokyo'
  if (a.includes('osaka')) return 'Osaka'
  if (a.includes('kyoto')) return 'Kyoto'
  return ''
}

function buildNotes(b: Brief): string {
  const c = b.companies[0]
  const parts: string[] = []
  if (c.homepage) parts.push(`Homepage: ${c.homepage}`)
  if (c.inquiry_form_url) parts.push(`Inquiry form: ${c.inquiry_form_url}`)
  if (c.linkedin_url) parts.push(`LinkedIn: ${c.linkedin_url}`)
  parts.push(`Score: ${b.score}/100 — ${b.score_rationale}`)
  if (b.companies.length > 1) {
    const co = b.companies
      .slice(1)
      .map((x) => `${x.legal_name_en} (${x.role})`)
      .join('; ')
    parts.push(`Co-operators: ${co}`)
  }
  if (b.reputation.recent_news)
    parts.push(`Recent news: ${b.reputation.recent_news}`)
  parts.push(`Next action: ${b.next_action}`)
  return parts.join('\n')
}

function formatBriefMarkdown(b: Brief): string {
  const lines: string[] = []
  lines.push(`# ${b.activity_title}`)
  lines.push('')
  lines.push(`**Score:** ${b.score}/100 — ${b.score_rationale}`)
  lines.push('')
  lines.push('## Operating companies')
  b.companies.forEach((c) => {
    lines.push('')
    lines.push(
      `### ${c.legal_name_en}${c.legal_name_ja ? ` (${c.legal_name_ja})` : ''}`
    )
    lines.push(`- Role: ${c.role}`)
    if (c.homepage) lines.push(`- Homepage: ${c.homepage}`)
    if (c.hq_address) lines.push(`- HQ: ${c.hq_address}`)
    if (c.phone) lines.push(`- Phone: ${c.phone}`)
    if (c.inquiry_form_url) lines.push(`- Inquiry form: ${c.inquiry_form_url}`)
    if (c.linkedin_url) lines.push(`- LinkedIn: ${c.linkedin_url}`)
    if (c.likely_decision_maker_role)
      lines.push(`- Likely decision-maker: ${c.likely_decision_maker_role}`)
  })
  lines.push('')
  lines.push('## Reputation')
  if (b.reputation.rating) lines.push(`- Rating: ${b.reputation.rating}`)
  if (b.reputation.listed_on_otas?.length)
    lines.push(`- Listed on: ${b.reputation.listed_on_otas.join(', ')}`)
  if (b.reputation.recent_news)
    lines.push(`- Recent news: ${b.reputation.recent_news}`)
  lines.push('')
  lines.push('## Next action')
  lines.push(b.next_action)
  return lines.join('\n')
}

function parseBrief(raw: string): Brief {
  let text = raw.trim()
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const m = text.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : text) as Brief
}

export default function DeepSearchPage() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawOnError, setRawOnError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [searchedToday, setSearchedToday] = useState(0)
  const [savedAsLeads, setSavedAsLeads] = useState(0)
  const [dots, setDots] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])

  useEffect(() => {
    try {
      const cur = window.localStorage.getItem(LS_CURRENT)
      if (cur) {
        const { query: q, mode: m, brief: b, historyId: hid } = JSON.parse(cur)
        if (typeof q === 'string') setQuery(q)
        if (m === 'single' || m === 'bulk') setMode(m)
        if (b) setBrief(b)
        if (typeof hid === 'string') setCurrentHistoryId(hid)
      }
      const ct = window.localStorage.getItem(LS_COUNTERS)
      if (ct) {
        const parsed = JSON.parse(ct)
        if (parsed.date === todayKey()) {
          setSearchedToday(parsed.searchedToday ?? 0)
          setSavedAsLeads(parsed.savedAsLeads ?? 0)
        }
      }
    } catch {
      /* ignore corrupt LS */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (brief) {
      window.localStorage.setItem(
        LS_CURRENT,
        JSON.stringify({ query, mode, brief, historyId: currentHistoryId })
      )
    }
  }, [hydrated, brief, query, mode, currentHistoryId])

  useEffect(() => {
    fetch('/api/deep-search-history')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setHistory(Array.isArray(rows) ? rows : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(
      LS_COUNTERS,
      JSON.stringify({
        date: todayKey(),
        searchedToday,
        savedAsLeads,
      })
    )
  }, [hydrated, searchedToday, savedAsLeads])

  useEffect(() => {
    if (!loading) return
    const id = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 400)
    return () => window.clearInterval(id)
  }, [loading])

  const onSearch = async () => {
    setError(null)
    setRawOnError(null)
    setInfo(null)
    setBrief(null)
    setCurrentHistoryId(null)
    window.localStorage.removeItem(LS_CURRENT)

    if (mode === 'bulk') {
      setInfo('Bulk mode coming in next step')
      return
    }

    const apiKey = window.localStorage.getItem(LS_KEY) ?? ''
    if (!apiKey) {
      setInfo('No Anthropic API key set. Open Settings in Lead Finder to add one.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: query }],
        }),
      })

      if (!res.ok) {
        const t = await res.text()
        throw new Error(`API error ${res.status}: ${t.slice(0, 240)}`)
      }
      const data = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>
      }
      const text = (data.content ?? [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('\n')

      try {
        const parsed = parseBrief(text)
        setBrief(parsed)
        setSearchedToday((n) => n + 1)
        try {
          const r = await fetch('/api/deep-search-history', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ query, brief: parsed }),
          })
          if (r.ok) {
            const row = await r.json()
            setCurrentHistoryId(row.id)
            setHistory((h) => [
              {
                id: row.id,
                created_at: row.created_at,
                query: row.query,
                activity_title: parsed.activity_title,
                score: parsed.score,
                company: parsed.companies?.[0]?.legal_name_en ?? null,
                saved_as_lead_id: null,
              },
              ...h,
            ])
          }
        } catch (e) {
          console.warn('history POST failed', e)
        }
      } catch {
        setError('Could not parse JSON from response.')
        setRawOnError(text)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (id: string) => {
    try {
      const r = await fetch(`/api/deep-search-history/${id}`)
      if (!r.ok) return
      const row = await r.json()
      setError(null)
      setRawOnError(null)
      setInfo(null)
      setBrief(row.brief as Brief)
      setQuery(row.query ?? '')
      setCurrentHistoryId(row.id)
    } catch (e) {
      console.warn('history GET failed', e)
    }
  }

  const onLeadLinked = (historyId: string, leadId: string) => {
    setHistory((h) =>
      h.map((r) =>
        r.id === historyId ? { ...r, saved_as_lead_id: leadId } : r
      )
    )
  }

  return (
    <div className="flex gap-6">
      {/* LEFT PANEL */}
      <aside className="w-72 shrink-0">
        <div className="rounded-none bg-white border border-gray-200 p-5">
          <p className="text-[10px] tracking-[0.18em] font-semibold text-gray-500 mb-2">
            DEEP SEARCH
          </p>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste an activity title, e.g. teamLab Borderless Tickets: MORI Building DIGITAL ART MUSEUM, Tokyo"
            rows={5}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-none bg-gray-50 focus:bg-white focus:border-[#a83900] outline-none transition-colors resize-none"
          />

          <div className="flex gap-4 mt-3 mb-3 text-xs text-gray-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="single"
                checked={mode === 'single'}
                onChange={() => setMode('single')}
                className="accent-[#a83900]"
              />
              Single
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="bulk"
                checked={mode === 'bulk'}
                onChange={() => setMode('bulk')}
                className="accent-[#a83900]"
              />
              Bulk (one per line)
            </label>
          </div>

          <button
            onClick={onSearch}
            disabled={!query.trim() || loading}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#a83900] rounded-none hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>

          {/* Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-[10px] tracking-[0.18em] font-semibold text-gray-500 mb-2">
              STATS
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Searched today</span>
                <span className="font-semibold">{searchedToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Saved as leads</span>
                <span className="font-semibold">{savedAsLeads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Avg confidence</span>
                <span className="font-semibold">—</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL */}
      <main className="flex-1 min-w-0">
        {loading ? (
          <div className="rounded-none bg-white border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">
              Partner Brief
            </h2>
            <div className="text-sm text-gray-600 py-10 text-center">
              Researching{dots}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-none bg-white border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">
              Partner Brief
            </h2>
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-none">
              {error}
            </div>
            {rawOnError && (
              <pre className="mt-3 p-3 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-none overflow-auto max-h-96 whitespace-pre-wrap">
                {rawOnError}
              </pre>
            )}
          </div>
        ) : info ? (
          <div className="rounded-none bg-white border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">
              Partner Brief
            </h2>
            <div className="text-sm text-gray-600 py-10 text-center">
              {info}
            </div>
          </div>
        ) : brief ? (
          <BriefCard
            brief={brief}
            historyId={currentHistoryId}
            onSaved={() => setSavedAsLeads((n) => n + 1)}
            onLeadLinked={onLeadLinked}
          />
        ) : (
          <div className="rounded-none bg-white border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">
              Partner Brief
            </h2>
            <div className="text-sm text-gray-500 py-10 text-center">
              No search yet. Paste an activity title on the left to begin.
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="rounded-none bg-white border border-gray-200 p-5 mt-4">
            <p className="text-[10px] tracking-[0.18em] font-semibold text-gray-500 mb-3">
              RECENT RESEARCH
            </p>
            <div className="divide-y divide-gray-100">
              {history.slice(0, 10).map((h) => (
                <button
                  key={h.id}
                  onClick={() => loadHistory(h.id)}
                  className="w-full text-left py-2 grid grid-cols-[70px_1fr_180px_40px_60px] gap-3 items-center text-xs hover:bg-gray-50 transition-colors"
                >
                  <span className="text-gray-500">{formatShortDate(h.created_at)}</span>
                  <span className="text-gray-900 truncate">{h.query}</span>
                  <span className="text-gray-600 truncate">{h.company ?? '—'}</span>
                  <span className="font-semibold text-gray-900">{h.score ?? '—'}</span>
                  <span className={h.saved_as_lead_id ? 'text-green-700 font-semibold' : 'text-gray-400'}>
                    {h.saved_as_lead_id ? 'Saved' : '—'}
                  </span>
                </button>
              ))}
            </div>
            {history.length > 10 && (
              <div className="mt-3">
                <a href="#" className="text-xs text-[#a83900] hover:underline">
                  View all
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function BriefCard({
  brief,
  historyId,
  onSaved,
  onLeadLinked,
}: {
  brief: Brief
  historyId: string | null
  onSaved: () => void
  onLeadLinked: (historyId: string, leadId: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedThisResult, setSavedThisResult] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setSaving(false)
    setSavedThisResult(false)
    setJustSaved(false)
    setSaveError(null)
  }, [brief])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatBriefMarkdown(brief))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard permission denied; silently ignore */
    }
  }

  const onSave = async () => {
    const primary = brief.companies[0]
    if (!primary) return
    setSaveError(null)
    setSaving(true)
    try {
      const payload = {
        contactName: '',
        email: '',
        phone: primary.phone ?? '',
        company: primary.legal_name_en,
        serviceType: primary.role,
        leadSource: 'Deep Search',
        assignedTo: 'Seungjun Ahn',
        status: 'New',
        region: deriveRegion(primary.hq_address),
        notes: buildNotes(brief),
        dealValue: '',
      }
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(`Request failed (${res.status}): ${t.slice(0, 180)}`)
      }
      const createdLead = (await res.json()) as { id?: string }
      setSavedThisResult(true)
      setJustSaved(true)
      onSaved()
      window.setTimeout(() => setJustSaved(false), 1500)
      if (historyId && createdLead.id) {
        const leadId = createdLead.id
        fetch(`/api/deep-search-history/${historyId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ saved_as_lead_id: leadId }),
        })
          .then((r) => {
            if (r.ok) onLeadLinked(historyId, leadId)
          })
          .catch((e) => console.warn('history PATCH failed', e))
      }
    } catch (err) {
      setSaveError((err as Error).message || 'Failed to save lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-none bg-white border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <h1 className="flex-1 text-2xl font-bold text-gray-900">
          {brief.activity_title}
        </h1>
        <span
          className={`px-3 h-9 min-w-[2.5rem] rounded-none flex items-center justify-center text-white font-bold text-sm ${scoreColor100(
            brief.score
          )}`}
        >
          {brief.score}
        </span>
      </div>
      {brief.score_rationale && (
        <p className="text-xs text-gray-500 mt-2">{brief.score_rationale}</p>
      )}

      <Section title="Operating companies">
        <div className="space-y-3">
          {brief.companies.map((c, i) => (
            <div key={i} className="border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">
                    {c.legal_name_en}
                  </div>
                  {c.legal_name_ja && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.legal_name_ja}
                    </div>
                  )}
                </div>
                <span className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600 whitespace-nowrap">
                  {c.role}
                </span>
              </div>
              <div className="mt-3 text-sm text-gray-800 space-y-1">
                {c.homepage && (
                  <div>
                    <a
                      href={c.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a83900] hover:underline"
                    >
                      {c.homepage}
                    </a>
                  </div>
                )}
                {c.hq_address && <div>{c.hq_address}</div>}
                {c.phone && <div>{c.phone}</div>}
                {c.inquiry_form_url && (
                  <div>
                    <a
                      href={c.inquiry_form_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a83900] hover:underline"
                    >
                      Inquiry form
                    </a>
                  </div>
                )}
                {c.linkedin_url && (
                  <div>
                    <a
                      href={c.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#a83900] hover:underline"
                    >
                      LinkedIn
                    </a>
                  </div>
                )}
              </div>
              {c.likely_decision_maker_role && (
                <div className="mt-3">
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-none bg-[#a83900]/10 text-[#a83900]">
                    {c.likely_decision_maker_role}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Reputation">
        {brief.reputation.rating && (
          <div className="mb-2">{brief.reputation.rating}</div>
        )}
        {brief.reputation.listed_on_otas?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {brief.reputation.listed_on_otas.map((o) => (
              <span
                key={o}
                className="px-2 py-0.5 text-[11px] rounded-none bg-gray-100 text-gray-600"
              >
                {o}
              </span>
            ))}
          </div>
        )}
        {brief.reputation.recent_news && <p>{brief.reputation.recent_news}</p>}
      </Section>

      <Section title="Next action">
        <div className="bg-[#fff5ef] border border-[#fde4d3] p-4 text-sm text-gray-800">
          {brief.next_action}
        </div>
      </Section>

      {saveError && (
        <div className="mt-4 p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-none">
          {saveError}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={saving || savedThisResult}
          className="px-4 py-2 text-sm font-semibold text-white bg-[#a83900] rounded-none hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          {saving
            ? 'Saving...'
            : justSaved
            ? 'Saved ✓'
            : savedThisResult
            ? 'Saved'
            : 'Save as Lead'}
        </button>
        <button
          onClick={onCopy}
          className="px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500 transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy Brief'}
        </button>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-5">
      <h3 className="text-[10px] tracking-[0.18em] font-semibold text-gray-500 mb-1.5">
        {title.toUpperCase()}
      </h3>
      <div className="text-sm text-gray-800 leading-relaxed">{children}</div>
    </section>
  )
}

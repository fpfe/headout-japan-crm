'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

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

// Per-platform verdict: yes/no plus the activity Gemini matched on (evidence).
type PlatformVerdict = {
  listed: string | boolean | null
  matched_activity?: string | null
}

type CompetitorListings = {
  activities_found?: string[]
  kkday?: PlatformVerdict | string | boolean | null
  klook?: PlatformVerdict | string | boolean | null
  gyg?: PlatformVerdict | string | boolean | null
  viator?: PlatformVerdict | string | boolean | null
  airbnb?: PlatformVerdict | string | boolean | null
}

function isListedRaw(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (!s) return false
    return s === 'yes' || s === 'true' || s === 'listed'
  }
  return false
}

/** Read either an old-style scalar or new-style {listed, matched_activity} object. */
function readPlatform(v: unknown): { listed: boolean; matched: string } {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const obj = v as PlatformVerdict
    return {
      listed: isListedRaw(obj.listed),
      matched: typeof obj.matched_activity === 'string' ? obj.matched_activity.trim() : '',
    }
  }
  return { listed: isListedRaw(v), matched: '' }
}

type Brief = {
  activity_title: string
  companies: Company[]
  reputation: {
    rating: string | null
    listed_on_otas: string[]
    recent_news: string | null
  }
  service_type?: string
  market_demand_tier?: number
  score: number
  score_rationale: string
  next_action: string
  competitor_listings?: CompetitorListings
}

const TIER_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Tier 1 — Highest demand', color: '#085041', bg: '#E1F5EE' },
  2: { label: 'Tier 2 — High demand', color: '#0C447C', bg: '#E6F1FB' },
  3: { label: 'Tier 3 — Moderate demand', color: '#633806', bg: '#FAEEDA' },
  4: { label: 'Tier 4 — Standard', color: '#5F5E5A', bg: '#F1EFE8' },
}

function scoreColor100(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

function scoreTextColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 70) return 'text-green-700'
  if (score >= 40) return 'text-amber-700'
  return 'text-red-700'
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
  if (c.legal_name_ja) parts.push(`JP: ${c.legal_name_ja}`)
  if (c.homepage) parts.push(`Web: ${c.homepage}`)
  if (c.hq_address) parts.push(`Address: ${c.hq_address}`)
  if (c.inquiry_form_url) parts.push(`Inquiry form: ${c.inquiry_form_url}`)
  if (c.linkedin_url) parts.push(`LinkedIn: ${c.linkedin_url}`)
  if (b.reputation.rating) parts.push(`Rating: ${b.reputation.rating}`)
  if (b.reputation.listed_on_otas?.length)
    parts.push(`Listed on: ${b.reputation.listed_on_otas.join(', ')}`)
  parts.push(`Score: ${b.score}/100 — ${b.score_rationale}`)
  if (b.service_type) parts.push(`Service type: ${b.service_type}`)
  if (b.market_demand_tier) parts.push(`Market demand: Tier ${b.market_demand_tier} (DBJ-JTBF 2025)`)
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

function buildTags(b: Brief): string {
  const tags: string[] = []
  if (b.service_type) tags.push(b.service_type)
  if (b.market_demand_tier) tags.push(`Tier ${b.market_demand_tier}`)
  if (b.score >= 70) tags.push('High Score')
  if (b.reputation.listed_on_otas?.length) {
    b.reputation.listed_on_otas.forEach((o) => tags.push(o))
  }
  return tags.join(',')
}

function formatBriefMarkdown(b: Brief): string {
  const lines: string[] = []
  lines.push(`# ${b.activity_title}`)
  lines.push('')
  lines.push(`**Score:** ${b.score}/100 — ${b.score_rationale}`)
  if (b.service_type) lines.push(`**Service type:** ${b.service_type}`)
  if (b.market_demand_tier) lines.push(`**Market demand:** Tier ${b.market_demand_tier} (DBJ-JTBF 2025 Survey)`)
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
  return (
    <Suspense fallback={<div className="text-sm text-gray-400 py-10 text-center">Loading...</div>}>
      <DeepSearchInner />
    </Suspense>
  )
}

function DeepSearchInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawOnError, setRawOnError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [searchedToday, setSearchedToday] = useState(0)
  const [savedAsLeads, setSavedAsLeads] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null)

  // Load brief from ?id= URL parameter (shareable link)
  useEffect(() => {
    const sharedId = searchParams.get('id')
    if (sharedId) {
      setLoading(true)
      fetch(`/api/deep-search-history/${sharedId}`)
        .then((r) => {
          if (!r.ok) throw new Error('Brief not found')
          return r.json()
        })
        .then((row) => {
          setBrief(row.brief as Brief)
          setQuery(row.query ?? '')
          setCurrentHistoryId(row.id)
        })
        .catch(() => {
          setError('Could not load shared brief. It may have been deleted.')
        })
        .finally(() => setLoading(false))
    }
  }, [searchParams])

  useEffect(() => {
    try {
      const cur = window.localStorage.getItem(LS_CURRENT)
      if (cur) {
        const { query: q, brief: b, historyId: hid } = JSON.parse(cur)
        if (typeof q === 'string') setQuery(q)
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

  // Update URL when currentHistoryId changes (shareable link)
  useEffect(() => {
    if (!hydrated) return
    if (currentHistoryId) {
      const url = `/deep-search?id=${currentHistoryId}`
      if (window.location.pathname + window.location.search !== url) {
        router.replace(url, { scroll: false })
      }
    } else if (window.location.search) {
      router.replace('/deep-search', { scroll: false })
    }
  }, [hydrated, currentHistoryId, router])

  useEffect(() => {
    if (!hydrated) return
    if (brief) {
      window.localStorage.setItem(
        LS_CURRENT,
        JSON.stringify({ query, brief, historyId: currentHistoryId })
      )
    }
  }, [hydrated, brief, query, currentHistoryId])

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

  const onSearch = async () => {
    setError(null)
    setRawOnError(null)
    setInfo(null)
    setBrief(null)
    setCurrentHistoryId(null)
    window.localStorage.removeItem(LS_CURRENT)

    setLoading(true)
    try {
      const res = await fetch('/api/deep-search/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error || `API error ${res.status}`)
      }
      const data = (await res.json()) as { text: string }
      const text = data.text

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
    setLoadingHistoryId(id)
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
    } finally {
      setLoadingHistoryId(null)
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

          <button
            onClick={onSearch}
            disabled={!query.trim() || loading}
            className="w-full mt-3 py-2.5 text-sm font-semibold text-white bg-[#a83900] rounded-none hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
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
            <div className="flex flex-col items-center justify-center py-10">
              <span className="text-sm text-gray-400">Searching</span>
              <span className="flex gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-[pulse_1.2s_ease-in-out_0s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-[pulse_1.2s_ease-in-out_0.2s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-[pulse_1.2s_ease-in-out_0.4s_infinite]" />
              </span>
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
              {history.slice(0, 10).map((h) => {
                const isActive = h.id === currentHistoryId
                const isLoading = loadingHistoryId === h.id
                return (
                  <button
                    key={h.id}
                    onClick={() => loadHistory(h.id)}
                    disabled={loadingHistoryId !== null}
                    className={`w-full text-left py-2 px-2 grid grid-cols-[70px_1fr_180px_40px_60px] gap-3 items-center text-xs transition-colors disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-[#a83900]/5 border-l-2 border-[#a83900]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-gray-500">{formatShortDate(h.created_at)}</span>
                    <span className="text-gray-900 truncate">{h.query}</span>
                    <span className="text-gray-600 truncate">{h.company ?? '—'}</span>
                    {isLoading ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-[#a83900] rounded-full animate-spin" />
                    ) : (
                      <span className={`font-semibold ${scoreTextColor(h.score)}`}>{h.score ?? '—'}</span>
                    )}
                    <span className={h.saved_as_lead_id ? 'text-green-700 font-semibold' : 'text-gray-400'}>
                      {h.saved_as_lead_id ? 'Saved' : '—'}
                    </span>
                  </button>
                )
              })}
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
  const [linkCopied, setLinkCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedThisResult, setSavedThisResult] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setSaving(false)
    setSavedThisResult(false)
    setJustSaved(false)
    setSaveError(null)
    setEnriching(false)
    setEnriched(false)
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

  const onCopyLink = async () => {
    if (!historyId) return
    try {
      const url = `${window.location.origin}/deep-search?id=${historyId}`
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 1500)
    } catch {
      /* clipboard permission denied */
    }
  }

  const [enriching, setEnriching] = useState(false)
  const [enriched, setEnriched] = useState(false)

  const onSave = async () => {
    const primary = brief.companies[0]
    if (!primary) return
    setSaveError(null)
    setSaving(true)
    try {
      const cl = brief.competitor_listings
      // Persist "yes :: <matched activity>" when listed, empty when not.
      // Any non-empty value is treated as listed by the UI.
      const cell = (raw: unknown): string => {
        const v = readPlatform(raw)
        if (!v.listed) return ''
        return v.matched ? `yes :: ${v.matched}` : 'yes'
      }
      const payload = {
        contactName: '',
        email: '',
        phone: primary.phone ?? '',
        company: primary.legal_name_en,
        serviceType: brief.service_type || primary.role,
        leadSource: 'Deep Search',
        assignedTo: 'Seungjun Ahn',
        status: 'New',
        region: deriveRegion(primary.hq_address),
        notes: buildNotes(brief),
        dealValue: '',
        tags: buildTags(brief),
        followUpDate: '',
        competitorKkday: cell(cl?.kkday),
        competitorKlook: cell(cl?.klook),
        competitorGyg: cell(cl?.gyg),
        competitorViator: cell(cl?.viator),
        competitorAirbnb: cell(cl?.airbnb),
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

      // Link to history
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

        // Auto-enrich: fetch additional contact details, social links, etc.
        setEnriching(true)
        try {
          const enrichRes = await fetch('/api/leads/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              company: primary.legal_name_en,
              region: deriveRegion(primary.hq_address),
              serviceType: brief.service_type || '',
              notes: brief.next_action,
            }),
          })
          if (enrichRes.ok) {
            const enrichData = await enrichRes.json()
            // Build enrichment updates
            const updates: Record<string, string> = {}

            // Contact info
            if (enrichData.keyContact?.name) updates.contactName = enrichData.keyContact.name
            if (enrichData.keyContact?.email) updates.email = enrichData.keyContact.email
            if (enrichData.keyContact?.phone && !primary.phone) updates.phone = enrichData.keyContact.phone

            // Enrich notes with social links and additional info
            const extraNotes: string[] = []
            if (enrichData.description) extraNotes.push(enrichData.description)
            if (enrichData.socialLinks?.instagram) extraNotes.push(`IG: ${enrichData.socialLinks.instagram}`)
            if (enrichData.socialLinks?.facebook) extraNotes.push(`FB: ${enrichData.socialLinks.facebook}`)
            if (enrichData.socialLinks?.tripadvisor) extraNotes.push(`TA: ${enrichData.socialLinks.tripadvisor}`)
            if (enrichData.socialLinks?.google_maps) extraNotes.push(`Maps: ${enrichData.socialLinks.google_maps}`)
            if (enrichData.notableFacts?.length) extraNotes.push(enrichData.notableFacts.join(' | '))
            if (extraNotes.length) {
              updates.notes = payload.notes + '\n' + extraNotes.join(' | ')
            }

            // Merge enrichment tags
            if (enrichData.suggestedTags?.length) {
              const existingTags = payload.tags ? payload.tags.split(',').map((t: string) => t.trim()) : []
              const newTags = enrichData.suggestedTags.filter((t: string) => !existingTags.includes(t))
              if (newTags.length) {
                updates.tags = [...existingTags, ...newTags].join(',')
              }
            }

            // Apply enrichment to the lead
            if (Object.keys(updates).length > 0) {
              await fetch(`/api/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
              })
            }
            setEnriched(true)
          }
        } catch (e) {
          console.warn('Auto-enrichment failed (non-blocking):', e)
        } finally {
          setEnriching(false)
        }
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
      {/* Market demand tier + service type badges */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {brief.market_demand_tier && TIER_LABELS[brief.market_demand_tier] && (
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-none"
            style={{
              background: TIER_LABELS[brief.market_demand_tier].bg,
              color: TIER_LABELS[brief.market_demand_tier].color,
            }}
          >
            {TIER_LABELS[brief.market_demand_tier].label}
            {' (+'}
            {brief.market_demand_tier === 1
              ? 20
              : brief.market_demand_tier === 2
                ? 15
                : brief.market_demand_tier === 3
                  ? 10
                  : 5}
            {')'}
          </span>
        )}
        {brief.service_type && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-none bg-gray-100 text-gray-600">
            {brief.service_type}
          </span>
        )}
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

      <Section title="Competitor listings">
        <CompetitorRow listings={brief.competitor_listings} />
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
            : enriching
            ? 'Enriching...'
            : justSaved
            ? 'Saved ✓'
            : savedThisResult && enriched
            ? 'Saved + Enriched'
            : savedThisResult
            ? 'Saved'
            : 'Save as Lead'}
        </button>
        {enriching && (
          <span className="text-[12px] text-gray-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#a83900]" style={{ fontSize: 14 }}>auto_awesome</span>
            Auto-enriching contact details...
          </span>
        )}
        <button
          onClick={onCopy}
          className="px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500 transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy Brief'}
        </button>
        {historyId && (
          <button
            onClick={onCopyLink}
            className="px-4 py-2 text-sm font-semibold text-gray-900 border border-gray-300 rounded-none hover:border-gray-500 transition-colors"
          >
            {linkCopied ? 'Link Copied ✓' : 'Copy Link'}
          </button>
        )}
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

const COMPETITOR_DISPLAY: { key: keyof CompetitorListings; label: string }[] = [
  { key: 'kkday', label: 'KKday' },
  { key: 'klook', label: 'Klook' },
  { key: 'gyg', label: 'GetYourGuide' },
  { key: 'viator', label: 'Viator' },
  { key: 'airbnb', label: 'Airbnb' },
]

function CompetitorRow({ listings }: { listings?: CompetitorListings }) {
  const activities = listings?.activities_found ?? []
  return (
    <div>
      {activities.length > 0 && (
        <div className="mb-2 text-[11px] text-gray-500">
          <span className="font-semibold uppercase tracking-wider text-gray-600">
            Activities found:
          </span>{' '}
          {activities.join(' · ')}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {COMPETITOR_DISPLAY.map(({ key, label }) => {
          const v = readPlatform(listings?.[key])
          if (v.listed) {
            return (
              <div
                key={key}
                title={v.matched ? `Matched: ${v.matched}` : `${label} — listed`}
                className="flex flex-col justify-between min-h-[78px] px-3 py-2.5 rounded-none bg-[#a83900] text-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-extrabold tracking-tight uppercase leading-tight">
                    {label}
                  </span>
                  <span
                    className="material-symbols-outlined text-white shrink-0"
                    style={{ fontSize: 16 }}
                  >
                    check_circle
                  </span>
                </div>
                <div className="mt-1">
                  <div className="text-[10px] uppercase font-semibold text-white/85 tracking-wider">
                    Listed
                  </div>
                  {v.matched && (
                    <div className="text-[10px] text-white/85 leading-snug mt-0.5 line-clamp-2">
                      {v.matched}
                    </div>
                  )}
                </div>
              </div>
            )
          }
          return (
            <div
              key={key}
              title={`${label} — not listed`}
              className="flex flex-col justify-between min-h-[78px] px-3 py-2.5 rounded-none bg-white border border-gray-300"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-bold tracking-tight uppercase leading-tight text-gray-400">
                  {label}
                </span>
                <span
                  className="material-symbols-outlined text-gray-300 shrink-0"
                  style={{ fontSize: 16 }}
                >
                  remove
                </span>
              </div>
              <div className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider mt-1">
                Not listed
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

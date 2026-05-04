'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NEWS_CATEGORIES, type NewsCategory } from '@/lib/news-sources'

type NewsItem = {
  id: string
  url: string
  title: string
  source: string
  sourceLang: 'en' | 'ja'
  publishedAt: string
  summary: string | null
  category: NewsCategory | null
  fetchedAt: string
  saved: { id: string; savedAt: string; isRead: boolean } | null
}

type Tab = 'All' | NewsCategory | 'Saved'

const TABS: Tab[] = ['All', ...NEWS_CATEGORIES, 'Saved']

const CATEGORY_BG: Record<NewsCategory, string> = {
  Tourism: '#E1F5EE',
  Inbound: '#E6F1FB',
  Hotel: '#FAEEDA',
  Airline: '#ECECF8',
  'Tour & Activity': '#FFE6E0',
  Other: '#F1EFE8',
}

const CATEGORY_FG: Record<NewsCategory, string> = {
  Tourism: '#085041',
  Inbound: '#0C447C',
  Hotel: '#633806',
  Airline: '#3F3F8E',
  'Tour & Activity': '#A83900',
  Other: '#5F5E5A',
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [tab, setTab] = useState<Tab>('All')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshNote, setRefreshNote] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)

  const load = useCallback(async (forSaved: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const url = forSaved ? '/api/news?saved=true&limit=200' : '/api/news?limit=120'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      const data = (await res.json()) as NewsItem[]
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(tab === 'Saved')
  }, [tab, load])

  async function onRefresh() {
    setRefreshing(true)
    setError(null)
    setRefreshNote(null)
    try {
      const res = await fetch('/api/news/fetch', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Fetch failed (${res.status})`)
      const inserted = body.inserted ?? 0
      const fetched = body.fetched ?? 0
      const skipped = body.skipped ?? 0
      setRefreshNote(
        `Pulled ${fetched} articles · ${inserted} new · ${skipped} already cached`
      )
      setLastRefreshed(new Date().toISOString())
      await load(tab === 'Saved')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRefreshing(false)
    }
  }

  async function toggleSave(item: NewsItem) {
    // Optimistic update
    const wasSaved = !!item.saved
    setItems((arr) =>
      arr.map((x) =>
        x.id === item.id
          ? {
              ...x,
              saved: wasSaved
                ? null
                : { id: 'pending', savedAt: new Date().toISOString(), isRead: false },
            }
          : x
      )
    )
    try {
      if (wasSaved) {
        const res = await fetch(`/api/news/save?newsItemId=${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error(await res.text())
      } else {
        const res = await fetch('/api/news/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ newsItemId: item.id }),
        })
        if (!res.ok) throw new Error(await res.text())
      }
      // Refresh just this item from server so saved.id matches DB
      if (tab === 'Saved') await load(true)
    } catch (e) {
      // Revert on failure
      setItems((arr) =>
        arr.map((x) => (x.id === item.id ? { ...x, saved: item.saved } : x))
      )
      setError((e as Error).message)
    }
  }

  async function toggleRead(item: NewsItem) {
    if (!item.saved) return
    const next = !item.saved.isRead
    setItems((arr) =>
      arr.map((x) =>
        x.id === item.id && x.saved
          ? { ...x, saved: { ...x.saved, isRead: next } }
          : x
      )
    )
    try {
      const res = await fetch(`/api/news/saved/${item.saved.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isRead: next }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      setItems((arr) =>
        arr.map((x) =>
          x.id === item.id && x.saved
            ? { ...x, saved: { ...x.saved, isRead: !next } }
            : x
        )
      )
      setError((e as Error).message)
    }
  }

  async function changeCategory(item: NewsItem, next: NewsCategory) {
    if (next === item.category) return
    const prev = item.category
    setItems((arr) =>
      arr.map((x) => (x.id === item.id ? { ...x, category: next } : x))
    )
    try {
      const res = await fetch(`/api/news/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ category: next }),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch (e) {
      setItems((arr) =>
        arr.map((x) => (x.id === item.id ? { ...x, category: prev } : x))
      )
      setError((e as Error).message)
    }
  }

  const filtered = useMemo(() => {
    if (tab === 'All' || tab === 'Saved') return items
    return items.filter((i) => i.category === tab)
  }, [items, tab])

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1
            className="font-display font-extrabold text-fg"
            style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
          >
            Daily News
          </h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Tourism · Inbound · Hotel · Airline · Tour &amp; Activity — last 24 hours
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-[11px] text-gray-500">
              Updated {timeAgo(lastRefreshed)}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-none text-[12px] font-bold uppercase tracking-wider text-white bg-[#a83900] hover:bg-[#8a2f00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            style={{ letterSpacing: '0.1em' }}
          >
            {refreshing ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  refresh
                </span>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4 border-b border-gray-200 pb-px">
        {TABS.map((t) => {
          const active = t === tab
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-[12px] font-bold rounded-none transition-colors ${
                active
                  ? 'bg-[#a83900] text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
              }`}
            >
              {t}
            </button>
          )
        })}
      </div>

      {refreshNote && (
        <div className="mb-4 px-3 py-2 text-[12px] text-gray-700 bg-[#fff5ef] border border-[#fde4d3] rounded-none">
          {refreshNote}
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-none">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-sm text-gray-400 py-10 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500 py-10 text-center">
          {tab === 'Saved'
            ? 'No saved articles yet. Hit the bookmark button on any card to save it for later.'
            : 'No articles to show. Click Refresh to pull the latest news.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              showReadToggle={tab === 'Saved'}
              onToggleSave={() => toggleSave(item)}
              onToggleRead={() => toggleRead(item)}
              onChangeCategory={(next) => changeCategory(item, next)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NewsCard({
  item,
  showReadToggle,
  onToggleSave,
  onToggleRead,
  onChangeCategory,
}: {
  item: NewsItem
  showReadToggle: boolean
  onToggleSave: () => void
  onToggleRead: () => void
  onChangeCategory: (next: NewsCategory) => void
}) {
  const cat = item.category && (NEWS_CATEGORIES as readonly string[]).includes(item.category)
    ? (item.category as NewsCategory)
    : 'Other'
  const isSaved = !!item.saved
  const isRead = !!item.saved?.isRead
  const [catOpen, setCatOpen] = useState(false)
  const catRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!catOpen) return
    function onDoc(e: MouseEvent) {
      if (!catRef.current) return
      if (!catRef.current.contains(e.target as Node)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [catOpen])

  return (
    <article
      className={`bg-white p-4 sm:p-5 rounded-none border border-gray-200 flex flex-col gap-3 transition-opacity ${
        isRead ? 'opacity-60' : ''
      }`}
    >
      {/* Top row: source + lang + time + category */}
      <div className="flex items-center gap-2 text-[11px] flex-wrap">
        <span className="font-bold text-[#181c23]">{item.source}</span>
        <span
          className="px-1.5 py-0.5 rounded-none text-[10px] font-bold uppercase"
          style={{
            background: item.sourceLang === 'ja' ? '#FAEEDA' : '#E6F1FB',
            color: item.sourceLang === 'ja' ? '#633806' : '#0C447C',
            letterSpacing: '0.1em',
          }}
        >
          {item.sourceLang}
        </span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{timeAgo(item.publishedAt)}</span>
        <div ref={catRef} className="ml-auto relative">
          <button
            type="button"
            onClick={() => setCatOpen((v) => !v)}
            title="Click to change category"
            className="px-2 py-0.5 rounded-none text-[10px] font-bold uppercase inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{
              background: CATEGORY_BG[cat],
              color: CATEGORY_FG[cat],
              letterSpacing: '0.1em',
            }}
          >
            {cat}
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
              expand_more
            </span>
          </button>
          {catOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-30 w-44 bg-white rounded-none py-1 border border-gray-200"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
            >
              {NEWS_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCatOpen(false)
                    onChangeCategory(c)
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#f5f0e8] transition-colors ${
                    c === cat ? 'font-bold text-[#a83900]' : 'text-[#181c23]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[16px] font-extrabold text-[#181c23] hover:text-[#a83900] leading-snug"
        style={{ fontFamily: '"Work Sans", system-ui, sans-serif' }}
      >
        {item.title}
      </a>

      {/* Summary */}
      {item.summary && (
        <p className="text-[13px] text-[#5b4137] leading-relaxed">{item.summary}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[#a83900] hover:underline inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            open_in_new
          </span>
          Read full article
        </a>
        <div className="flex items-center gap-1.5">
          {showReadToggle && isSaved && (
            <button
              type="button"
              onClick={onToggleRead}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-none text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                isRead
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : 'bg-white text-[#a83900] border-[#a83900] hover:bg-[#a83900] hover:text-white'
              }`}
              title={isRead ? 'Mark as unread' : 'Mark as read'}
              style={{ letterSpacing: '0.1em' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {isRead ? 'check' : 'visibility'}
              </span>
              {isRead ? 'Read' : 'Mark Read'}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleSave}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-none text-[11px] font-bold uppercase tracking-wider border transition-colors ${
              isSaved
                ? 'bg-[#a83900] text-white border-[#a83900] hover:bg-[#8a2f00]'
                : 'bg-white text-gray-700 border-gray-300 hover:border-[#a83900] hover:text-[#a83900]'
            }`}
            title={isSaved ? 'Remove from saved' : 'Save for later'}
            style={{ letterSpacing: '0.1em' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {isSaved ? 'bookmark' : 'bookmark_border'}
            </span>
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </article>
  )
}

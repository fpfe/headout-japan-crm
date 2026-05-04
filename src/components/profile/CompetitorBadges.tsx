'use client'

import { useState } from 'react'
import type { Lead } from '@/types'

const PLATFORMS: { key: keyof Lead; label: string }[] = [
  { key: 'competitorKkday', label: 'KKday' },
  { key: 'competitorKlook', label: 'Klook' },
  { key: 'competitorGyg', label: 'GetYourGuide' },
  { key: 'competitorViator', label: 'Viator' },
  { key: 'competitorAirbnb', label: 'Airbnb' },
]

/**
 * Displays the 5 competitor OTA listings for a lead as a 5-column grid of tiles.
 * Listed = solid rust tile, white text, clickable, "open_in_new" icon.
 * Not listed = white tile with gray border, muted text, "Not listed" status.
 *
 * Includes a "Scan Now" button that calls /api/leads/[id]/scan-competitors
 * and persists the result to the Leads sheet (columns P–T).
 *
 * Data source: Lead.competitorKkday / Klook / Gyg / Viator / Airbnb
 */
export default function CompetitorBadges({
  lead,
  onLeadUpdate,
}: {
  lead: Lead
  onLeadUpdate?: (patch: Partial<Lead>) => void
}) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justScanned, setJustScanned] = useState(false)

  // Cell format: "yes :: <matched activity>" when listed, "" when not.
  // Backward compat: bare "yes" or any other non-empty (legacy URL strings)
  // counts as listed with no caption.
  function parseCell(raw: unknown): { listed: boolean; matched: string } {
    if (typeof raw !== 'string') return { listed: false, matched: '' }
    const trimmed = raw.trim()
    if (!trimmed) return { listed: false, matched: '' }
    const sep = trimmed.indexOf('::')
    if (sep === -1) return { listed: true, matched: '' }
    const head = trimmed.slice(0, sep).trim().toLowerCase()
    const tail = trimmed.slice(sep + 2).trim()
    if (head === 'yes' || head === 'true' || head === 'listed') {
      return { listed: true, matched: tail }
    }
    if (head === 'no' || head === 'false') {
      return { listed: false, matched: '' }
    }
    return { listed: true, matched: tail }
  }

  const items = PLATFORMS.map((p) => {
    const v = parseCell(lead[p.key])
    return { ...p, listed: v.listed, matched: v.matched }
  })

  const listedCount = items.filter((i) => i.listed).length
  const anyListed = listedCount > 0

  async function onScan() {
    setError(null)
    setScanning(true)
    setJustScanned(false)
    try {
      const res = await fetch(`/api/leads/${lead.id}/scan-competitors`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error || `Scan failed (${res.status})`)
      }
      const data = (await res.json()) as { patch: Partial<Lead> }
      if (onLeadUpdate && data.patch) {
        onLeadUpdate(data.patch)
      }
      setJustScanned(true)
      window.setTimeout(() => setJustScanned(false), 1800)
    } catch (e) {
      setError((e as Error).message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-baseline gap-3 flex-wrap">
          <div
            className="text-[12px] uppercase font-bold text-[#a83900]"
            style={{ letterSpacing: '0.2em' }}
          >
            Competitor Listings
          </div>
          <div className="text-[11px] font-semibold text-gray-500">
            {anyListed ? (
              <>
                <span className="text-[#a83900]">{listedCount}</span>
                <span> / {items.length} platforms</span>
              </>
            ) : (
              <span>Not scanned yet</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onScan}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[11px] font-bold uppercase tracking-wider text-white bg-[#a83900] hover:bg-[#8a2f00] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          style={{ letterSpacing: '0.1em' }}
          title={anyListed ? 'Re-scan competitor platforms' : 'Scan competitor platforms now'}
        >
          {scanning ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Scanning...
            </>
          ) : justScanned ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                check
              </span>
              Done
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {anyListed ? 'refresh' : 'travel_explore'}
              </span>
              {anyListed ? 'Re-scan' : 'Scan Now'}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {items.map(({ key, label, listed, matched }) => {
          if (listed) {
            return (
              <div
                key={key}
                title={matched ? `Matched: ${matched}` : `${label} — listed`}
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
                  {matched && (
                    <div className="text-[10px] text-white/85 leading-snug mt-0.5 line-clamp-2">
                      {matched}
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

      {error && (
        <div className="mt-3 px-3 py-2 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-none">
          {error}
        </div>
      )}

      {!anyListed && !scanning && !error && (
        <p className="mt-3 text-[12px] text-gray-500">
          Click <span className="font-semibold text-[#a83900]">Scan Now</span> to check whether this company is listed on KKday, Klook, GetYourGuide, Viator, or Airbnb.
        </p>
      )}
    </div>
  )
}

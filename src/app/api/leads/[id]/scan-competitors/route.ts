// Activity-anchored competitor-scan endpoint.
//
// Strategy:
//   Step 1 — Identify the operator's 2–5 main activities/products
//            (from their homepage if known, else web search).
//   Step 2 — Search each OTA (KKday, Klook, GYG, Viator, Airbnb) for
//            product pages matching those activities + location.
//   Step 3 — Mark a platform "listed" only if a clear activity match
//            is found. Default to "no" when uncertain.
//   Step 4 — Return per platform: {listed: yes|no, matched_activity}
//
// Persistence: column P–T on the Leads sheet, one string per platform:
//   listed  → "yes :: <matched activity>"
//   not     → "" (empty)

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { getLeads, updateLead } from '@/lib/sheets'

const MODEL = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `You are a Headout Japan partnership analyst.

INPUT: a Japan-based experience operator. You will be given the company name and may also receive: homepage URL, region, service type, brand/Japanese name, and notes excerpts. Some context may be missing; work with what you have.

GOAL: Determine whether this operator has at least one active product listing on each of the 5 OTAs below. Match by ACTIVITY + LOCATION, not by company name (OTAs list activities, not operators).

PROCESS — follow these four steps in order:

STEP 1 — IDENTIFY ACTIVITIES.
Use Google Search to find this operator's main activities/experiences/tours/tickets. If a homepage URL was provided, look it up first. Pull 2–5 specific products with name and location (e.g., "Shinjuku Gyoen 2-Hour Walking Tour, Tokyo"; "teamLab Planets Tokyo Tickets, Toyosu"). If you can't identify any specific activities, mark all platforms "no" and skip Step 2.

STEP 2 — SEARCH EACH PLATFORM.
For each platform, search Google for product pages matching the activities you identified in Step 1, scoped to that platform's domain. Look for page titles and snippets that contain the activity name AND location.

Platforms:
- KKday (kkday.com)
- Klook (klook.com)
- GetYourGuide (getyourguide.com)
- Viator (viator.com)
- Airbnb Experiences (airbnb.com/experiences)

STEP 3 — JUDGE.
A platform is "listed" only if Step 2 found a product page whose title or snippet clearly matches one of the operator's activities (matching activity name AND location). If you only find generic results, the platform homepage, unrelated activities, or have any uncertainty — answer "no".

DEFAULT TO "no" when in doubt. Never extrapolate from URL patterns. Never invent activity names. Never invent URLs.

STEP 4 — OUTPUT.
For each platform, return:
- listed: "yes" or "no"
- matched_activity: short description of the activity that matched (e.g., "teamLab Planets Tokyo"), OR an empty string when "no"

Respond with ONLY a valid JSON object matching this schema. No markdown, no fences, no prose:

{
  "activities_found": [string, ...],
  "kkday":  { "listed": "yes" | "no", "matched_activity": string },
  "klook":  { "listed": "yes" | "no", "matched_activity": string },
  "gyg":    { "listed": "yes" | "no", "matched_activity": string },
  "viator": { "listed": "yes" | "no", "matched_activity": string },
  "airbnb": { "listed": "yes" | "no", "matched_activity": string }
}`

type PlatformVerdict = { listed: boolean; matched_activity: string }

type CompetitorListings = {
  activitiesFound: string[]
  kkday: PlatformVerdict
  klook: PlatformVerdict
  gyg: PlatformVerdict
  viator: PlatformVerdict
  airbnb: PlatformVerdict
}

function coerceYes(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    return s === 'yes' || s === 'true' || s === 'listed'
  }
  return false
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function parsePlatform(raw: unknown): PlatformVerdict {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>
    return {
      listed: coerceYes(r.listed),
      matched_activity: asString(r.matched_activity),
    }
  }
  // Defensive: if Gemini just returned "yes"/"no" instead of an object
  return { listed: coerceYes(raw), matched_activity: '' }
}

function parseListings(raw: string): CompetitorListings {
  let text = raw.trim()
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
  const m = text.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(m ? m[0] : text) as Record<string, unknown>
  const activities = Array.isArray(parsed.activities_found)
    ? (parsed.activities_found as unknown[]).map(asString).filter(Boolean)
    : []
  return {
    activitiesFound: activities,
    kkday: parsePlatform(parsed.kkday),
    klook: parsePlatform(parsed.klook),
    gyg: parsePlatform(parsed.gyg),
    viator: parsePlatform(parsed.viator),
    airbnb: parsePlatform(parsed.airbnb),
  }
}

/** Pull "Web: https://example.com" line out of a Deep Search-generated notes blob. */
function extractHomepage(notes: string | undefined): string | null {
  if (!notes) return null
  const m = notes.match(/^\s*Web:\s*(https?:\/\/\S+)/im)
  return m ? m[1].trim() : null
}

/** Pull "JP: <katakana/kanji>" line out of notes. */
function extractJapaneseName(notes: string | undefined): string | null {
  if (!notes) return null
  const m = notes.match(/^\s*JP:\s*(.+)$/im)
  return m ? m[1].trim() : null
}

/** Format the cell value: "yes :: <activity>" when listed, "" when not. */
function formatCell(v: PlatformVerdict): string {
  if (!v.listed) return ''
  const activity = v.matched_activity.trim()
  return activity ? `yes :: ${activity}` : 'yes'
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  const { id } = await params

  const leads = await getLeads()
  const lead = leads.find((l) => l.id === id)
  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }
  if (!lead.company || !lead.company.trim()) {
    return NextResponse.json(
      { error: 'Lead has no company name; cannot scan.' },
      { status: 400 }
    )
  }

  const homepage = extractHomepage(lead.notes)
  const jaName = extractJapaneseName(lead.notes)

  // Trim notes to a few useful lines (skip our own metadata prefixes that
  // might otherwise mislead the model — Score, Tags, Co-operators, etc.)
  const notesExcerpt = (lead.notes ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(Score|Service type|Market demand|Tier|Tags?):/i.test(l))
    .slice(0, 8)
    .join('\n')

  const userQuery = [
    `Company: ${lead.company}`,
    jaName ? `Japanese name: ${jaName}` : null,
    homepage ? `Homepage: ${homepage}` : null,
    lead.region ? `Region: ${lead.region}` : null,
    lead.serviceType ? `Service type: ${lead.serviceType}` : null,
    notesExcerpt ? `\nContext from prior research:\n${notesExcerpt}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const ai = new GoogleGenAI({ apiKey })
  const MAX_RETRIES = 3
  let listings: CompetitorListings | null = null
  let lastError: string | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: [{ text: userQuery }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
        },
      })

      const text =
        response.candidates?.[0]?.content?.parts
          ?.filter((p) => p.text)
          .map((p) => p.text)
          .join('') ?? ''

      if (!text) {
        lastError = 'Gemini returned an empty response.'
        continue
      }

      try {
        listings = parseListings(text)
        break
      } catch (parseErr) {
        lastError = `Could not parse Gemini response: ${(parseErr as Error).message}`
        continue
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      lastError = message
      const isOverloaded = /high demand|unavailable|503|429/i.test(message)
      if (isOverloaded && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        continue
      }
      break
    }
  }

  if (!listings) {
    return NextResponse.json(
      { error: `Competitor scan failed: ${lastError ?? 'unknown error'}` },
      { status: 502 }
    )
  }

  const patch = {
    competitorKkday: formatCell(listings.kkday),
    competitorKlook: formatCell(listings.klook),
    competitorGyg: formatCell(listings.gyg),
    competitorViator: formatCell(listings.viator),
    competitorAirbnb: formatCell(listings.airbnb),
  }

  try {
    const updated = await updateLead(id, patch)
    if (!updated) {
      return NextResponse.json(
        { error: 'Lead disappeared between fetch and update' },
        { status: 404 }
      )
    }
    return NextResponse.json({
      patch,
      listings,
      activitiesFound: listings.activitiesFound,
    })
  } catch (err) {
    console.error('[scan-competitors] persist failed', err)
    return NextResponse.json(
      { error: 'Scan succeeded but persisting to Sheets failed.' },
      { status: 500 }
    )
  }
}

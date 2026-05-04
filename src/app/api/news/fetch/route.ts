// POST /api/news/fetch
//
// Pulls all configured RSS feeds, dedupes against news_items by URL,
// summarizes new articles with Gemini (2–3 sentences in English) and
// classifies into one of the 5 news categories. Bulk-inserts into Supabase.
//
// Returns: { fetched: number, inserted: number, skipped: number, perSource: {...} }

import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAllRecentArticles, type RawArticle } from '@/lib/news-fetcher'
import { NEWS_CATEGORIES, type NewsCategory } from '@/lib/news-sources'

const MODEL = 'gemini-2.5-flash'

const SUMMARIZE_SYSTEM_PROMPT = `You are a tourism-industry analyst summarizing news for the Headout Japan BD team.

INPUT: a single news article — title, source, and content excerpt. The excerpt may be in Japanese or English.

TASKS:
1. Write a 2–3 sentence summary IN ENGLISH of the article. Lead with the most important fact (what happened, who, where, why it matters for tourism / inbound Japan / hotels / airlines / tours & activities). Keep each sentence tight. No preamble, no "this article describes…", no headlines, no bullets.
2. Classify the article into ONE of these categories. PICK A SPECIFIC CATEGORY whenever possible — only fall back to "Other" if absolutely nothing fits. If an article mentions a hotel, airline, attraction, or OTA in any meaningful way, classify by that actor:

   - "Tourism"
     Industry-wide tourism analysis, government statistics, market data, tourism policy/strategy, tourism workforce/education.
     Examples: "JNTO releases April visitor statistics" → Tourism. "Government raises accommodation tax" → Tourism. "Travel demand recovery tracking" → Tourism.

   - "Inbound"
     Specifically about FOREIGN VISITORS coming to Japan: visa changes, source-market trends (Western, Chinese, Korean visitors), inbound marketing campaigns, multilingual services, inbound-targeted programs.
     Examples: "China inbound recovery" → Inbound. "JNTO launches Spain campaign" → Inbound. "Visa-free expansion for Saudi Arabia" → Inbound.

   - "Hotel"
     ANY news involving a hotel, ryokan, or lodging brand. Includes openings, renovations, brand launches, F&B promotions (cakes, afternoon tea, seasonal menus, gift sets), staff/HR initiatives, hospitality-industry trends, hotel financial results, ryokan workforce issues, mother's day / father's day promotions at hotels.
     Examples: "Shangri-La Tokyo launches Mother's Day cake" → Hotel. "Ryokan staff working conditions article" → Hotel. "Marriott opens new property in Osaka" → Hotel. "Hilton Q4 earnings" → Hotel.

   - "Airline"
     Airlines, airports, aviation companies — including their FINANCIAL RESULTS / EARNINGS, route changes, fleet news, alliances, codeshares, cabin updates, cargo, airport infrastructure.
     Examples: "ANA Holdings reports Q4 earnings" → Airline. "JAL adds Tokyo-Vienna route" → Airline. "Narita Airport expansion" → Airline. "Star Alliance adds member" → Airline.

   - "Tour & Activity"
     Anything experiential a tourist BUYS or DOES at the destination: tours, attractions, theme parks, water parks, observation decks, museums, cultural experiences, OTAs, ticketing platforms, NEW ATTRACTION OPENINGS, seasonal activity launches, resort entertainment additions.
     Examples: "Seagaia opens new water slide attraction" → Tour & Activity. "teamLab announces summer event" → Tour & Activity. "Klook adds Japan tickets" → Tour & Activity. "Universal Studios reveals new ride" → Tour & Activity.

   - "Other"
     Use ONLY as a last resort, when nothing above fits at all. Do NOT use "Other" just because the article doesn't match the most obvious example — re-read the definitions and pick the closest specific category.

SCHEMA — respond with ONLY this JSON object, no markdown, no fences, no prose:
{
  "summary": string,
  "category": "Tourism" | "Inbound" | "Hotel" | "Airline" | "Tour & Activity" | "Other"
}`

type Summarized = { summary: string; category: NewsCategory }

function parseSummarized(raw: string): Summarized | null {
  try {
    let text = raw.trim()
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    const m = text.match(/\{[\s\S]*\}/)
    const obj = JSON.parse(m ? m[0] : text) as Record<string, unknown>
    const summary = typeof obj.summary === 'string' ? obj.summary.trim() : ''
    const cat = typeof obj.category === 'string' ? obj.category.trim() : ''
    if (!summary) return null
    if (!(NEWS_CATEGORIES as readonly string[]).includes(cat)) {
      return { summary, category: 'Other' }
    }
    return { summary, category: cat as NewsCategory }
  } catch {
    return null
  }
}

async function summarizeOne(
  ai: GoogleGenAI,
  article: RawArticle
): Promise<Summarized | null> {
  const userText = [
    `Title: ${article.title}`,
    `Source: ${article.source} (${article.sourceLang})`,
    `Published: ${article.publishedAt.toISOString()}`,
    `URL: ${article.url}`,
    '',
    'Excerpt:',
    article.contentSnippet || '(no excerpt available — base your summary on the title and your tourism-industry knowledge of this topic)',
  ].join('\n')
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      config: { systemInstruction: SUMMARIZE_SYSTEM_PROMPT },
    })
    const text =
      response.candidates?.[0]?.content?.parts
        ?.filter((p) => p.text)
        .map((p) => p.text)
        .join('') ?? ''
    if (!text) return null
    return parseSummarized(text)
  } catch (err) {
    console.warn(
      `[news/fetch] summarize failed for ${article.url}: ${(err as Error).message}`
    )
    return null
  }
}

/** Run summarization in parallel batches to avoid hammering Gemini. */
async function summarizeBatched(
  ai: GoogleGenAI,
  articles: RawArticle[],
  batchSize = 5
): Promise<(Summarized | null)[]> {
  const out: (Summarized | null)[] = new Array(articles.length).fill(null)
  for (let i = 0; i < articles.length; i += batchSize) {
    const slice = articles.slice(i, i + batchSize)
    const results = await Promise.all(slice.map((a) => summarizeOne(ai, a)))
    for (let j = 0; j < results.length; j++) out[i + j] = results[j]
  }
  return out
}

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  // Step 1 — pull all RSS feeds, last-24h, deduped within this fetch
  const { articles, perSource } = await fetchAllRecentArticles()
  if (articles.length === 0) {
    return NextResponse.json({
      fetched: 0,
      inserted: 0,
      skipped: 0,
      perSource,
      note: 'No articles in last 24h from any source.',
    })
  }

  // Step 2 — dedupe against existing news_items by URL
  const urls = articles.map((a) => a.url)
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('news_items')
    .select('url')
    .in('url', urls)
  if (existingErr) {
    return NextResponse.json(
      { error: `Supabase select failed: ${existingErr.message}` },
      { status: 500 }
    )
  }
  const knownUrls = new Set((existing ?? []).map((r) => r.url))
  const newOnes = articles.filter((a) => !knownUrls.has(a.url))
  const skipped = articles.length - newOnes.length

  if (newOnes.length === 0) {
    return NextResponse.json({
      fetched: articles.length,
      inserted: 0,
      skipped,
      perSource,
      note: 'All articles were already cached.',
    })
  }

  // Step 3 — summarize + classify each new article (Gemini, batched)
  const ai = new GoogleGenAI({ apiKey })
  const summarized = await summarizeBatched(ai, newOnes, 5)

  // Step 4 — bulk insert
  const rows = newOnes.map((a, i) => {
    const s = summarized[i]
    return {
      url: a.url,
      title: a.title,
      source: a.source,
      source_lang: a.sourceLang,
      published_at: a.publishedAt.toISOString(),
      summary: s?.summary ?? null,
      category: s?.category ?? 'Other',
    }
  })

  const { error: insertErr, data: inserted } = await supabaseAdmin
    .from('news_items')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
    .select('id')
  if (insertErr) {
    return NextResponse.json(
      { error: `Supabase insert failed: ${insertErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    fetched: articles.length,
    inserted: inserted?.length ?? rows.length,
    skipped,
    perSource,
  })
}

// RSS fetcher for the Daily News module.
//
// Pulls all configured feeds in parallel, filters to last-24h, dedupes by URL,
// and returns a normalized list. Dead/unreachable feeds are logged and skipped
// (we don't want one bad feed to fail the whole refresh).

import Parser from 'rss-parser'
import { NEWS_SOURCES, type NewsSource } from './news-sources'

export type RawArticle = {
  url: string
  title: string
  source: string         // display name, e.g. "Skift"
  sourceId: string       // stable id, e.g. "skift"
  sourceLang: 'en' | 'ja'
  publishedAt: Date
  contentSnippet: string // best-effort excerpt for Gemini summarization
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

const parser = new Parser({
  timeout: 8000,
  headers: {
    // Some feeds 403 a default Node UA. Pretend to be a normal browser RSS reader.
    'User-Agent':
      'HeadoutJapanCRM/1.0 (+https://github.com/fpfe/headout-japan-crm) RSSReader',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
})

function pickSnippet(item: Parser.Item): string {
  // Prefer contentSnippet (already plaintext), fall back to summary/content.
  const raw =
    item.contentSnippet ??
    (item as { summary?: string }).summary ??
    item.content ??
    item.title ??
    ''
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, 800)
}

function pickPublishedAt(item: Parser.Item): Date | null {
  const candidates = [item.isoDate, item.pubDate]
  for (const c of candidates) {
    if (!c) continue
    const d = new Date(c)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

async function fetchOne(source: NewsSource): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url)
    const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS
    const out: RawArticle[] = []
    for (const item of feed.items ?? []) {
      const url = (item.link ?? '').trim()
      const title = (item.title ?? '').trim()
      const publishedAt = pickPublishedAt(item)
      if (!url || !title || !publishedAt) continue
      if (publishedAt.getTime() < cutoff) continue
      out.push({
        url,
        title,
        source: source.name,
        sourceId: source.id,
        sourceLang: source.lang,
        publishedAt,
        contentSnippet: pickSnippet(item),
      })
    }
    return out
  } catch (err) {
    console.warn(
      `[news-fetcher] feed ${source.id} (${source.url}) failed: ${(err as Error).message}`
    )
    return []
  }
}

/** Fetch all configured feeds in parallel, filter last-24h, dedupe by URL. */
export async function fetchAllRecentArticles(): Promise<{
  articles: RawArticle[]
  perSource: Record<string, number>
}> {
  const results = await Promise.all(NEWS_SOURCES.map(fetchOne))
  const seen = new Set<string>()
  const articles: RawArticle[] = []
  const perSource: Record<string, number> = {}
  for (let i = 0; i < NEWS_SOURCES.length; i++) {
    const src = NEWS_SOURCES[i]
    const items = results[i]
    perSource[src.id] = items.length
    for (const a of items) {
      if (seen.has(a.url)) continue
      seen.add(a.url)
      articles.push(a)
    }
  }
  // Newest first
  articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  return { articles, perSource }
}

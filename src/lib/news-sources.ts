// RSS source list for the Daily News module.
//
// Each source entry has:
// - id: stable internal id (used in logs)
// - name: display name shown on news cards
// - url: RSS feed URL
// - lang: 'en' or 'ja'
// - kind: 'trade' (industry press), 'gov' (government / official), 'global' (general travel)
//
// If a feed turns out to be dead at runtime, the news fetcher logs and skips it.
// Add or remove sources here freely.

export type NewsSource = {
  id: string
  name: string
  url: string
  lang: 'en' | 'ja'
  kind: 'trade' | 'gov' | 'global'
}

export const NEWS_SOURCES: NewsSource[] = [
  // ─── English ───────────────────────────────────────────────
  {
    id: 'skift',
    name: 'Skift',
    url: 'https://skift.com/feed/',
    lang: 'en',
    kind: 'global',
  },
  {
    id: 'phocuswire',
    name: 'PhocusWire',
    url: 'https://www.phocuswire.com/RSS',
    lang: 'en',
    kind: 'global',
  },
  {
    id: 'ttgasia',
    name: 'TTG Asia',
    url: 'https://www.ttgasia.com/feed/',
    lang: 'en',
    kind: 'trade',
  },

  // ─── Japanese trade press ──────────────────────────────────
  {
    id: 'travelvoice',
    name: 'トラベルボイス',
    url: 'https://www.travelvoice.jp/feed',
    lang: 'ja',
    kind: 'trade',
  },
  {
    id: 'honichi',
    name: '訪日ラボ',
    url: 'https://honichi.com/feed',
    lang: 'ja',
    kind: 'trade',
  },
  {
    id: 'yamatogokoro',
    name: 'やまとごころ.jp',
    url: 'https://www.yamatogokoro.jp/feed',
    lang: 'ja',
    kind: 'trade',
  },
  {
    id: 'kankokeizai',
    name: '観光経済新聞',
    url: 'https://www.kankokeizai.com/feed/',
    lang: 'ja',
    kind: 'trade',
  },

  // ─── Japanese government / official ────────────────────────
  {
    id: 'jnto',
    name: 'JNTO',
    url: 'https://www.jnto.go.jp/news/feed/',
    lang: 'ja',
    kind: 'gov',
  },
  {
    id: 'jta',
    name: '観光庁',
    url: 'https://www.mlit.go.jp/kankocho/news/feed/',
    lang: 'ja',
    kind: 'gov',
  },
]

export const NEWS_CATEGORIES = [
  'Tourism',
  'Inbound',
  'Hotel',
  'Airline',
  'Tour & Activity',
  'Other',
] as const

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

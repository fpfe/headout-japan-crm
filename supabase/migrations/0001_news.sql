-- Daily News module — schema migration
-- Run this once in the Supabase SQL editor.
--
-- news_items: cached articles with AI summary + category.
-- One row per unique URL. Refresh dedupes by URL.
--
-- saved_news: user save list. UNIQUE on news_item_id makes the
-- toggle behavior simple (try insert, on conflict delete).

create extension if not exists "pgcrypto";

create table if not exists news_items (
  id           uuid primary key default gen_random_uuid(),
  url          text unique not null,
  title        text not null,
  source       text not null,
  source_lang  text not null check (source_lang in ('en','ja')),
  published_at timestamptz not null,
  summary      text,
  category     text check (category in ('Tourism','Inbound','Hotel','Airline','Tour & Activity','Other')),
  fetched_at   timestamptz not null default now()
);

create index if not exists idx_news_items_published on news_items (published_at desc);
create index if not exists idx_news_items_category  on news_items (category);
create index if not exists idx_news_items_fetched   on news_items (fetched_at desc);

create table if not exists saved_news (
  id            uuid primary key default gen_random_uuid(),
  news_item_id  uuid not null references news_items(id) on delete cascade,
  saved_at      timestamptz not null default now(),
  is_read       boolean not null default false,
  lead_id       text,
  unique (news_item_id)
);

create index if not exists idx_saved_news_saved_at on saved_news (saved_at desc);

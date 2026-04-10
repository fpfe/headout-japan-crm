# CLAUDE.md — kinetic-crm

---

## What This Product Is

**kinetic-crm** is a sales tool for Headout's Japan BD team to acquire experience service merchants catering to overseas travelers (Europe, US, Middle East).

It has two connected modules:

1. **Lead Finder** — discovers potential merchant partners by city and category, pulls real company data, deduplicates, and feeds into the CRM
2. **Merchant CRM** — tracks each merchant through the acquisition pipeline from first contact to onboarding

Live: https://kinetic-crm.vercel.app  
Repo: https://github.com/fpfe/kinetic-crm

---

## Users

- **Sales Representatives**: add leads, log calls, track pipeline stages
- **Sales Managers**: view team pipeline, conversion metrics
- **BD Team (primary user now)**: Seungjun, Japan Head of BD — uses both modules daily

---

## Business Context

- Headout is an experience OTA strong in Europe, US, and Middle East. Japan selection is the gap to close.
- Target merchants: traditional culture workshops, tea ceremony, art studios, museums, tour operators, animation/niche experiences, hospitality venues in Tokyo, Osaka, Kyoto
- Key competitor for gap analysis: Klook (check what's on Klook but not on Headout)
- Priority tourist segments: European, American, Middle Eastern travelers
- Merchant outreach is cold — most operators have no existing OTA relationship or only list on Japanese-domestic platforms (Jalan, Ikyu, Rakuten Travel Experiences)

---

## Tech Stack

- **Framework**: Next.js + TypeScript (do not switch)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Data**: Anthropic API (claude-sonnet-4-20250514) for lead generation and email drafting
- **Storage**: to be confirmed — default to Supabase if a database is needed

Do not introduce new frameworks or libraries without flagging first. Keep the stack minimal.

---

## Module 1: Lead Finder

### Purpose
Generate a long list of real, verified experience operators in Tokyo, Osaka, and Kyoto. No hallucinated companies.

### Input (before search)
- City selector: Tokyo / Osaka / Kyoto
- Category or keyword input (e.g., "tea ceremony", "anime experience", "cooking class")

### Output per company
- Company name
- Website URL
- Category
- Summary (what they do, who their customers are)
- Inbound tourist strategy (are they already targeting overseas visitors?)
- Latest relevant news (especially re: inbound tourism)
- Contact person name (if findable)
- Contact email and/or phone (if findable)
- Klook presence: yes / no (gap indicator)
- Headout presence: yes / no

### Behavior rules
- Use web search via Anthropic API tool use — do not generate companies from model memory alone
- Before returning results, check against existing leads in the CRM and skip duplicates
- User can delete any company from the list manually
- Clicking a company name opens the Merchant Profile (CRM side)
- Each company row has an Email Generator link

### Anti-hallucination rules
- Only return companies with a verifiable URL
- If the model cannot find a real website, do not include the company
- Flag confidence level if contact info is inferred rather than directly sourced

---

## Module 2: Merchant CRM

### Pipeline Stages
Lead Identified → Initial Contact → Proposal Sent → Negotiation → Contracted → Onboarded → Churned / Lost

### Merchant Profile fields
- Company name, URL, category, city
- Contact person, email, phone
- Current marketing channels (Jalan, Ikyu, TripAdvisor, etc.)
- Pain points re: reaching overseas travelers
- Headout fit score (Europe / US / Middle East relevance)
- Communication history log (calls, emails, meetings)
- Next action + due date
- Stage
- Notes

### Email Generator (accessible from both Lead Finder and Merchant Profile)
Cold email generator for first outreach. Input fields:
1. Why this company (what caught your attention)
2. Why Headout can help their business
3. Meeting date options (3 slots)
4. Other appeal points

Output: formal Japanese business email (keigo, first-contact appropriate)
Structure: 自己紹介 / 連絡理由 / 提案要旨 / 日程候補 / 次のステップ
Also generate a short version for LINE or email subject line.

---

## Code Standards

- TypeScript strict mode — no `any` types without a comment explaining why
- All Anthropic API calls go through a single `/lib/anthropic.ts` utility — no inline fetch calls scattered across components
- Sensitive data (API keys, contact info) never logged to console in production
- All company data fetched from external sources must be stored raw before processing
- Components stay under 200 lines — split if larger
- Every new page or major component gets a one-line comment at the top explaining its purpose

---

## File Structure Convention

```
src/
  app/           # Next.js app router pages
  components/    # Reusable UI components
  lib/           # API clients, utilities, data logic
    anthropic.ts # All Anthropic API calls
    supabase.ts  # DB client (if used)
  types/         # Shared TypeScript types
  hooks/         # Custom React hooks
public/          # Static assets
```

---

## Workflow Rules

- Show file structure before writing code if touching more than 2 files
- Do not write Anthropic API prompts unless explicitly asked — leave a placeholder comment
- Always check for duplicate company logic before modifying Lead Finder fetch behavior
- When adding a new pipeline stage, update both the type definition and the UI in the same task

---

## What Not to Do

- Do not use `any` types silently
- Do not add a database migration without confirming the schema first
- Do not generate placeholder/fake company data for demos — use real search results or clearly marked mock data
- No em dashes anywhere in any output

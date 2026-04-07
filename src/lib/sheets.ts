import { google, sheets_v4 } from 'googleapis'
import { randomUUID } from 'crypto'
import type { Lead, Member, Interaction, Note, Document } from '@/types'
import { DEFAULT_SERVICE_TYPES } from '@/types'

const SHEET_NAME = 'Leads'
const SERVICE_TYPES_TAB = 'ServiceTypes'
const MEMBERS_TAB = 'Members'
const RANGE = `${SHEET_NAME}!A2:M`
const HEADER_RANGE = `${SHEET_NAME}!A1:M1`

const COLUMNS: (keyof Lead)[] = [
  'id',
  'contactName',
  'email',
  'phone',
  'company',
  'serviceType',
  'leadSource',
  'assignedTo',
  'status',
  'region',
  'notes',
  'createdAt',
  'dealValue',
]

function spreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!id) throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set')
  return id
}

let cachedClient: sheets_v4.Sheets | null = null

async function getSheets(): Promise<sheets_v4.Sheets> {
  if (cachedClient) return cachedClient
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const scopes = ['https://www.googleapis.com/auth/spreadsheets']
  console.log(
    '[sheets] private_key starts with:',
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.substring(0, 30)
  )
  // Production (Vercel): use env vars.
  // Local dev fallback: read service-account.json at project root.
  const auth =
    email && key
      ? new google.auth.GoogleAuth({
          credentials: {
            client_email: email,
            private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '')
              .replace(/\\\\n/g, '\n')
              .replace(/\\n/g, '\n')
              .trim(),
          },
          scopes,
        })
      : new google.auth.GoogleAuth({
          keyFile: 'service-account.json',
          scopes,
        })
  cachedClient = google.sheets({ version: 'v4', auth })
  return cachedClient
}

function rowToLead(row: string[]): Lead {
  const lead: Record<string, string> = {}
  COLUMNS.forEach((col, i) => {
    lead[col] = row[i] ?? ''
  })
  return lead as unknown as Lead
}

function leadToRow(lead: Lead): string[] {
  return COLUMNS.map((col) => String(lead[col] ?? ''))
}

export async function getLeads(): Promise<Lead[]> {
  try {
    const sheets = await getSheets()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: RANGE,
    })
    const rows = res.data.values ?? []
    return rows.filter((r) => r[0]).map(rowToLead)
  } catch (err) {
    console.error('[sheets] getLeads failed', err)
    throw err
  }
}

export async function createLead(
  data: Omit<Lead, 'id' | 'createdAt'>
): Promise<Lead> {
  try {
    const sheets = await getSheets()
    const lead: Lead = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: RANGE,
      valueInputOption: 'RAW',
      requestBody: { values: [leadToRow(lead)] },
    })
    return lead
  } catch (err) {
    console.error('[sheets] createLead failed', err)
    throw err
  }
}

async function findRowIndex(id: string): Promise<number> {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${SHEET_NAME}!A2:A`,
  })
  const ids = (res.data.values ?? []).map((r) => r[0])
  const idx = ids.findIndex((v) => v === id)
  if (idx === -1) return -1
  return idx + 2 // 1-indexed + header row
}

export async function updateLead(
  id: string,
  patch: Partial<Lead>
): Promise<Lead | null> {
  try {
    const sheets = await getSheets()
    const rowNum = await findRowIndex(id)
    if (rowNum === -1) return null
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${SHEET_NAME}!A${rowNum}:M${rowNum}`,
    })
    const current = rowToLead(existing.data.values?.[0] ?? [])
    const merged: Lead = { ...current, ...patch, id }
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${SHEET_NAME}!A${rowNum}:M${rowNum}`,
      valueInputOption: 'RAW',
      requestBody: { values: [leadToRow(merged)] },
    })
    return merged
  } catch (err) {
    console.error('[sheets] updateLead failed', err)
    throw err
  }
}

export async function deleteLead(id: string): Promise<boolean> {
  try {
    const sheets = await getSheets()
    const rowNum = await findRowIndex(id)
    if (rowNum === -1) return false
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId(),
      range: `${SHEET_NAME}!A${rowNum}:M${rowNum}`,
    })
    return true
  } catch (err) {
    console.error('[sheets] deleteLead failed', err)
    throw err
  }
}

// ─────────────────────────────────────────────
// Service Types (dynamic — stored in their own tab)
// ─────────────────────────────────────────────

async function ensureServiceTypesTab(sheets: sheets_v4.Sheets): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId() })
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === SERVICE_TYPES_TAB
  )
  if (exists) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: [
        { addSheet: { properties: { title: SERVICE_TYPES_TAB } } },
      ],
    },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${SERVICE_TYPES_TAB}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['name'], ...DEFAULT_SERVICE_TYPES.map((n) => [n])],
    },
  })
}

export async function getServiceTypes(): Promise<string[]> {
  try {
    const sheets = await getSheets()
    await ensureServiceTypesTab(sheets)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${SERVICE_TYPES_TAB}!A2:A`,
    })
    return (res.data.values ?? []).map((r) => r[0]).filter(Boolean)
  } catch (err) {
    console.error('[sheets] getServiceTypes failed', err)
    throw err
  }
}

export async function addServiceType(name: string): Promise<string> {
  try {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Service type name is required')
    const sheets = await getSheets()
    await ensureServiceTypesTab(sheets)
    const existing = await getServiceTypes()
    if (existing.includes(trimmed)) return trimmed
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${SERVICE_TYPES_TAB}!A:A`,
      valueInputOption: 'RAW',
      requestBody: { values: [[trimmed]] },
    })
    return trimmed
  } catch (err) {
    console.error('[sheets] addServiceType failed', err)
    throw err
  }
}

// ─────────────────────────────────────────────
// Members
// ─────────────────────────────────────────────

const MEMBER_COLUMNS: (keyof Member)[] = [
  'id',
  'name',
  'email',
  'phone',
  'businessTitle',
  'slackId',
  'createdAt',
]

const MEMBER_LAST_COL = 'G' // 7 columns: A..G

function rowToMember(row: string[]): Member {
  const m: Record<string, string> = {}
  MEMBER_COLUMNS.forEach((col, i) => {
    m[col] = row[i] ?? ''
  })
  return m as unknown as Member
}

function memberToRow(m: Member): string[] {
  return MEMBER_COLUMNS.map((col) => String(m[col] ?? ''))
}

async function ensureMembersTab(sheets: sheets_v4.Sheets): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId() })
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === MEMBERS_TAB
  )
  if (exists) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: {
      requests: [{ addSheet: { properties: { title: MEMBERS_TAB } } }],
    },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${MEMBERS_TAB}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [MEMBER_COLUMNS as string[]] },
  })
}

export async function getMembers(): Promise<Member[]> {
  try {
    const sheets = await getSheets()
    await ensureMembersTab(sheets)
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${MEMBERS_TAB}!A2:${MEMBER_LAST_COL}`,
    })
    const rows = res.data.values ?? []
    return rows.filter((r) => r[0]).map(rowToMember)
  } catch (err) {
    console.error('[sheets] getMembers failed', err)
    throw err
  }
}

export async function createMember(
  data: Omit<Member, 'id' | 'createdAt'>
): Promise<Member> {
  try {
    const sheets = await getSheets()
    await ensureMembersTab(sheets)
    const member: Member = {
      ...data,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${MEMBERS_TAB}!A:${MEMBER_LAST_COL}`,
      valueInputOption: 'RAW',
      requestBody: { values: [memberToRow(member)] },
    })
    return member
  } catch (err) {
    console.error('[sheets] createMember failed', err)
    throw err
  }
}

async function findMemberRow(id: string): Promise<number> {
  const sheets = await getSheets()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${MEMBERS_TAB}!A2:A`,
  })
  const ids = (res.data.values ?? []).map((r) => r[0])
  const idx = ids.findIndex((v) => v === id)
  if (idx === -1) return -1
  return idx + 2
}

export async function updateMember(
  id: string,
  patch: Partial<Member>
): Promise<Member | null> {
  try {
    const sheets = await getSheets()
    const rowNum = await findMemberRow(id)
    if (rowNum === -1) return null
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${MEMBERS_TAB}!A${rowNum}:${MEMBER_LAST_COL}${rowNum}`,
    })
    const current = rowToMember(existing.data.values?.[0] ?? [])
    const merged: Member = { ...current, ...patch, id }
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${MEMBERS_TAB}!A${rowNum}:${MEMBER_LAST_COL}${rowNum}`,
      valueInputOption: 'RAW',
      requestBody: { values: [memberToRow(merged)] },
    })
    return merged
  } catch (err) {
    console.error('[sheets] updateMember failed', err)
    throw err
  }
}

export async function deleteMember(id: string): Promise<boolean> {
  try {
    const sheets = await getSheets()
    const rowNum = await findMemberRow(id)
    if (rowNum === -1) return false
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId(),
      range: `${MEMBERS_TAB}!A${rowNum}:${MEMBER_LAST_COL}${rowNum}`,
    })
    return true
  } catch (err) {
    console.error('[sheets] deleteMember failed', err)
    throw err
  }
}

// ─────────────────────────────────────────────
// Generic tab helpers (Interactions / Notes / Documents)
// ─────────────────────────────────────────────

async function ensureTab(
  sheets: sheets_v4.Sheets,
  tab: string,
  headers: string[]
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: spreadsheetId() })
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab)
  if (exists) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] },
  })
}

function rowToObj<T>(cols: readonly string[], row: string[]): T {
  const o: Record<string, string> = {}
  cols.forEach((c, i) => (o[c] = row[i] ?? ''))
  return o as unknown as T
}
function objToRow<T>(cols: readonly string[], obj: T): string[] {
  return cols.map((c) => String((obj as Record<string, unknown>)[c] ?? ''))
}

async function findRowInTab(
  sheets: sheets_v4.Sheets,
  tab: string,
  id: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId(),
    range: `${tab}!A2:A`,
  })
  const ids = (res.data.values ?? []).map((r) => r[0])
  const idx = ids.findIndex((v) => v === id)
  return idx === -1 ? -1 : idx + 2
}

// ─────────────────────────────────────────────
// Interactions
// ─────────────────────────────────────────────

const INTERACTIONS_TAB = 'Interactions'
const INTERACTION_COLS: (keyof Interaction)[] = [
  'id',
  'leadId',
  'type',
  'title',
  'body',
  'tags',
  'date',
  'createdBy',
]
const INTERACTION_LAST = 'H'

export async function getInteractionsByLeadId(
  leadId: string
): Promise<Interaction[]> {
  try {
    const sheets = await getSheets()
    await ensureTab(sheets, INTERACTIONS_TAB, INTERACTION_COLS as string[])
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${INTERACTIONS_TAB}!A2:${INTERACTION_LAST}`,
    })
    const rows = res.data.values ?? []
    return rows
      .filter((r) => r[0] && r[1] === leadId)
      .map((r) => rowToObj<Interaction>(INTERACTION_COLS, r))
  } catch (err) {
    console.error('[sheets] getInteractionsByLeadId failed', err)
    throw err
  }
}

export async function createInteraction(
  data: Omit<Interaction, 'id'>
): Promise<Interaction> {
  try {
    const sheets = await getSheets()
    await ensureTab(sheets, INTERACTIONS_TAB, INTERACTION_COLS as string[])
    const item: Interaction = { ...data, id: randomUUID() }
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${INTERACTIONS_TAB}!A:${INTERACTION_LAST}`,
      valueInputOption: 'RAW',
      requestBody: { values: [objToRow(INTERACTION_COLS, item)] },
    })
    return item
  } catch (err) {
    console.error('[sheets] createInteraction failed', err)
    throw err
  }
}

export async function deleteInteraction(id: string): Promise<boolean> {
  try {
    const sheets = await getSheets()
    const rowNum = await findRowInTab(sheets, INTERACTIONS_TAB, id)
    if (rowNum === -1) return false
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId(),
      range: `${INTERACTIONS_TAB}!A${rowNum}:${INTERACTION_LAST}${rowNum}`,
    })
    return true
  } catch (err) {
    console.error('[sheets] deleteInteraction failed', err)
    throw err
  }
}

// ─────────────────────────────────────────────
// Notes
// ─────────────────────────────────────────────

const NOTES_TAB = 'Notes'
const NOTE_COLS: (keyof Note)[] = [
  'id',
  'leadId',
  'content',
  'isReminder',
  'reminderDate',
  'createdAt',
]
const NOTE_LAST = 'F'

export async function getNotesByLeadId(leadId: string): Promise<Note[]> {
  try {
    const sheets = await getSheets()
    await ensureTab(sheets, NOTES_TAB, NOTE_COLS as string[])
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${NOTES_TAB}!A2:${NOTE_LAST}`,
    })
    const rows = res.data.values ?? []
    return rows
      .filter((r) => r[0] && r[1] === leadId)
      .map((r) => rowToObj<Note>(NOTE_COLS, r))
  } catch (err) {
    console.error('[sheets] getNotesByLeadId failed', err)
    throw err
  }
}

export async function createNote(data: Omit<Note, 'id'>): Promise<Note> {
  try {
    const sheets = await getSheets()
    await ensureTab(sheets, NOTES_TAB, NOTE_COLS as string[])
    const item: Note = { ...data, id: randomUUID() }
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${NOTES_TAB}!A:${NOTE_LAST}`,
      valueInputOption: 'RAW',
      requestBody: { values: [objToRow(NOTE_COLS, item)] },
    })
    return item
  } catch (err) {
    console.error('[sheets] createNote failed', err)
    throw err
  }
}

export async function updateNote(
  id: string,
  patch: Partial<Note>
): Promise<Note | null> {
  try {
    const sheets = await getSheets()
    const rowNum = await findRowInTab(sheets, NOTES_TAB, id)
    if (rowNum === -1) return null
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${NOTES_TAB}!A${rowNum}:${NOTE_LAST}${rowNum}`,
    })
    const current = rowToObj<Note>(NOTE_COLS, existing.data.values?.[0] ?? [])
    const merged: Note = { ...current, ...patch, id }
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId(),
      range: `${NOTES_TAB}!A${rowNum}:${NOTE_LAST}${rowNum}`,
      valueInputOption: 'RAW',
      requestBody: { values: [objToRow(NOTE_COLS, merged)] },
    })
    return merged
  } catch (err) {
    console.error('[sheets] updateNote failed', err)
    throw err
  }
}

export async function deleteNote(id: string): Promise<boolean> {
  try {
    const sheets = await getSheets()
    const rowNum = await findRowInTab(sheets, NOTES_TAB, id)
    if (rowNum === -1) return false
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId(),
      range: `${NOTES_TAB}!A${rowNum}:${NOTE_LAST}${rowNum}`,
    })
    return true
  } catch (err) {
    console.error('[sheets] deleteNote failed', err)
    throw err
  }
}

// ─────────────────────────────────────────────
// Documents (metadata only)
// ─────────────────────────────────────────────

const DOCUMENTS_TAB = 'Documents'
const DOC_COLS: (keyof Document)[] = [
  'id',
  'leadId',
  'fileName',
  'fileType',
  'fileSize',
  'driveFileId',
  'uploadedAt',
]
const DOC_LAST = 'G'

export async function getDocumentsByLeadId(
  leadId: string
): Promise<Document[]> {
  try {
    const sheets = await getSheets()
    await ensureTab(sheets, DOCUMENTS_TAB, DOC_COLS as string[])
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId(),
      range: `${DOCUMENTS_TAB}!A2:${DOC_LAST}`,
    })
    const rows = res.data.values ?? []
    return rows
      .filter((r) => r[0] && r[1] === leadId)
      .map((r) => rowToObj<Document>(DOC_COLS, r))
  } catch (err) {
    console.error('[sheets] getDocumentsByLeadId failed', err)
    throw err
  }
}

export async function createDocument(
  data: Omit<Document, 'id'>
): Promise<Document> {
  try {
    const sheets = await getSheets()
    await ensureTab(sheets, DOCUMENTS_TAB, DOC_COLS as string[])
    const item: Document = { ...data, id: randomUUID() }
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId(),
      range: `${DOCUMENTS_TAB}!A:${DOC_LAST}`,
      valueInputOption: 'RAW',
      requestBody: { values: [objToRow(DOC_COLS, item)] },
    })
    return item
  } catch (err) {
    console.error('[sheets] createDocument failed', err)
    throw err
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    const sheets = await getSheets()
    const rowNum = await findRowInTab(sheets, DOCUMENTS_TAB, id)
    if (rowNum === -1) return false
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId(),
      range: `${DOCUMENTS_TAB}!A${rowNum}:${DOC_LAST}${rowNum}`,
    })
    return true
  } catch (err) {
    console.error('[sheets] deleteDocument failed', err)
    throw err
  }
}

export { HEADER_RANGE }

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost'

// Service types are dynamic — stored in the ServiceTypes sheet tab.
// The type is just a string; DEFAULT_SERVICE_TYPES below is the seed list.
export type ServiceType = string

export type Lead = {
  id: string
  contactName: string
  email: string
  phone: string
  company: string
  serviceType: ServiceType
  leadSource: string
  assignedTo: string
  status: LeadStatus
  region: string
  notes: string
  createdAt: string
  dealValue: string
  tags: string
  followUpDate: string
  // Competitor listings (column P–T). Stores the listing URL when listed,
  // empty string when not. Populated by Deep Search.
  competitorKkday: string      // P
  competitorKlook: string      // Q
  competitorGyg: string        // R
  competitorViator: string     // S
  competitorAirbnb: string     // T
}

export const COMPETITOR_PLATFORMS = [
  { key: 'competitorKkday', label: 'KKday' },
  { key: 'competitorKlook', label: 'Klook' },
  { key: 'competitorGyg', label: 'GetYourGuide' },
  { key: 'competitorViator', label: 'Viator' },
  { key: 'competitorAirbnb', label: 'Airbnb' },
] as const

export type CompetitorPlatformKey = (typeof COMPETITOR_PLATFORMS)[number]['key']

export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
]

export type Member = {
  id: string
  name: string
  email: string
  phone: string
  businessTitle: string
  slackId: string
  createdAt: string
}

export type InteractionType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'video_call'
  | 'note'

export type Interaction = {
  id: string
  leadId: string
  type: InteractionType
  title: string
  body: string
  tags: string
  date: string
  createdBy: string
}

export type Note = {
  id: string
  leadId: string
  content: string
  isReminder: string
  reminderDate: string
  createdAt: string
}

export type Document = {
  id: string
  leadId: string
  fileName: string
  fileType: string
  fileSize: string
  driveFileId: string
  uploadedAt: string
}

export type Contact = {
  id: string
  leadId: string
  name: string
  role: string
  email: string
  phone: string
  isPrimary: string // 'true' | 'false'
  createdAt: string
}

export const DEFAULT_SERVICE_TYPES: string[] = [
  'Tours & Day Trips',
  'Cultural Experience',
  'Theme Park & Entertainment',
  'Food & Dining',
  'Museum & Gallery',
  'Outdoor & Sports',
  'Observation & Landmark',
  'Cruise & Water',
  'Transport & Pass',
  'Wellness & Spa',
  'Other',
]

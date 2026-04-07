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
}

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

export const DEFAULT_SERVICE_TYPES: string[] = [
  'Tea Ceremony',
  'Traditional Arts',
  'Onsen Resort',
  'Animation Tour',
  'Food Experience',
  'Cultural Workshop',
  'Museum',
  'Tour Operator',
  'Other',
]

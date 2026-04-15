export type Priority = 'high' | 'medium' | 'low';

export type Status = 'open' | 'in_progress' | 'done';

export type Category =
  | 'prospects_bd'
  | 'investors'
  | 'partnerships'
  | 'internal_ops'
  | 'legal_compliance';

export const CATEGORY_LABELS: Record<Category, string> = {
  prospects_bd: 'Prospects / BD',
  investors: 'Investors',
  partnerships: 'Partnerships',
  internal_ops: 'Internal / Ops',
  legal_compliance: 'Legal / Compliance',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  prospects_bd: 'bg-blue-100 text-blue-800',
  investors: 'bg-purple-100 text-purple-800',
  partnerships: 'bg-green-100 text-green-800',
  internal_ops: 'bg-orange-100 text-orange-800',
  legal_compliance: 'bg-red-100 text-red-800',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
};

export const STATUS_COLORS: Record<Status, string> = {
  open: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

export const DURATION_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour',     value: 60 },
  { label: '90 minutes', value: 90 },
  { label: '2 hours',    value: 120 },
  { label: 'Half day',   value: 240 },
  { label: 'Full day',   value: 480 },
];

export interface ActionItem {
  id: string;
  title: string;
  category: Category;
  contact: string;              // free-text display fallback during migration
  contactId: string | null;     // FK to Contact (preferred; use when set)
  dealId: string | null;        // FK to Deal (optional link to pipeline)
  assignedTo: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notified: boolean;
  calendarDuration: number | null;
  calendarInviteSent: boolean;
  calendarInviteSentAt: string | null;
}

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  passwordHash: string;
  email: string;
}

export interface AppData {
  version: string;
  items: ActionItem[];
  users: AppUser[];
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  cadences: Cadence[];
  rounds: Round[];
  investorEngagements: InvestorEngagement[];
  lastSaved: string;
}

// -----------------------------------------------------------------------------
// Phase 2a relational model
// -----------------------------------------------------------------------------

export type CompanyType =
  | 'federal_agency'
  | 'commercial'
  | 'investor'
  | 'partner'
  | 'distributor'
  | 'reseller';

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  federal_agency: 'Federal Agency',
  commercial: 'Commercial',
  investor: 'Investor',
  partner: 'Partner',
  distributor: 'Distributor',
  reseller: 'Reseller',
};

export type AgencyTier = 'cabinet' | 'dod' | 'civilian' | 'sub_agency';

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  parentId: string | null;      // for agency sub-org nesting
  website: string;
  notes: string;
  agencyCode: string | null;    // e.g. "DISA", "ARCYBER"
  agencyTier: AgencyTier | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  companyId: string | null;
  tags: string[];
  source: string;
  notes: string;
  lastTouchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DealStage = 'lead' | 'pilot' | 'proposal' | 'close';
export type DealType = 'SBIR' | 'OTA' | 'Direct' | 'GSA' | 'Other';

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  pilot: 'Pilot',
  proposal: 'Proposal',
  close: 'Close',
};

export const DEAL_STAGE_ORDER: DealStage[] = ['lead', 'pilot', 'proposal', 'close'];

/**
 * A tracked opportunity. Always owned by a Corticle team member
 * (ownerUserId → AppUser.id). Channel attribution lives on the Deal
 * as optional distributor + reseller Company FKs.
 */
export interface Deal {
  id: string;
  name: string;
  companyId: string;                    // FK to Company (end customer)
  primaryContactId: string | null;      // FK to Contact
  ownerUserId: string;                  // FK to AppUser — Corticle team only
  stage: DealStage;
  dealType: DealType;
  contractVehicle: string;              // free-text fallback
  dealSize: number;                     // USD
  probability: number;                  // 0-100
  expectedCloseDate: string;
  // Channel
  distributorCompanyId: string | null;  // FK to Company (type: distributor)
  resellerCompanyId: string | null;     // FK to Company (type: reseller)
  // Account playbook
  playbookEntry: string;
  playbookHook: string;
  playbookPilot: string;
  playbookExpansion: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'email' | 'call' | 'meeting' | 'linkedin' | 'note' | 'pilot_milestone';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  linkedin: 'LinkedIn',
  note: 'Note',
  pilot_milestone: 'Pilot milestone',
};

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  body: string;
  contactId: string | null;
  companyId: string | null;     // rollup
  dealId: string | null;        // rollup
  userId: string;               // who logged it (AppUser.id)
  occurredAt: string;
  createdAt: string;
}

export interface Cadence {
  id: string;
  contactId: string;
  intervalDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Fundraising
// -----------------------------------------------------------------------------

export type RoundStatus = 'planning' | 'open' | 'closed';

export interface Round {
  id: string;
  name: string;                 // "Seed 2026", "Series A"
  targetAmount: number;
  raisedAmount: number;
  status: RoundStatus;
  openedAt: string;
  closedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestorStage =
  | 'target'
  | 'intro'
  | 'pitch'
  | 'diligence'
  | 'term_sheet'
  | 'committed'
  | 'passed';

export const INVESTOR_STAGE_LABELS: Record<InvestorStage, string> = {
  target: 'Target',
  intro: 'Intro',
  pitch: 'Pitch',
  diligence: 'Diligence',
  term_sheet: 'Term Sheet',
  committed: 'Committed',
  passed: 'Passed',
};

export const INVESTOR_STAGE_ORDER: InvestorStage[] = [
  'target', 'intro', 'pitch', 'diligence', 'term_sheet', 'committed', 'passed',
];

/**
 * One investor firm's state in a specific fundraising round.
 * Separate from Deal because investor lifecycle and stages differ.
 */
export interface InvestorEngagement {
  id: string;
  roundId: string;                      // FK to Round
  investorCompanyId: string;            // FK to Company (type: 'investor')
  primaryContactId: string | null;      // FK to Contact
  ownerUserId: string;                  // FK to AppUser — Corticle team only
  stage: InvestorStage;
  checkSize: number;                    // USD offered/considered
  isLead: boolean;
  lastTouchedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
  email: string;
  loginTime: string;
}

export interface FilterState {
  category: Category | 'all';
  priority: Priority | 'all';
  status: Status | 'all';
  assignedTo: string;
  search: string;
}

export interface SmsReminder {
  to: string;
  itemId: string;
  message: string;
  scheduledFor: string;
}

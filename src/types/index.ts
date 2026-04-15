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
  contact: string;
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
}

export interface AppData {
  version: string;
  items: ActionItem[];
  users: AppUser[];
  lastSaved: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: 'admin' | 'member';
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

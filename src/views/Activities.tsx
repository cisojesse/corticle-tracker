import { useState, useMemo } from 'react';
import { useAuth } from '@/auth/AuthContext';
import type { useStorage } from '@/hooks/useStorage';
import type { Activity, ActivityType, Contact } from '@/types';
import { ACTIVITY_TYPE_LABELS } from '@/types';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { formatDueDate, nowISO } from '@/utils/dateHelpers';
import {
  Plus, Pencil, Trash2, ClipboardList,
  Mail, Phone, Users, Share2, StickyNote, Milestone,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface Props {
  storage: ReturnType<typeof useStorage>;
}

const TYPE_ICON: Record<ActivityType, typeof Mail> = {
  email: Mail,
  call: Phone,
  meeting: Users,
  linkedin: Share2,
  note: StickyNote,
  pilot_milestone: Milestone,
};

const TYPE_COLOR: Record<ActivityType, string> = {
  email: 'bg-blue-100 text-blue-600',
  call: 'bg-green-100 text-green-600',
  meeting: 'bg-purple-100 text-purple-600',
  linkedin: 'bg-sky-100 text-sky-600',
  note: 'bg-amber-100 text-amber-600',
  pilot_milestone: 'bg-red-100 text-red-600',
};

// ---------------------------------------------------------------------------
// Activities view
// ---------------------------------------------------------------------------

export default function Activities({ storage }: Props) {
  const { session } = useAuth();
  const fileRequired = storage.syncStatus === 'no_file';

  const { activities, contacts, companies, deals, users } = storage.data;
  const contactById = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);
  const companyById = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);
  const dealById = useMemo(() => new Map(deals.map(d => [d.id, d])), [deals]);
  const userById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  // Modal
  const [modalActivity, setModalActivity] = useState<Activity | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [dealFilter, setDealFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...activities];
    if (typeFilter !== 'all') result = result.filter(a => a.type === typeFilter);
    if (contactFilter !== 'all') result = result.filter(a => a.contactId === contactFilter);
    if (dealFilter !== 'all') result = result.filter(a => a.dealId === dealFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.subject.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q),
      );
    }
    // Sort newest first
    return result.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [activities, typeFilter, contactFilter, dealFilter, search]);

  // Contacts/deals that have activities (for filter dropdowns)
  const contactsWithActivities = useMemo(
    () => [...new Set(activities.map(a => a.contactId).filter(Boolean))] as string[],
    [activities],
  );
  const dealsWithActivities = useMemo(
    () => [...new Set(activities.map(a => a.dealId).filter(Boolean))] as string[],
    [activities],
  );

  function contactDisplayName(c: Contact): string {
    const full = `${c.firstName} ${c.lastName}`.trim();
    return full || c.title || '(unnamed)';
  }

  function handleSave(activity: Activity) {
    const exists = activities.find(a => a.id === activity.id);
    if (exists) {
      storage.updateActivity(activity);
    } else {
      storage.addActivity(activity);
    }

    // Update Contact.lastTouchedAt if activity has a contactId
    if (activity.contactId) {
      const contact = contacts.find(c => c.id === activity.contactId);
      if (contact) {
        const now = nowISO();
        // Only update if this activity is more recent
        if (!contact.lastTouchedAt || activity.occurredAt > contact.lastTouchedAt) {
          storage.updateContact({ ...contact, lastTouchedAt: activity.occurredAt, updatedAt: now });
        }
      }
    }
  }

  function handleDelete(id: string) {
    storage.deleteActivity(id);
    setDeleteConfirm(null);
  }

  // Group by date for timeline display
  const grouped = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of filtered) {
      const dateKey = a.occurredAt.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(a);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'} logged
          </p>
        </div>
        <button
          onClick={() => setModalActivity(null)}
          disabled={fileRequired}
          className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Log Activity
        </button>
      </div>

      {fileRequired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Open or create a data file (header toolbar) before logging activities.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search subject or details..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent w-64"
          aria-label="Search activities"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as ActivityType | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={contactFilter}
          onChange={e => setContactFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by contact"
        >
          <option value="all">All contacts</option>
          {contactsWithActivities.map(id => {
            const c = contactById.get(id);
            return c ? <option key={id} value={id}>{contactDisplayName(c)}</option> : null;
          })}
        </select>
        <select
          value={dealFilter}
          onChange={e => setDealFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by deal"
        >
          <option value="all">All deals</option>
          {dealsWithActivities.map(id => {
            const d = dealById.get(id);
            return d ? <option key={id} value={id}>{d.name}</option> : null;
          })}
        </select>
      </div>

      {/* Empty state */}
      {activities.length === 0 && !fileRequired ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ClipboardList size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No activities logged yet.</p>
          <button
            onClick={() => setModalActivity(null)}
            disabled={fileRequired}
            className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Log Your First Activity
          </button>
        </div>
      ) : (
        /* Timeline */
        <div className="space-y-6">
          {filtered.length === 0 && activities.length > 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-400 text-sm">No activities match your filters.</p>
            </div>
          )}

          {grouped.map(([dateKey, dayActivities]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-gray-900">
                  {formatDueDate(dateKey)}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{dayActivities.length}</span>
              </div>

              {/* Activity cards */}
              <div className="space-y-2 ml-4 border-l-2 border-gray-100 pl-4">
                {dayActivities.map(activity => {
                  const Icon = TYPE_ICON[activity.type];
                  const color = TYPE_COLOR[activity.type];
                  const contact = activity.contactId ? contactById.get(activity.contactId) : null;
                  const company = activity.companyId ? companyById.get(activity.companyId) : null;
                  const deal = activity.dealId ? dealById.get(activity.dealId) : null;
                  const user = userById.get(activity.userId);

                  return (
                    <div key={activity.id} className="bg-white rounded-lg border border-gray-200 p-3 relative">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[25px] top-4 w-3 h-3 rounded-full border-2 border-white ${color.split(' ')[0]}`} />

                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                          <Icon size={16} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{activity.subject}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[11px] font-medium text-gray-500 uppercase">
                                  {ACTIVITY_TYPE_LABELS[activity.type]}
                                </span>
                                {contact && (
                                  <span className="text-[11px] text-gray-500">
                                    {contactDisplayName(contact)}
                                  </span>
                                )}
                                {company && (
                                  <span className="text-[11px] text-gray-400">@ {company.name}</span>
                                )}
                                {deal && (
                                  <span className="text-[11px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                    {deal.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <span className="text-[10px] text-gray-400 mr-1">{user?.displayName}</span>
                              <button
                                onClick={() => setModalActivity(activity)}
                                className="p-1 text-gray-400 hover:text-corticle-cyan rounded transition-colors"
                                aria-label="Edit activity"
                              >
                                <Pencil size={14} />
                              </button>
                              {deleteConfirm === activity.id ? (
                                <button
                                  onClick={() => handleDelete(activity.id)}
                                  className="px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                                >
                                  Confirm
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(activity.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                  aria-label="Delete activity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {activity.body && (
                            <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap line-clamp-3">
                              {activity.body}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalActivity !== undefined && (
        <ActivityModal
          activity={modalActivity}
          companies={companies}
          contacts={contacts}
          deals={deals}
          users={users}
          currentUserId={session?.userId ?? ''}
          onSave={handleSave}
          onClose={() => setModalActivity(undefined)}
        />
      )}
    </div>
  );
}

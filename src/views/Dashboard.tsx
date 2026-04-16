import { useState, useMemo } from 'react';
import { useAuth } from '@/auth/AuthContext';
import type { ActionItem, Contact, Cadence, Activity } from '@/types';
import type { useStorage } from '@/hooks/useStorage';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ActionItemModal } from '@/components/items/ActionItemModal';
import { ActivityModal } from '@/components/activities/ActivityModal';
import { isOverdue, isDueSoon, formatDueDate, nowISO } from '@/utils/dateHelpers';
import { CATEGORY_LABELS, CATEGORY_COLORS, PRIORITY_COLORS } from '@/types';
import { Plus, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

// ---------------------------------------------------------------------------
// Cadence overdue computation
// ---------------------------------------------------------------------------

interface CadenceReminder {
  contact: Contact;
  cadence: Cadence;
  companyName: string | null;
  daysOverdue: number;
  lastTouched: string | null; // display-friendly
}

function computeOverdueCadences(
  cadences: Cadence[],
  contacts: Contact[],
  companies: { id: string; name: string }[],
): CadenceReminder[] {
  const contactById = new Map(contacts.map(c => [c.id, c]));
  const companyById = new Map(companies.map(c => [c.id, c.name]));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;

  const reminders: CadenceReminder[] = [];

  for (const cad of cadences) {
    if (!cad.active) continue;
    const contact = contactById.get(cad.contactId);
    if (!contact) continue;

    const lastTouched = contact.lastTouchedAt
      ? new Date(contact.lastTouchedAt)
      : null;

    let daysSinceTouched: number;
    if (lastTouched) {
      lastTouched.setHours(0, 0, 0, 0);
      daysSinceTouched = Math.floor((nowMs - lastTouched.getTime()) / DAY_MS);
    } else {
      // Never touched — treat as infinitely overdue
      daysSinceTouched = 999;
    }

    const daysOverdue = daysSinceTouched - cad.intervalDays;
    if (daysOverdue > 0) {
      reminders.push({
        contact,
        cadence: cad,
        companyName: contact.companyId ? companyById.get(contact.companyId) ?? null : null,
        daysOverdue,
        lastTouched: contact.lastTouchedAt,
      });
    }
  }

  // Most overdue first
  reminders.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return reminders;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard({ storage }: Props) {
  const { session } = useAuth();
  const [modalItem, setModalItem] = useState<ActionItem | null | undefined>(undefined);
  const [activityContactId, setActivityContactId] = useState<string | undefined>(undefined);

  const { items, contacts, companies, deals, cadences, users, activities } = storage.data;

  const overdueItems = items.filter(i => i.status !== 'done' && isOverdue(i.dueDate));
  const dueSoonItems = items.filter(i => i.status !== 'done' && isDueSoon(i.dueDate));

  const cadenceReminders = useMemo(
    () => computeOverdueCadences(cadences, contacts, companies),
    [cadences, contacts, companies],
  );

  function handleSave(item: ActionItem) {
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      storage.updateItem(item);
    } else {
      storage.addItem(item);
    }
  }

  function handleActivitySave(activity: Activity) {
    const exists = activities.find(a => a.id === activity.id);
    if (exists) {
      storage.updateActivity(activity);
    } else {
      storage.addActivity(activity);
    }

    // Update Contact.lastTouchedAt
    if (activity.contactId) {
      const contact = contacts.find(c => c.id === activity.contactId);
      if (contact) {
        const now = nowISO();
        if (!contact.lastTouchedAt || activity.occurredAt > contact.lastTouchedAt) {
          storage.updateContact({ ...contact, lastTouchedAt: activity.occurredAt, updatedAt: now });
        }
      }
    }
  }

  function contactName(c: Contact): string {
    return `${c.firstName} ${c.lastName}`.trim() || '(unnamed)';
  }

  function formatInterval(days: number): string {
    if (days === 7) return 'weekly';
    if (days === 14) return 'bi-weekly';
    if (days === 30) return 'monthly';
    if (days === 90) return 'quarterly';
    return `every ${days}d`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} total item{items.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <button
          onClick={() => setModalItem(null)}
          className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
          aria-label="Create new action item"
        >
          <Plus size={18} />
          New Item
        </button>
      </div>

      {/* Stats */}
      <DashboardStats items={items} cadenceOverdueCount={cadenceReminders.length} />

      {/* Cadence reminders panel */}
      {cadenceReminders.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-800 mb-3">
            <RefreshCw size={16} />
            Needs Touch ({cadenceReminders.length})
          </h2>
          <div className="space-y-2">
            {cadenceReminders.slice(0, 5).map(r => (
              <button
                key={r.contact.id}
                onClick={() => setActivityContactId(r.contact.id)}
                className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm hover:bg-orange-50 transition-colors text-left"
                aria-label={`Log activity for ${contactName(r.contact)}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{contactName(r.contact)}</p>
                  <p className="text-xs text-gray-500">
                    {r.companyName ?? 'Unaffiliated'} · {formatInterval(r.cadence.intervalDays)}
                  </p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-orange-700 font-medium">
                    {r.daysOverdue >= 999 ? 'Never touched' : `${r.daysOverdue}d overdue`}
                  </p>
                  {r.lastTouched && (
                    <p className="text-[10px] text-gray-400">
                      Last: {formatDueDate(r.lastTouched)}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {cadenceReminders.length > 5 && (
              <p className="text-xs text-orange-600 text-center">+{cadenceReminders.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Overdue panel */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-3">
            <AlertTriangle size={16} />
            Overdue ({overdueItems.length})
          </h2>
          <div className="space-y-2">
            {overdueItems.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => setModalItem(item)}
                className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors text-left"
                aria-label={`Edit overdue item: ${item.title}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.contact}</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-red-600 font-medium">{formatDueDate(item.dueDate)}</p>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[item.priority]}`}>
                    {item.priority}
                  </span>
                </div>
              </button>
            ))}
            {overdueItems.length > 5 && (
              <p className="text-xs text-red-600 text-center">+{overdueItems.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Due soon panel */}
      {dueSoonItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-yellow-800 mb-3">
            <Clock size={16} />
            Due Soon ({dueSoonItems.length})
          </h2>
          <div className="space-y-2">
            {dueSoonItems.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => setModalItem(item)}
                className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm hover:bg-yellow-50 transition-colors text-left"
                aria-label={`Edit due-soon item: ${item.title}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.contact}</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-yellow-700 font-medium">{formatDueDate(item.dueDate)}</p>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[item.category]}`}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent items */}
      {items.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recently Updated</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[...items]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 8)
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => setModalItem(item)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-left"
                  aria-label={`Edit item: ${item.title}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.contact} · {item.assignedTo}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-gray-400">{formatDueDate(item.dueDate)}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">No action items yet.</p>
          <button
            onClick={() => setModalItem(null)}
            className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
          >
            <Plus size={18} />
            Create Your First Item
          </button>
        </div>
      )}

      {/* Action item modal */}
      {modalItem !== undefined && (
        <ActionItemModal
          item={modalItem}
          onSave={handleSave}
          onClose={() => setModalItem(undefined)}
        />
      )}

      {/* Activity modal — opened from cadence reminder "log touch" */}
      {activityContactId !== undefined && (
        <ActivityModal
          companies={companies}
          contacts={contacts}
          deals={deals}
          users={users}
          currentUserId={session?.userId ?? ''}
          defaultContactId={activityContactId}
          onSave={activity => {
            handleActivitySave(activity);
            setActivityContactId(undefined);
          }}
          onClose={() => setActivityContactId(undefined)}
        />
      )}
    </div>
  );
}

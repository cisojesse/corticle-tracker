import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Activity, ActivityType, Company, Contact, Deal, AppUser } from '@/types';
import { ACTIVITY_TYPE_LABELS, COMPANY_TYPE_LABELS } from '@/types';
import { sanitizeShortText, sanitizeText } from '@/utils/sanitize';
import { nowISO, toISODate } from '@/utils/dateHelpers';
import { X } from 'lucide-react';

interface Props {
  activity?: Activity | null;
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  users: AppUser[];
  currentUserId: string;
  onSave: (activity: Activity) => void;
  onClose: () => void;
  /** Pre-fill contact when logging from a contact context */
  defaultContactId?: string;
  /** Pre-fill deal when logging from a deal context */
  defaultDealId?: string;
}

const TYPES: ActivityType[] = ['email', 'call', 'meeting', 'linkedin', 'note', 'pilot_milestone'];

export function ActivityModal({
  activity,
  companies,
  contacts,
  deals,
  currentUserId,
  onSave,
  onClose,
  defaultContactId,
  defaultDealId,
}: Props) {
  const isEdit = !!activity;

  const [type, setType] = useState<ActivityType>(activity?.type ?? 'note');
  const [subject, setSubject] = useState(activity?.subject ?? '');
  const [body, setBody] = useState(activity?.body ?? '');
  const [contactId, setContactId] = useState(activity?.contactId ?? defaultContactId ?? '');
  const [companyId, setCompanyId] = useState(activity?.companyId ?? '');
  const [dealId, setDealId] = useState(activity?.dealId ?? defaultDealId ?? '');
  const [occurredAt, setOccurredAt] = useState(
    activity?.occurredAt
      ? activity.occurredAt.slice(0, 10)
      : toISODate(new Date()),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const sortedContacts = useMemo(
    () =>
      [...contacts].sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`.trim() || a.title;
        const nameB = `${b.lastName} ${b.firstName}`.trim() || b.title;
        return nameA.localeCompare(nameB);
      }),
    [contacts],
  );

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  const sortedDeals = useMemo(
    () => [...deals].sort((a, b) => a.name.localeCompare(b.name)),
    [deals],
  );

  // Auto-fill company when contact is selected
  useEffect(() => {
    if (contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact?.companyId && !companyId) {
        setCompanyId(contact.companyId);
      }
    }
  }, [contactId, contacts, companyId]);

  function contactDisplayName(c: Contact): string {
    const full = `${c.firstName} ${c.lastName}`.trim();
    return full || c.title || '(unnamed)';
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!sanitizeShortText(subject)) errs.subject = 'Subject is required';
    if (!occurredAt) errs.occurredAt = 'Date is required';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);

    const now = nowISO();
    const saved: Activity = {
      id: activity?.id ?? uuidv4(),
      type,
      subject: sanitizeShortText(subject),
      body: sanitizeText(body),
      contactId: contactId || null,
      companyId: companyId || null,
      dealId: dealId || null,
      userId: activity?.userId ?? currentUserId,
      occurredAt: occurredAt ? `${occurredAt}T12:00:00.000Z` : now,
      createdAt: activity?.createdAt ?? now,
    };
    onSave(saved);
    onClose();
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent';
  const selectCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="activity-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Activity' : 'Log Activity'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="a-type" className={labelCls}>Type</label>
              <select id="a-type" value={type} onChange={e => setType(e.target.value as ActivityType)} className={selectCls}>
                {TYPES.map(t => (
                  <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="a-date" className={labelCls}>Date *</label>
              <input id="a-date" type="date" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} className={inputCls} />
              {errors.occurredAt && <p className="text-xs text-red-500 mt-1">{errors.occurredAt}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="a-subject" className={labelCls}>Subject *</label>
            <input id="a-subject" type="text" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} autoFocus placeholder="Introductory call with CIO" />
            {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label htmlFor="a-body" className={labelCls}>Details</label>
            <textarea id="a-body" rows={3} value={body} onChange={e => setBody(e.target.value)} className={`${inputCls} resize-none`} placeholder="Key takeaways, next steps..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="a-contact" className={labelCls}>Contact</label>
              <select id="a-contact" value={contactId} onChange={e => setContactId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {sortedContacts.map(c => (
                  <option key={c.id} value={c.id}>{contactDisplayName(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="a-company" className={labelCls}>Company</label>
              <select id="a-company" value={companyId} onChange={e => setCompanyId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {sortedCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({COMPANY_TYPE_LABELS[c.type]})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="a-deal" className={labelCls}>Deal</label>
            <select id="a-deal" value={dealId} onChange={e => setDealId(e.target.value)} className={selectCls}>
              <option value="">— None —</option>
              {sortedDeals.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors">
              {isEdit ? 'Save Changes' : 'Log Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

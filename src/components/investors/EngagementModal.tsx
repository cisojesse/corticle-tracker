import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { InvestorEngagement, InvestorStage, Company, Contact, AppUser } from '@/types';
import { INVESTOR_STAGE_LABELS, INVESTOR_STAGE_ORDER } from '@/types';
import { sanitizeText } from '@/utils/sanitize';
import { nowISO } from '@/utils/dateHelpers';
import { X } from 'lucide-react';

interface Props {
  engagement?: InvestorEngagement | null;
  roundId: string;
  companies: Company[];
  contacts: Contact[];
  users: AppUser[];
  currentUserId: string;
  onSave: (e: InvestorEngagement) => void;
  onClose: () => void;
  defaultStage?: InvestorStage;
}

export function EngagementModal({
  engagement,
  roundId,
  companies,
  contacts,
  users,
  currentUserId,
  onSave,
  onClose,
  defaultStage,
}: Props) {
  const isEdit = !!engagement;

  const [investorCompanyId, setInvestorCompanyId] = useState(engagement?.investorCompanyId ?? '');
  const [primaryContactId, setPrimaryContactId] = useState(engagement?.primaryContactId ?? '');
  const [ownerUserId, setOwnerUserId] = useState(engagement?.ownerUserId ?? currentUserId);
  const [stage, setStage] = useState<InvestorStage>(engagement?.stage ?? defaultStage ?? 'target');
  const [checkSize, setCheckSize] = useState(engagement?.checkSize?.toString() ?? '');
  const [isLead, setIsLead] = useState(engagement?.isLead ?? false);
  const [notes, setNotes] = useState(engagement?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Only investor-type companies
  const investorCompanies = useMemo(
    () => companies.filter(c => c.type === 'investor').sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  // Contacts filtered to selected investor company
  const filteredContacts = useMemo(
    () =>
      contacts
        .filter(c => !investorCompanyId || c.companyId === investorCompanyId || !c.companyId)
        .sort((a, b) => {
          const nameA = `${a.lastName} ${a.firstName}`.trim() || a.title;
          const nameB = `${b.lastName} ${b.firstName}`.trim() || b.title;
          return nameA.localeCompare(nameB);
        }),
    [contacts, investorCompanyId],
  );

  function contactDisplayName(c: Contact): string {
    const full = `${c.firstName} ${c.lastName}`.trim();
    return full || c.title || '(unnamed)';
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!investorCompanyId) errs.investorCompanyId = 'Investor firm is required';
    if (!ownerUserId) errs.ownerUserId = 'Owner is required';
    const size = Number(checkSize);
    if (checkSize && (isNaN(size) || !isFinite(size) || size < 0)) errs.checkSize = 'Must be a positive number';
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
    const saved: InvestorEngagement = {
      id: engagement?.id ?? uuidv4(),
      roundId,
      investorCompanyId,
      primaryContactId: primaryContactId || null,
      ownerUserId,
      stage,
      checkSize: Number(checkSize) || 0,
      isLead,
      lastTouchedAt: engagement?.lastTouchedAt ?? now,
      notes: sanitizeText(notes),
      createdAt: engagement?.createdAt ?? now,
      updatedAt: now,
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
      aria-labelledby="eng-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="eng-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Engagement' : 'New Investor Engagement'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="e-investor" className={labelCls}>Investor Firm *</label>
            <select id="e-investor" value={investorCompanyId} onChange={e => setInvestorCompanyId(e.target.value)} className={selectCls}>
              <option value="">— Select —</option>
              {investorCompanies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {investorCompanies.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No investor-type companies yet — create one in Companies first.</p>
            )}
            {errors.investorCompanyId && <p className="text-xs text-red-500 mt-1">{errors.investorCompanyId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="e-contact" className={labelCls}>Primary Contact</label>
              <select id="e-contact" value={primaryContactId} onChange={e => setPrimaryContactId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {filteredContacts.map(c => (
                  <option key={c.id} value={c.id}>{contactDisplayName(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="e-owner" className={labelCls}>Owner *</label>
              <select id="e-owner" value={ownerUserId} onChange={e => setOwnerUserId(e.target.value)} className={selectCls}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
              {errors.ownerUserId && <p className="text-xs text-red-500 mt-1">{errors.ownerUserId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="e-stage" className={labelCls}>Stage</label>
              <select id="e-stage" value={stage} onChange={e => setStage(e.target.value as InvestorStage)} className={selectCls}>
                {INVESTOR_STAGE_ORDER.map(s => (
                  <option key={s} value={s}>{INVESTOR_STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="e-check" className={labelCls}>Check Size ($)</label>
              <input id="e-check" type="number" min="0" step="10000" value={checkSize} onChange={e => setCheckSize(e.target.value)} className={inputCls} placeholder="250000" />
              {errors.checkSize && <p className="text-xs text-red-500 mt-1">{errors.checkSize}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="e-lead" type="checkbox" checked={isLead} onChange={e => setIsLead(e.target.checked)} className="rounded border-gray-300" />
            <label htmlFor="e-lead" className="text-sm text-gray-700">Lead investor</label>
          </div>

          <div>
            <label htmlFor="e-notes" className={labelCls}>Notes</label>
            <textarea id="e-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors">
              {isEdit ? 'Save Changes' : 'Add Engagement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

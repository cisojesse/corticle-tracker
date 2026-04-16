import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Deal, DealStage, DealType, Company, Contact, AppUser } from '@/types';
import { DEAL_STAGE_LABELS, COMPANY_TYPE_LABELS } from '@/types';
import { sanitizeShortText, sanitizeText } from '@/utils/sanitize';
import { nowISO } from '@/utils/dateHelpers';
import { X } from 'lucide-react';

interface Props {
  deal?: Deal | null;
  companies: Company[];
  contacts: Contact[];
  users: AppUser[];
  currentUserId: string;
  onSave: (deal: Deal) => void;
  onClose: () => void;
  defaultStage?: DealStage;
}

const DEAL_TYPES: DealType[] = ['SBIR', 'OTA', 'Direct', 'GSA', 'Other'];
const STAGES: DealStage[] = ['lead', 'pilot', 'proposal', 'close'];

export function DealModal({
  deal,
  companies,
  contacts,
  users,
  currentUserId,
  onSave,
  onClose,
  defaultStage,
}: Props) {
  const isEdit = !!deal;

  const [name, setName] = useState(deal?.name ?? '');
  const [companyId, setCompanyId] = useState(deal?.companyId ?? '');
  const [primaryContactId, setPrimaryContactId] = useState(deal?.primaryContactId ?? '');
  const [ownerUserId, setOwnerUserId] = useState(deal?.ownerUserId ?? currentUserId);
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? defaultStage ?? 'lead');
  const [dealType, setDealType] = useState<DealType>(deal?.dealType ?? 'SBIR');
  const [contractVehicle, setContractVehicle] = useState(deal?.contractVehicle ?? '');
  const [dealSize, setDealSize] = useState(deal?.dealSize?.toString() ?? '');
  const [probability, setProbability] = useState(deal?.probability?.toString() ?? '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal?.expectedCloseDate ?? '');
  const [distributorCompanyId, setDistributorCompanyId] = useState(deal?.distributorCompanyId ?? '');
  const [resellerCompanyId, setResellerCompanyId] = useState(deal?.resellerCompanyId ?? '');
  const [playbookEntry, setPlaybookEntry] = useState(deal?.playbookEntry ?? '');
  const [playbookHook, setPlaybookHook] = useState(deal?.playbookHook ?? '');
  const [playbookPilot, setPlaybookPilot] = useState(deal?.playbookPilot ?? '');
  const [playbookExpansion, setPlaybookExpansion] = useState(deal?.playbookExpansion ?? '');
  const [notes, setNotes] = useState(deal?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  const distributors = useMemo(
    () => sortedCompanies.filter(c => c.type === 'distributor'),
    [sortedCompanies],
  );

  const resellers = useMemo(
    () => sortedCompanies.filter(c => c.type === 'reseller'),
    [sortedCompanies],
  );

  // Contacts filtered to selected company (+ unaffiliated)
  const filteredContacts = useMemo(
    () =>
      contacts
        .filter(c => !companyId || c.companyId === companyId || !c.companyId)
        .sort((a, b) => {
          const nameA = `${a.lastName} ${a.firstName}`.trim() || a.title;
          const nameB = `${b.lastName} ${b.firstName}`.trim() || b.title;
          return nameA.localeCompare(nameB);
        }),
    [contacts, companyId],
  );

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!sanitizeShortText(name)) errs.name = 'Deal name is required';
    if (!companyId) errs.companyId = 'Company is required';
    if (!ownerUserId) errs.ownerUserId = 'Owner is required';
    const size = Number(dealSize);
    if (dealSize && (isNaN(size) || !isFinite(size) || size < 0)) errs.dealSize = 'Must be a positive number';
    const prob = Number(probability);
    if (probability && (isNaN(prob) || !isFinite(prob) || prob < 0 || prob > 100)) errs.probability = '0-100';
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
    const saved: Deal = {
      id: deal?.id ?? uuidv4(),
      name: sanitizeShortText(name),
      companyId,
      primaryContactId: primaryContactId || null,
      ownerUserId,
      stage,
      dealType,
      contractVehicle: sanitizeShortText(contractVehicle),
      dealSize: Number(dealSize) || 0,
      probability: Number(probability) || 0,
      expectedCloseDate: expectedCloseDate || '',
      distributorCompanyId: distributorCompanyId || null,
      resellerCompanyId: resellerCompanyId || null,
      playbookEntry: sanitizeText(playbookEntry),
      playbookHook: sanitizeText(playbookHook),
      playbookPilot: sanitizeText(playbookPilot),
      playbookExpansion: sanitizeText(playbookExpansion),
      notes: sanitizeText(notes),
      createdAt: deal?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(saved);
    onClose();
  }

  function contactDisplayName(c: Contact): string {
    const full = `${c.firstName} ${c.lastName}`.trim();
    return full || c.title || '(unnamed)';
  }

  // Input class shorthand
  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent';
  const selectCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="deal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="deal-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Deal' : 'New Deal'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* ── Core ── */}
          <div>
            <label htmlFor="d-name" className={labelCls}>Deal Name *</label>
            <input id="d-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} autoFocus placeholder="ARCYBER SBIR Phase II" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-company" className={labelCls}>Company (end customer) *</label>
              <select id="d-company" value={companyId} onChange={e => setCompanyId(e.target.value)} className={selectCls}>
                <option value="">— Select —</option>
                {sortedCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({COMPANY_TYPE_LABELS[c.type]})</option>
                ))}
              </select>
              {errors.companyId && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
            </div>
            <div>
              <label htmlFor="d-contact" className={labelCls}>Primary Contact</label>
              <select id="d-contact" value={primaryContactId} onChange={e => setPrimaryContactId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {filteredContacts.map(c => (
                  <option key={c.id} value={c.id}>{contactDisplayName(c)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="d-owner" className={labelCls}>Owner *</label>
              <select id="d-owner" value={ownerUserId} onChange={e => setOwnerUserId(e.target.value)} className={selectCls}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
              {errors.ownerUserId && <p className="text-xs text-red-500 mt-1">{errors.ownerUserId}</p>}
            </div>
            <div>
              <label htmlFor="d-stage" className={labelCls}>Stage</label>
              <select id="d-stage" value={stage} onChange={e => setStage(e.target.value as DealStage)} className={selectCls}>
                {STAGES.map(s => (
                  <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Deal Details ── */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Deal Details</legend>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="d-type" className={labelCls}>Type</label>
                <select id="d-type" value={dealType} onChange={e => setDealType(e.target.value as DealType)} className={selectCls}>
                  {DEAL_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="d-size" className={labelCls}>Size ($)</label>
                <input id="d-size" type="number" min="0" step="1000" value={dealSize} onChange={e => setDealSize(e.target.value)} className={inputCls} placeholder="500000" />
                {errors.dealSize && <p className="text-xs text-red-500 mt-1">{errors.dealSize}</p>}
              </div>
              <div>
                <label htmlFor="d-prob" className={labelCls}>Probability %</label>
                <input id="d-prob" type="number" min="0" max="100" value={probability} onChange={e => setProbability(e.target.value)} className={inputCls} placeholder="60" />
                {errors.probability && <p className="text-xs text-red-500 mt-1">{errors.probability}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-vehicle" className={labelCls}>Contract Vehicle</label>
                <input id="d-vehicle" type="text" value={contractVehicle} onChange={e => setContractVehicle(e.target.value)} className={inputCls} placeholder="SBIR Phase II, GSA MAS..." />
              </div>
              <div>
                <label htmlFor="d-close" className={labelCls}>Expected Close</label>
                <input id="d-close" type="date" value={expectedCloseDate} onChange={e => setExpectedCloseDate(e.target.value)} className={inputCls} />
              </div>
            </div>
          </fieldset>

          {/* ── Channel Attribution ── */}
          {(distributors.length > 0 || resellers.length > 0) && (
            <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
              <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Channel Attribution</legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="d-dist" className={labelCls}>Distributor</label>
                  <select id="d-dist" value={distributorCompanyId} onChange={e => setDistributorCompanyId(e.target.value)} className={selectCls}>
                    <option value="">— None —</option>
                    {distributors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="d-reseller" className={labelCls}>Reseller / VAR</label>
                  <select id="d-reseller" value={resellerCompanyId} onChange={e => setResellerCompanyId(e.target.value)} className={selectCls}>
                    <option value="">— None —</option>
                    {resellers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>
          )}

          {/* ── Playbook ── */}
          <fieldset className="border border-gray-200 rounded-lg p-4 space-y-4">
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">Account Playbook</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="d-pb-entry" className={labelCls}>Entry</label>
                <input id="d-pb-entry" type="text" value={playbookEntry} onChange={e => setPlaybookEntry(e.target.value)} className={inputCls} placeholder="SBIR Phase II (DCO automation)" />
              </div>
              <div>
                <label htmlFor="d-pb-hook" className={labelCls}>Hook</label>
                <input id="d-pb-hook" type="text" value={playbookHook} onChange={e => setPlaybookHook(e.target.value)} className={inputCls} placeholder="Reduce incident response time by 70%" />
              </div>
              <div>
                <label htmlFor="d-pb-pilot" className={labelCls}>Pilot</label>
                <input id="d-pb-pilot" type="text" value={playbookPilot} onChange={e => setPlaybookPilot(e.target.value)} className={inputCls} placeholder="60-day deployment in CPTs" />
              </div>
              <div>
                <label htmlFor="d-pb-expansion" className={labelCls}>Expansion</label>
                <input id="d-pb-expansion" type="text" value={playbookExpansion} onChange={e => setPlaybookExpansion(e.target.value)} className={inputCls} placeholder="Brigade-wide rollout ($1M+)" />
              </div>
            </div>
          </fieldset>

          {/* ── Notes ── */}
          <div>
            <label htmlFor="d-notes" className={labelCls}>Notes</label>
            <textarea id="d-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
            >
              {isEdit ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Company, CompanyType, AgencyTier } from '@/types';
import { COMPANY_TYPE_LABELS } from '@/types';
import { sanitizeShortText, sanitizeText } from '@/utils/sanitize';
import { nowISO } from '@/utils/dateHelpers';
import { X } from 'lucide-react';

interface Props {
  company?: Company | null;
  allCompanies: Company[];
  onSave: (company: Company) => void;
  onClose: () => void;
}

const COMPANY_TYPES: CompanyType[] = [
  'federal_agency',
  'commercial',
  'investor',
  'partner',
  'distributor',
  'reseller',
];

const AGENCY_TIERS: { value: AgencyTier; label: string }[] = [
  { value: 'cabinet', label: 'Cabinet department' },
  { value: 'dod', label: 'DoD component' },
  { value: 'civilian', label: 'Civilian federal' },
  { value: 'sub_agency', label: 'Sub-agency / sub-org' },
];

/**
 * Computes the set of company IDs that are NOT valid parents for the given
 * company — the company itself plus all its descendants. Used to prevent
 * cycles in the agency hierarchy.
 */
function getDescendantIds(companies: Company[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of companies) {
      if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id);
        grew = true;
      }
    }
  }
  return ids;
}

export function CompanyModal({ company, allCompanies, onSave, onClose }: Props) {
  const isEdit = !!company;

  const [name, setName] = useState(company?.name ?? '');
  const [type, setType] = useState<CompanyType>(company?.type ?? 'federal_agency');
  const [parentId, setParentId] = useState<string>(company?.parentId ?? '');
  const [website, setWebsite] = useState(company?.website ?? '');
  const [notes, setNotes] = useState(company?.notes ?? '');
  const [agencyCode, setAgencyCode] = useState(company?.agencyCode ?? '');
  const [agencyTier, setAgencyTier] = useState<AgencyTier | ''>(company?.agencyTier ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Clear parent selection if it's invalid for the current type
  // (same-type constraint below).
  useEffect(() => {
    if (parentId) {
      const parent = allCompanies.find(c => c.id === parentId);
      if (parent && parent.type !== type) setParentId('');
    }
  }, [type, parentId, allCompanies]);

  const excludedIds = useMemo(() =>
    isEdit && company ? getDescendantIds(allCompanies, company.id) : new Set<string>(),
    [allCompanies, company, isEdit],
  );

  const eligibleParents = useMemo(() =>
    allCompanies
      .filter(c => c.type === type && !excludedIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allCompanies, type, excludedIds],
  );

  const isFederal = type === 'federal_agency';

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!sanitizeShortText(name)) {
      errs.name = 'Name is required';
    }
    // Dupe name check (case-insensitive, excluding self on edit)
    const nameKey = sanitizeShortText(name).toLowerCase();
    const dupe = allCompanies.find(
      c => c.name.toLowerCase() === nameKey && c.id !== company?.id,
    );
    if (dupe) errs.name = 'A company with this name already exists';

    if (website && !/^https?:\/\/.+/.test(website)) {
      errs.website = 'Website must start with http:// or https://';
    }
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const now = nowISO();
    const saved: Company = {
      id: company?.id ?? uuidv4(),
      name: sanitizeShortText(name),
      type,
      parentId: parentId || null,
      website: sanitizeShortText(website),
      notes: sanitizeText(notes),
      agencyCode: isFederal ? (sanitizeShortText(agencyCode) || null) : null,
      agencyTier: isFederal ? (agencyTier || null) : null,
      createdAt: company?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(saved);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="company-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Company' : 'New Company'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="co-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="co-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              autoFocus
              placeholder="ARCYBER, Carahsoft, Sequoia Capital..."
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="co-type" className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <select
              id="co-type"
              value={type}
              onChange={e => setType(e.target.value as CompanyType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
            >
              {COMPANY_TYPES.map(t => (
                <option key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="co-parent" className="block text-sm font-medium text-gray-700 mb-1">
              Parent (optional)
            </label>
            <select
              id="co-parent"
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
              disabled={eligibleParents.length === 0}
            >
              <option value="">— No parent —</option>
              {eligibleParents.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Only {COMPANY_TYPE_LABELS[type]} companies are eligible as parent. Used for agency hierarchies (e.g. DoD → ARCYBER → Cyber Protection Brigade).
            </p>
          </div>

          {isFederal && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="co-agency-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Agency code
                </label>
                <input
                  id="co-agency-code"
                  type="text"
                  value={agencyCode}
                  onChange={e => setAgencyCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent font-mono uppercase"
                  placeholder="DISA"
                />
              </div>
              <div>
                <label htmlFor="co-agency-tier" className="block text-sm font-medium text-gray-700 mb-1">
                  Tier
                </label>
                <select
                  id="co-agency-tier"
                  value={agencyTier}
                  onChange={e => setAgencyTier(e.target.value as AgencyTier | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
                >
                  <option value="">—</option>
                  {AGENCY_TIERS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="co-website" className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              id="co-website"
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              placeholder="https://..."
            />
            {errors.website && <p className="text-xs text-red-500 mt-1">{errors.website}</p>}
          </div>

          <div>
            <label htmlFor="co-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="co-notes"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent resize-none"
            />
          </div>

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
              {isEdit ? 'Save Changes' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

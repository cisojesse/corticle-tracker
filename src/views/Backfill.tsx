import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/auth/AuthContext';
import type { useStorage } from '@/hooks/useStorage';
import type { Company, Contact, CompanyType, AgencyTier } from '@/types';
import { COMPANY_TYPE_LABELS } from '@/types';
import { parseContactString } from '@/utils/contactParser';
import { sanitizeShortText, sanitizeText } from '@/utils/sanitize';
import { nowISO } from '@/utils/dateHelpers';
import { CheckCircle2, ChevronRight, AlertTriangle, SkipForward } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackfillRow {
  itemId: string;
  itemTitle: string;
  rawContact: string;
  parsedTitle: string;
  parsedCompany: string;
  companyType: CompanyType;
  agencyCode: string | null;
  agencyTier: AgencyTier | null;
  skip: boolean;
}

interface CompanyPlan {
  key: string;            // lowercase normalized name
  name: string;
  type: CompanyType;
  agencyCode: string | null;
  agencyTier: AgencyTier | null;
  existingId: string | null;
  itemCount: number;
}

type Step = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<Step, string> = {
  1: 'Parse & Edit',
  2: 'Confirm Companies',
  3: 'Apply',
};

function normalizeKey(s: string): string {
  return s.toLowerCase().trim();
}

function matchExistingCompany(name: string, companies: Company[]): Company | null {
  const key = normalizeKey(name);
  return companies.find(c => normalizeKey(c.name) === key) ?? null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  storage: ReturnType<typeof useStorage>;
}

export default function Backfill({ storage }: Props) {
  const { session } = useAuth();

  // Admin guard
  if (session?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <BackfillWizard storage={storage} />;
}

function BackfillWizard({ storage }: Props) {
  const fileRequired = storage.syncStatus === 'no_file';

  // Items that need backfill: contactId is null and contact string is non-empty
  const eligibleItems = useMemo(
    () => storage.data.items.filter(i => i.contactId === null && i.contact.trim() !== ''),
    [storage.data.items],
  );

  // Initial parse
  const initialRows: BackfillRow[] = useMemo(
    () =>
      eligibleItems.map(item => {
        const p = parseContactString(item.contact);
        return {
          itemId: item.id,
          itemTitle: item.title,
          rawContact: item.contact,
          parsedTitle: p.title,
          parsedCompany: p.company,
          companyType: p.companyType,
          agencyCode: p.agencyCode,
          agencyTier: p.agencyTier,
          skip: p.suggestSkip,
        };
      }),
    [eligibleItems],
  );

  const [rows, setRows] = useState<BackfillRow[]>(initialRows);
  const [step, setStep] = useState<Step>(1);
  const [companyPlans, setCompanyPlans] = useState<CompanyPlan[]>([]);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  // Active rows (not skipped)
  const activeRows = rows.filter(r => !r.skip);

  // ------------------------------------------
  // Step transitions
  // ------------------------------------------

  function goToStep2() {
    // Sanitize editable fields before carrying into next step
    setRows(prev =>
      prev.map(r => ({
        ...r,
        parsedTitle: sanitizeShortText(r.parsedTitle),
        parsedCompany: sanitizeShortText(r.parsedCompany),
      })),
    );

    // Deduplicate companies from active rows
    const companyMap = new Map<string, CompanyPlan>();
    for (const row of activeRows) {
      const cleanCompany = sanitizeShortText(row.parsedCompany);
      if (!cleanCompany) continue;
      const key = normalizeKey(cleanCompany);
      if (companyMap.has(key)) {
        companyMap.get(key)!.itemCount += 1;
        continue;
      }
      const existing = matchExistingCompany(cleanCompany, storage.data.companies);
      companyMap.set(key, {
        key,
        name: cleanCompany,
        type: row.companyType,
        agencyCode: row.agencyCode,
        agencyTier: row.agencyTier,
        existingId: existing?.id ?? null,
        itemCount: 1,
      });
    }
    setCompanyPlans(Array.from(companyMap.values()));
    setStep(2);
  }

  function goToStep3() {
    setStep(3);
  }

  // ------------------------------------------
  // Apply logic
  // ------------------------------------------

  function applyAll() {
    if (applying) return;
    setApplying(true);

    const now = nowISO();
    // Snapshot items before any mutations to avoid stale closure reads
    const itemsSnapshot = new Map(storage.data.items.map(i => [i.id, i]));

    // 1. Create companies (those without existingId)
    const companyIdMap = new Map<string, string>(); // normalized name → company id
    for (const plan of companyPlans) {
      if (plan.existingId) {
        companyIdMap.set(plan.key, plan.existingId);
      } else {
        const id = uuidv4();
        const company: Company = {
          id,
          name: sanitizeShortText(plan.name),
          type: plan.type,
          parentId: null,
          website: '',
          notes: 'Created by Backfill wizard',
          agencyCode: plan.agencyCode,
          agencyTier: plan.agencyTier,
          createdAt: now,
          updatedAt: now,
        };
        storage.addCompany(company);
        companyIdMap.set(plan.key, id);
      }
    }

    // 2. Create contacts + link action items
    // Group active rows by parsed title + company to avoid duplicating contacts
    const contactKeyMap = new Map<string, string>(); // "title|companyKey" → contact id
    for (const row of activeRows) {
      const companyKey = normalizeKey(row.parsedCompany);
      const contactKey = `${normalizeKey(row.parsedTitle)}|${companyKey}`;

      let contactId = contactKeyMap.get(contactKey);
      if (!contactId) {
        contactId = uuidv4();
        contactKeyMap.set(contactKey, contactId);

        const companyId = companyIdMap.get(companyKey) ?? null;
        const contact: Contact = {
          id: contactId,
          firstName: '',
          lastName: sanitizeShortText(row.parsedTitle),
          title: sanitizeShortText(row.parsedTitle),
          email: '',
          phone: '',
          linkedInUrl: '',
          companyId,
          tags: ['backfill'],
          source: 'seed-data',
          notes: sanitizeText(`Backfilled from: "${row.rawContact}"`),
          lastTouchedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        storage.addContact(contact);
      }

      // 3. Link action item from snapshot (avoids stale closure)
      const item = itemsSnapshot.get(row.itemId);
      if (item) {
        storage.updateItem({ ...item, contactId, updatedAt: now });
      }
    }

    setApplied(true);
  }

  // ------------------------------------------
  // Row edit helpers
  // ------------------------------------------

  function updateRow(itemId: string, patch: Partial<BackfillRow>) {
    setRows(prev => prev.map(r => (r.itemId === itemId ? { ...r, ...patch } : r)));
  }

  function toggleAll(skip: boolean) {
    setRows(prev => prev.map(r => ({ ...r, skip })));
  }

  function updateCompanyPlan(key: string, patch: Partial<CompanyPlan>) {
    setCompanyPlans(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)));
  }

  // ------------------------------------------
  // Nothing to do state
  // ------------------------------------------

  if (eligibleItems.length === 0 || applied) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {applied ? 'Backfill Complete' : 'Nothing to Backfill'}
        </h1>
        <p className="text-gray-500 text-sm">
          {applied
            ? `Created ${companyPlans.filter(p => !p.existingId).length} companies and linked ${activeRows.length} contacts.`
            : 'All action items already have a linked contact, or there are no items with contact text.'}
        </p>
      </div>
    );
  }

  // ------------------------------------------
  // File required warning
  // ------------------------------------------

  if (fileRequired) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Open a Data File</h1>
        <p className="text-gray-500 text-sm">Open or create a data file before running the backfill wizard.</p>
      </div>
    );
  }

  // ------------------------------------------
  // Render
  // ------------------------------------------

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Backfill Wizard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Convert free-text contact strings into real Contact + Company records.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                s === step
                  ? 'bg-corticle-cyan text-white'
                  : s < step
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? <CheckCircle2 size={16} /> : s}
            </div>
            <span
              className={`text-sm ${
                s === step ? 'font-medium text-gray-900' : 'text-gray-400'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {s < 3 && <ChevronRight size={16} className="text-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <StepParse
          rows={rows}
          updateRow={updateRow}
          toggleAll={toggleAll}
          onNext={goToStep2}
          activeCount={activeRows.length}
        />
      )}
      {step === 2 && (
        <StepCompanies
          plans={companyPlans}
          existingCompanies={storage.data.companies}
          updatePlan={updateCompanyPlan}
          onBack={() => setStep(1)}
          onNext={goToStep3}
        />
      )}
      {step === 3 && (
        <StepApply
          activeRows={activeRows}
          companyPlans={companyPlans}
          applying={applying}
          onBack={() => setStep(2)}
          onApply={applyAll}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Step 1: Parse & Edit
// ===========================================================================

function StepParse({
  rows,
  updateRow,
  toggleAll,
  onNext,
  activeCount,
}: {
  rows: BackfillRow[];
  updateRow: (id: string, patch: Partial<BackfillRow>) => void;
  toggleAll: (skip: boolean) => void;
  onNext: () => void;
  activeCount: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {rows.length} items found &middot; {activeCount} selected for backfill
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => toggleAll(false)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => toggleAll(true)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 w-10">Use</th>
              <th className="px-4 py-3">Action Item</th>
              <th className="px-4 py-3">Raw Contact</th>
              <th className="px-4 py-3">Parsed Title / Role</th>
              <th className="px-4 py-3">Company</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr
                key={row.itemId}
                className={row.skip ? 'bg-gray-50 opacity-60' : 'bg-white'}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!row.skip}
                    onChange={() => updateRow(row.itemId, { skip: !row.skip })}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3 text-gray-900 max-w-[200px] truncate" title={row.itemTitle}>
                  {row.itemTitle}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate" title={row.rawContact}>
                  {row.rawContact}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={row.parsedTitle}
                    disabled={row.skip}
                    onChange={e => updateRow(row.itemId, { parsedTitle: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-corticle-cyan disabled:bg-gray-100"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={row.parsedCompany}
                    disabled={row.skip}
                    onChange={e => updateRow(row.itemId, { parsedCompany: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-corticle-cyan disabled:bg-gray-100"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onNext}
          disabled={activeCount === 0}
          className="px-6 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next: Confirm Companies
        </button>
      </div>
    </>
  );
}

// ===========================================================================
// Step 2: Confirm Companies
// ===========================================================================

function StepCompanies({
  plans,
  existingCompanies,
  updatePlan,
  onBack,
  onNext,
}: {
  plans: CompanyPlan[];
  existingCompanies: Company[];
  updatePlan: (key: string, patch: Partial<CompanyPlan>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const newCount = plans.filter(p => !p.existingId).length;
  const matchedCount = plans.filter(p => p.existingId).length;

  return (
    <>
      <p className="text-sm text-gray-600 mb-4">
        {plans.length} unique companies &middot;{' '}
        <span className="text-green-600">{matchedCount} matched existing</span> &middot;{' '}
        <span className="text-corticle-cyan">{newCount} to create</span>
      </p>

      {plans.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <SkipForward size={32} className="mx-auto mb-2" />
          <p className="text-sm">No companies to create — all selected items have empty company fields.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Agency Code</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map(plan => (
                <tr key={plan.key} className="bg-white">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={plan.name}
                      onChange={e => updatePlan(plan.key, { name: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-corticle-cyan"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={plan.type}
                      onChange={e => updatePlan(plan.key, { type: e.target.value as CompanyType })}
                      className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-corticle-cyan"
                    >
                      {Object.entries(COMPANY_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {plan.agencyCode ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {plan.itemCount}
                  </td>
                  <td className="px-4 py-3">
                    {plan.existingId ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} /> Existing
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                    {!plan.existingId && existingCompanies.length > 0 && (
                      <select
                        value=""
                        onChange={e => {
                          if (e.target.value) updatePlan(plan.key, { existingId: e.target.value });
                        }}
                        className="ml-2 text-xs border border-gray-200 rounded px-1 py-0.5"
                      >
                        <option value="">Link existing...</option>
                        {existingCompanies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
        >
          Next: Review & Apply
        </button>
      </div>
    </>
  );
}

// ===========================================================================
// Step 3: Apply
// ===========================================================================

function StepApply({
  activeRows,
  companyPlans,
  applying,
  onBack,
  onApply,
}: {
  activeRows: BackfillRow[];
  companyPlans: CompanyPlan[];
  applying: boolean;
  onBack: () => void;
  onApply: () => void;
}) {
  const newCompanies = companyPlans.filter(p => !p.existingId);
  const matchedCompanies = companyPlans.filter(p => p.existingId);

  // Deduplicate contacts (same title + company key)
  const uniqueContacts = new Set<string>();
  for (const row of activeRows) {
    uniqueContacts.add(`${normalizeKey(row.parsedTitle)}|${normalizeKey(row.parsedCompany)}`);
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-corticle-cyan">{newCompanies.length}</p>
            <p className="text-sm text-gray-500 mt-1">Companies to Create</p>
            {matchedCompanies.length > 0 && (
              <p className="text-xs text-green-600 mt-0.5">+ {matchedCompanies.length} existing matched</p>
            )}
          </div>
          <div>
            <p className="text-3xl font-bold text-corticle-cyan">{uniqueContacts.size}</p>
            <p className="text-sm text-gray-500 mt-1">Contacts to Create</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-corticle-cyan">{activeRows.length}</p>
            <p className="text-sm text-gray-500 mt-1">Items to Link</p>
          </div>
        </div>
      </div>

      {/* Preview list */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
        <div className="bg-gray-50 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
          Preview
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {activeRows.map(row => (
            <div key={row.itemId} className="px-4 py-3 flex items-center gap-3 text-sm">
              <span className="text-gray-900 font-medium truncate flex-1">{row.itemTitle}</span>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
              <span className="text-gray-600 truncate flex-1">
                {row.parsedTitle}
                {row.parsedCompany && (
                  <span className="text-gray-400"> @ {row.parsedCompany}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={applying}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {applying ? 'Applying...' : 'Apply All'}
        </button>
      </div>
    </>
  );
}

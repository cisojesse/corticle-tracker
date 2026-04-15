import { useState, useMemo } from 'react';
import type { Company, CompanyType } from '@/types';
import { COMPANY_TYPE_LABELS } from '@/types';
import type { useStorage } from '@/hooks/useStorage';
import { CompanyModal } from '@/components/companies/CompanyModal';
import { Plus, Pencil, Trash2, Building2, ExternalLink } from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

const TYPE_BADGE_COLORS: Record<CompanyType, string> = {
  federal_agency: 'bg-blue-100 text-blue-800',
  commercial: 'bg-slate-100 text-slate-800',
  investor: 'bg-purple-100 text-purple-800',
  partner: 'bg-green-100 text-green-800',
  distributor: 'bg-orange-100 text-orange-800',
  reseller: 'bg-amber-100 text-amber-800',
};

type TypeFilter = CompanyType | 'all';

export default function Companies({ storage }: Props) {
  const companies = storage.data.companies;
  const [modalCompany, setModalCompany] = useState<Company | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const fileRequired = storage.syncStatus === 'no_file';

  const companyById = useMemo(
    () => new Map(companies.map(c => [c.id, c])),
    [companies],
  );

  const filtered = useMemo(() => {
    let result = [...companies];
    if (typeFilter !== 'all') result = result.filter(c => c.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q) ||
        (c.agencyCode?.toLowerCase().includes(q) ?? false),
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, search, typeFilter]);

  // Count dependents before deletion — companies that have this as parent
  function getDependentCount(id: string): number {
    return companies.filter(c => c.parentId === id).length;
  }

  function handleDelete(id: string) {
    const deps = getDependentCount(id);
    if (deps > 0) {
      alert(`Cannot delete: ${deps} company/ies use this as a parent. Reassign them first.`);
      setDeleteConfirm(null);
      return;
    }
    storage.deleteCompany(id);
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">
            {companies.length} compan{companies.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <button
          onClick={() => setModalCompany(null)}
          disabled={fileRequired}
          className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Create new company"
          title={fileRequired ? 'Open a data file first' : 'Create new company'}
        >
          <Plus size={18} />
          New Company
        </button>
      </div>

      {fileRequired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Open or create a data file (header toolbar) before managing companies.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name, code, or notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent w-64"
          aria-label="Search companies"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {(Object.keys(COMPANY_TYPE_LABELS) as CompanyType[]).map(t => (
            <option key={t} value={t}>{COMPANY_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No companies yet.</p>
          <button
            onClick={() => setModalCompany(null)}
            disabled={fileRequired}
            className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Create Your First Company
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Parent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Agency code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Website</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No companies match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const parent = c.parentId ? companyById.get(c.parentId) : null;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE_COLORS[c.type]}`}>
                          {COMPANY_TYPE_LABELS[c.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {parent ? parent.name : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        {c.agencyCode || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.website ? (
                          <a
                            href={c.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-corticle-accent hover:text-corticle-cyan text-xs"
                          >
                            Visit <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalCompany(c)}
                            className="p-1.5 text-gray-400 hover:text-corticle-cyan hover:bg-cyan-50 rounded-lg transition-colors"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Pencil size={16} />
                          </button>
                          {deleteConfirm === c.id ? (
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                              aria-label="Confirm delete"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(c.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label={`Delete ${c.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-gray-400 text-right bg-gray-50 border-t border-gray-100">
            {filtered.length} of {companies.length}
          </p>
        </div>
      )}

      {modalCompany !== undefined && (
        <CompanyModal
          company={modalCompany}
          allCompanies={companies}
          onSave={c => {
            if (companies.find(x => x.id === c.id)) storage.updateCompany(c);
            else storage.addCompany(c);
          }}
          onClose={() => setModalCompany(undefined)}
        />
      )}
    </div>
  );
}

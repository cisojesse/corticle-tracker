import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Contact } from '@/types';
import type { useStorage } from '@/hooks/useStorage';
import { ContactModal } from '@/components/contacts/ContactModal';
import { formatDueDate, nowISO } from '@/utils/dateHelpers';
import { Plus, Pencil, Trash2, User, Mail, ExternalLink } from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

function fullName(c: Contact): string {
  return `${c.firstName} ${c.lastName}`.trim() || '(unnamed)';
}

export default function Contacts({ storage }: Props) {
  const contacts = storage.data.contacts;
  const companies = storage.data.companies;
  const [modalContact, setModalContact] = useState<Contact | null | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const fileRequired = storage.syncStatus === 'no_file';

  const cadences = storage.data.cadences;

  const companyById = useMemo(
    () => new Map(companies.map(c => [c.id, c])),
    [companies],
  );

  const cadenceByContactId = useMemo(
    () => new Map(cadences.filter(c => c.active).map(c => [c.contactId, c])),
    [cadences],
  );

  const handleCadenceChange = useCallback((contactId: string, intervalDays: number) => {
    const existing = cadences.find(c => c.contactId === contactId);
    const now = nowISO();
    if (intervalDays === 0) {
      // Remove cadence (deactivate)
      if (existing && existing.active) {
        storage.updateCadence({ ...existing, active: false, updatedAt: now });
      }
    } else if (existing) {
      // Update
      storage.updateCadence({ ...existing, intervalDays, active: true, updatedAt: now });
    } else {
      // Create
      storage.addCadence({
        id: uuidv4(),
        contactId,
        intervalDays,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }, [cadences, storage]);

  const filtered = useMemo(() => {
    let result = [...contacts];
    if (companyFilter !== 'all') {
      result = companyFilter === 'none'
        ? result.filter(c => !c.companyId)
        : result.filter(c => c.companyId === companyFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        fullName(c).toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.notes.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)),
      );
    }
    return result.sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [contacts, search, companyFilter]);

  const sortedCompaniesForFilter = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setModalContact(null)}
          disabled={fileRequired}
          className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Create new contact"
          title={fileRequired ? 'Open a data file first' : 'Create new contact'}
        >
          <Plus size={18} />
          New Contact
        </button>
      </div>

      {fileRequired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Open or create a data file (header toolbar) before managing contacts.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name, title, email, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent w-64"
          aria-label="Search contacts"
        />
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by company"
        >
          <option value="all">All companies</option>
          <option value="none">Unaffiliated</option>
          {sortedCompaniesForFilter.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <User size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-2">No contacts yet.</p>
          <p className="text-xs text-gray-400 mb-4">
            Backfill tool (Deliverable 1.4) will convert existing action items into contacts automatically.
          </p>
          <button
            onClick={() => setModalContact(null)}
            disabled={fileRequired}
            className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Create Your First Contact
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email / LinkedIn</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last touched</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No contacts match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const company = c.companyId ? companyById.get(c.companyId) : null;
                  return (
                    <tr key={c.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{fullName(c)}</div>
                        {c.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {c.tags.map(t => (
                              <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {c.title || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs">
                        {company ? company.name : <span className="text-gray-300">Unaffiliated</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-col gap-1">
                          {c.email && (
                            <a
                              href={`mailto:${c.email}`}
                              className="inline-flex items-center gap-1 text-corticle-accent hover:text-corticle-cyan"
                            >
                              <Mail size={12} /> {c.email}
                            </a>
                          )}
                          {c.linkedInUrl && (
                            <a
                              href={c.linkedInUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-corticle-accent hover:text-corticle-cyan"
                            >
                              <ExternalLink size={12} /> LinkedIn
                            </a>
                          )}
                          {!c.email && !c.linkedInUrl && <span className="text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {c.lastTouchedAt ? formatDueDate(c.lastTouchedAt) : <span className="text-gray-300">Never</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModalContact(c)}
                            className="p-1.5 text-gray-400 hover:text-corticle-cyan hover:bg-cyan-50 rounded-lg transition-colors"
                            aria-label={`Edit ${fullName(c)}`}
                          >
                            <Pencil size={16} />
                          </button>
                          {deleteConfirm === c.id ? (
                            <button
                              onClick={() => { storage.deleteContact(c.id); setDeleteConfirm(null); }}
                              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                              aria-label="Confirm delete"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(c.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label={`Delete ${fullName(c)}`}
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
            {filtered.length} of {contacts.length}
          </p>
        </div>
      )}

      {modalContact !== undefined && (
        <ContactModal
          contact={modalContact}
          companies={companies}
          cadence={modalContact ? cadenceByContactId.get(modalContact.id) ?? null : null}
          onSave={c => {
            if (contacts.find(x => x.id === c.id)) storage.updateContact(c);
            else storage.addContact(c);
          }}
          onCadenceChange={handleCadenceChange}
          onClose={() => setModalContact(undefined)}
        />
      )}
    </div>
  );
}

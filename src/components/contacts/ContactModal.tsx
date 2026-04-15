import { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Contact, Company } from '@/types';
import { COMPANY_TYPE_LABELS } from '@/types';
import { sanitizeShortText, sanitizeText } from '@/utils/sanitize';
import { nowISO } from '@/utils/dateHelpers';
import { X } from 'lucide-react';

interface Props {
  contact?: Contact | null;
  companies: Company[];
  onSave: (contact: Contact) => void;
  onClose: () => void;
}

const SOURCE_SUGGESTIONS = [
  'warm-intro',
  'conference',
  'inbound',
  'cold-outreach',
  'referral',
  'LinkedIn',
  'existing-customer',
];

export function ContactModal({ contact, companies, onSave, onClose }: Props) {
  const isEdit = !!contact;

  const [firstName, setFirstName] = useState(contact?.firstName ?? '');
  const [lastName, setLastName] = useState(contact?.lastName ?? '');
  const [title, setTitle] = useState(contact?.title ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [linkedInUrl, setLinkedInUrl] = useState(contact?.linkedInUrl ?? '');
  const [companyId, setCompanyId] = useState(contact?.companyId ?? '');
  const [tagsInput, setTagsInput] = useState(contact?.tags?.join(', ') ?? '');
  const [source, setSource] = useState(contact?.source ?? '');
  const [notes, setNotes] = useState(contact?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    const fn = sanitizeShortText(firstName);
    const ln = sanitizeShortText(lastName);
    if (!fn && !ln) {
      errs.firstName = 'First or last name is required';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email';
    }
    if (linkedInUrl && !/^https?:\/\/(www\.)?linkedin\.com\//i.test(linkedInUrl)) {
      errs.linkedInUrl = 'LinkedIn URL should start with https://linkedin.com/';
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

    const tags = tagsInput
      .split(',')
      .map(t => sanitizeShortText(t))
      .filter(Boolean);

    const now = nowISO();
    const saved: Contact = {
      id: contact?.id ?? uuidv4(),
      firstName: sanitizeShortText(firstName),
      lastName: sanitizeShortText(lastName),
      title: sanitizeShortText(title),
      email: sanitizeShortText(email).toLowerCase(),
      phone: sanitizeShortText(phone),
      linkedInUrl: sanitizeShortText(linkedInUrl),
      companyId: companyId || null,
      tags,
      source: sanitizeShortText(source),
      notes: sanitizeText(notes),
      lastTouchedAt: contact?.lastTouchedAt ?? null,
      createdAt: contact?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(saved);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="contact-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Contact' : 'New Contact'}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-first" className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                id="c-first"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
                autoFocus
              />
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="c-last" className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                id="c-last"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="c-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="c-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              placeholder="Director of Operations (G-3/5/7)"
            />
          </div>

          <div>
            <label htmlFor="c-company" className="block text-sm font-medium text-gray-700 mb-1">
              Company
            </label>
            <select
              id="c-company"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
            >
              <option value="">— Unaffiliated —</option>
              {sortedCompanies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({COMPANY_TYPE_LABELS[c.type]})
                </option>
              ))}
            </select>
            {sortedCompanies.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No companies yet — create one first in the Companies view.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="c-email"
                type="email"
                autoComplete="off"
                autoCapitalize="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="c-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                id="c-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="c-linkedin" className="block text-sm font-medium text-gray-700 mb-1">
              LinkedIn URL
            </label>
            <input
              id="c-linkedin"
              type="url"
              value={linkedInUrl}
              onChange={e => setLinkedInUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              placeholder="https://linkedin.com/in/..."
            />
            {errors.linkedInUrl && <p className="text-xs text-red-500 mt-1">{errors.linkedInUrl}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="c-source" className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <input
                id="c-source"
                type="text"
                list="source-suggestions"
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
                placeholder="warm-intro, conference..."
              />
              <datalist id="source-suggestions">
                {SOURCE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="c-tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                id="c-tags"
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
                placeholder="technical-buyer, board-member"
              />
            </div>
          </div>

          <div>
            <label htmlFor="c-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="c-notes"
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
              {isEdit ? 'Save Changes' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

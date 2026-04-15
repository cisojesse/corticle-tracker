import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ActionItem, Category, Priority, Status } from '@/types';
import { CATEGORY_LABELS, DURATION_OPTIONS } from '@/types';
import { TEAM_DISPLAY_NAMES } from '@/auth/users.config';
import { useAuth } from '@/auth/AuthContext';
import { validateActionItem } from '@/utils/validation';
import { sanitizeText, sanitizeShortText } from '@/utils/sanitize';
import { nowISO, toISODate } from '@/utils/dateHelpers';
import { X } from 'lucide-react';

interface Props {
  item?: ActionItem | null;
  onSave: (item: ActionItem) => void;
  onClose: () => void;
}

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][];

export function ActionItemModal({ item, onSave, onClose }: Props) {
  const { session } = useAuth();
  const isEdit = !!item;

  const [title, setTitle] = useState(item?.title ?? '');
  const [category, setCategory] = useState<Category>(item?.category ?? 'prospects_bd');
  const [contact, setContact] = useState(item?.contact ?? '');
  const [assignedTo, setAssignedTo] = useState(item?.assignedTo ?? session?.displayName ?? '');
  const [priority, setPriority] = useState<Priority>(item?.priority ?? 'medium');
  const [status, setStatus] = useState<Status>(item?.status ?? 'open');
  const [dueDate, setDueDate] = useState(item?.dueDate ?? toISODate(new Date()));
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [calendarDuration, setCalendarDuration] = useState<number | null>(item?.calendarDuration ?? null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data: Partial<ActionItem> = {
      title: sanitizeShortText(title),
      category,
      contact: sanitizeShortText(contact),
      assignedTo: sanitizeShortText(assignedTo),
      priority,
      status,
      dueDate,
      notes: sanitizeText(notes),
    };

    const result = validateActionItem(data);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    const now = nowISO();
    const saved: ActionItem = {
      id: item?.id ?? uuidv4(),
      title: data.title!,
      category: data.category!,
      contact: data.contact!,
      contactId: item?.contactId ?? null,
      dealId: item?.dealId ?? null,
      assignedTo: data.assignedTo!,
      priority: data.priority!,
      status: data.status!,
      dueDate: data.dueDate!,
      notes: data.notes ?? '',
      createdAt: item?.createdAt ?? now,
      updatedAt: now,
      createdBy: item?.createdBy ?? session?.username ?? 'unknown',
      notified: item?.notified ?? false,
      calendarDuration,
      calendarInviteSent: item?.calendarInviteSent ?? false,
      calendarInviteSentAt: item?.calendarInviteSentAt ?? null,
    };

    onSave(saved);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="item-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Action Item' : 'New Action Item'}
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
          {/* Title */}
          <div>
            <label htmlFor="item-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              autoFocus
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Category + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="item-category"
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
              >
                {CATEGORIES.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label htmlFor="item-priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority *
              </label>
              <select
                id="item-priority"
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
            </div>
          </div>

          {/* Contact + Assigned To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-contact" className="block text-sm font-medium text-gray-700 mb-1">
                Contact / Company *
              </label>
              <input
                id="item-contact"
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              />
              {errors.contact && <p className="text-xs text-red-500 mt-1">{errors.contact}</p>}
            </div>
            <div>
              <label htmlFor="item-assigned" className="block text-sm font-medium text-gray-700 mb-1">
                Assigned To *
              </label>
              <select
                id="item-assigned"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
              >
                {TEAM_DISPLAY_NAMES.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {errors.assignedTo && <p className="text-xs text-red-500 mt-1">{errors.assignedTo}</p>}
            </div>
          </div>

          {/* Status + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="item-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                id="item-status"
                value={status}
                onChange={e => setStatus(e.target.value as Status)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
            </div>
            <div>
              <label htmlFor="item-due" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                id="item-due"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent"
              />
              {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          {/* Calendar duration */}
          <div>
            <label htmlFor="item-cal-duration" className="block text-sm font-medium text-gray-700 mb-1">
              Calendar block duration (optional)
            </label>
            <select
              id="item-cal-duration"
              value={calendarDuration ?? ''}
              onChange={e => setCalendarDuration(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
            >
              <option value="">None</option>
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="item-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="item-notes"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent resize-none"
            />
            {errors.notes && <p className="text-xs text-red-500 mt-1">{errors.notes}</p>}
          </div>

          {/* Actions */}
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
              {isEdit ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

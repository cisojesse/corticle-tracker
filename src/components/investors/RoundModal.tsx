import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Round, RoundStatus } from '@/types';
import { sanitizeShortText, sanitizeText } from '@/utils/sanitize';
import { nowISO } from '@/utils/dateHelpers';
import { X } from 'lucide-react';

interface Props {
  round?: Round | null;
  onSave: (round: Round) => void;
  onClose: () => void;
}

const STATUSES: { value: RoundStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

export function RoundModal({ round, onSave, onClose }: Props) {
  const isEdit = !!round;

  const [name, setName] = useState(round?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(round?.targetAmount?.toString() ?? '');
  const [raisedAmount, setRaisedAmount] = useState(round?.raisedAmount?.toString() ?? '');
  const [status, setStatus] = useState<RoundStatus>(round?.status ?? 'planning');
  const [openedAt, setOpenedAt] = useState(round?.openedAt ?? '');
  const [closedAt, setClosedAt] = useState(round?.closedAt ?? '');
  const [notes, setNotes] = useState(round?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!sanitizeShortText(name)) errs.name = 'Round name is required';
    const target = Number(targetAmount);
    if (targetAmount && (isNaN(target) || !isFinite(target) || target < 0)) errs.targetAmount = 'Must be a positive number';
    const raised = Number(raisedAmount);
    if (raisedAmount && (isNaN(raised) || !isFinite(raised) || raised < 0)) errs.raisedAmount = 'Must be a positive number';
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
    const saved: Round = {
      id: round?.id ?? uuidv4(),
      name: sanitizeShortText(name),
      targetAmount: Number(targetAmount) || 0,
      raisedAmount: Number(raisedAmount) || 0,
      status,
      openedAt: openedAt || now,
      closedAt: status === 'closed' ? (closedAt || now) : null,
      notes: sanitizeText(notes),
      createdAt: round?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(saved);
    onClose();
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 id="round-modal-title" className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Round' : 'New Round'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="r-name" className={labelCls}>Name *</label>
            <input id="r-name" type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} autoFocus placeholder="Seed 2026, Series A..." />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="r-target" className={labelCls}>Target ($)</label>
              <input id="r-target" type="number" min="0" step="10000" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className={inputCls} placeholder="2000000" />
              {errors.targetAmount && <p className="text-xs text-red-500 mt-1">{errors.targetAmount}</p>}
            </div>
            <div>
              <label htmlFor="r-raised" className={labelCls}>Raised ($)</label>
              <input id="r-raised" type="number" min="0" step="10000" value={raisedAmount} onChange={e => setRaisedAmount(e.target.value)} className={inputCls} placeholder="0" />
              {errors.raisedAmount && <p className="text-xs text-red-500 mt-1">{errors.raisedAmount}</p>}
            </div>
            <div>
              <label htmlFor="r-status" className={labelCls}>Status</label>
              <select id="r-status" value={status} onChange={e => setStatus(e.target.value as RoundStatus)} className={inputCls}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="r-opened" className={labelCls}>Opened</label>
              <input id="r-opened" type="date" value={openedAt} onChange={e => setOpenedAt(e.target.value)} className={inputCls} />
            </div>
            {status === 'closed' && (
              <div>
                <label htmlFor="r-closed" className={labelCls}>Closed</label>
                <input id="r-closed" type="date" value={closedAt} onChange={e => setClosedAt(e.target.value)} className={inputCls} />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="r-notes" className={labelCls}>Notes</label>
            <textarea id="r-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors">
              {isEdit ? 'Save Changes' : 'Create Round'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

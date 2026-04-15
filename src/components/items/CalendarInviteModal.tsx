import { useState } from 'react';
import type { ActionItem } from '@/types';
import { DURATION_OPTIONS } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { generateICS, downloadICS, generateGoogleCalendarURL } from '@/utils/calendarHelpers';
import { format, parseISO } from 'date-fns';

interface Props {
  item: ActionItem;
  onClose: () => void;
  onInviteSent: (item: ActionItem) => void;
}

type CalendarType = 'outlook' | 'google';

export function CalendarInviteModal({ item, onClose, onInviteSent }: Props) {
  const { session } = useAuth();
  const [calendarType, setCalendarType] = useState<CalendarType>('outlook');
  const [duration, setDuration] = useState<number>(60);
  const [sent, setSent] = useState(false);

  function handleSend() {
    const opts = {
      item,
      durationMinutes: duration,
      calendarType,
      organizerEmail: session?.email || undefined,
      organizerName: session?.displayName || undefined,
    };

    if (calendarType === 'google') {
      const url = generateGoogleCalendarURL(opts);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const blob = generateICS(opts);
      const filename = `corticle-${item.id}-${format(parseISO(item.dueDate), 'yyyy-MM-dd')}.ics`;
      downloadICS(blob, filename);
    }

    const updated: ActionItem = {
      ...item,
      calendarInviteSent: true,
      calendarInviteSentAt: new Date().toISOString(),
      calendarDuration: duration,
      updatedAt: new Date().toISOString(),
    };

    onInviteSent(updated);
    setSent(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cal-invite-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 id="cal-invite-title" className="text-lg font-semibold text-gray-900 mb-1">
          Add to Calendar
        </h2>
        <p className="text-sm text-gray-500 mb-6 truncate">
          {item.title}
        </p>

        {sent ? (
          <div className="text-center py-6">
            <p className="text-gray-700 font-medium">Invite sent!</p>
            <p className="text-sm text-gray-500 mt-1">
              {calendarType === 'google'
                ? 'Google Calendar opened in a new tab.'
                : 'Check your downloads for the .ics file.'}
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-corticle-cyan text-white py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <fieldset className="mb-5">
              <legend className="text-sm font-medium text-gray-700 mb-2">Calendar</legend>
              <div className="grid grid-cols-2 gap-3">
                {(['outlook', 'google'] as CalendarType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCalendarType(type)}
                    aria-pressed={calendarType === type}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      calendarType === type
                        ? 'border-corticle-cyan bg-cyan-50 text-corticle-accent'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {type === 'outlook' ? 'Outlook' : 'Google'}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mb-6">
              <label
                htmlFor="cal-duration"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Duration
              </label>
              <select
                id="cal-duration"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                Block starts at 9:00 AM on {format(parseISO(item.dueDate), 'MMM d, yyyy')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="flex-1 py-2.5 bg-corticle-cyan text-white rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
              >
                {calendarType === 'google' ? 'Open Google Calendar' : 'Download .ics'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

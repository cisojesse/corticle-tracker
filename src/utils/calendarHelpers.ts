import type { ActionItem } from '@/types';
import { format, addMinutes, parseISO, setHours, setMinutes } from 'date-fns';

function toICSDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n');
}

export interface CalendarInviteOptions {
  item: ActionItem;
  durationMinutes: number;
  calendarType: 'outlook' | 'google';
  organizerEmail?: string;
  organizerName?: string;
  attendeeEmails?: string[];
}

export function generateICS(opts: CalendarInviteOptions): Blob {
  const { item, durationMinutes, organizerEmail, organizerName, attendeeEmails } = opts;

  const dueDate = parseISO(item.dueDate);
  const startDate = setMinutes(setHours(dueDate, 9), 0);
  const endDate = addMinutes(startDate, durationMinutes);

  const uid = `${item.id}-${Date.now()}@ops.digitalcyberforge.com`;
  const now = toICSDate(new Date());
  const dtStart = toICSDate(startDate);
  const dtEnd = toICSDate(endDate);

  const summary = escapeICS(`[Corticle] ${item.title}`);
  const description = escapeICS(
    [
      `Contact: ${item.contact}`,
      `Category: ${item.category.replace('_', ' / ')}`,
      `Priority: ${item.priority.toUpperCase()}`,
      `Assigned To: ${item.assignedTo}`,
      item.notes ? `Notes: ${item.notes}` : '',
      '',
      'Tracked in Corticle Ops - ops.digitalcyberforge.com',
    ]
      .filter(Boolean)
      .join('\\n')
  );

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Corticle Inc//Ops Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${summary}`),
    foldLine(`DESCRIPTION:${description}`),
  ];

  if (organizerEmail) {
    const cn = organizerName ? `;CN="${escapeICS(organizerName)}"` : '';
    lines.push(foldLine(`ORGANIZER${cn}:mailto:${organizerEmail}`));
  }

  if (attendeeEmails && attendeeEmails.length > 0) {
    for (const attendee of attendeeEmails) {
      lines.push(foldLine(`ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${attendee}`));
    }
  }

  lines.push(
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    foldLine(`DESCRIPTION:Reminder: ${summary}`),
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
}

export function downloadICS(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.setAttribute('aria-hidden', 'true');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateGoogleCalendarURL(opts: CalendarInviteOptions): string {
  const { item, durationMinutes } = opts;

  const dueDate = parseISO(item.dueDate);
  const startDate = setMinutes(setHours(dueDate, 9), 0);
  const endDate = addMinutes(startDate, durationMinutes);

  const fmt = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `[Corticle] ${item.title}`,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: [
      `Contact: ${item.contact}`,
      `Category: ${item.category.replace('_', ' / ')}`,
      `Priority: ${item.priority.toUpperCase()}`,
      `Assigned To: ${item.assignedTo}`,
      item.notes ? `Notes: ${item.notes}` : '',
      '',
      'Tracked in Corticle Ops - ops.digitalcyberforge.com',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function createOutlookEventViaGraph(
  _opts: CalendarInviteOptions,
  _accessToken: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  console.warn('Graph API calendar not yet configured. Using .ics download fallback.');
  return { success: false, error: 'Graph API not yet configured' };
}

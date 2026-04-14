import { useCallback, useEffect, useRef } from 'react';
import type { ActionItem } from '@/types';
import { isOverdue, isDueSoon, formatDueDate } from '@/utils/dateHelpers';

export function useNotifications(items: ActionItem[]) {
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (permissionRef.current !== 'granted') return;
    new Notification(title, {
      body,
      tag,
      icon: '/favicon.ico',
    });
  }, []);

  useEffect(() => {
    const check = () => {
      items.forEach(item => {
        if (item.status === 'done') return;

        if (isOverdue(item.dueDate) && !item.notified) {
          sendNotification(
            'Overdue: ' + item.title,
            `${item.contact} - Due ${formatDueDate(item.dueDate)}`,
            `overdue-${item.id}`
          );
        } else if (isDueSoon(item.dueDate) && !item.notified) {
          sendNotification(
            'Due Soon: ' + item.title,
            `${item.contact} - Due ${formatDueDate(item.dueDate)}`,
            `soon-${item.id}`
          );
        }
      });
    };

    check();
    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [items, sendNotification]);

  const sendSmsReminder = useCallback(async (_item: ActionItem, _phoneNumber: string) => {
    console.warn('SMS reminders not yet configured. Add Twilio credentials to .env.local');
    return { success: false, message: 'SMS not configured' };
  }, []);

  return { requestPermission, sendNotification, sendSmsReminder };
}

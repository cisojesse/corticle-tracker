import type { ActionItem, Priority, Status, Category } from '@/types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const VALID_STATUSES: Status[] = ['open', 'in_progress', 'done'];
const VALID_CATEGORIES: Category[] = [
  'prospects_bd', 'investors', 'partnerships', 'internal_ops', 'legal_compliance'
];

export function validateActionItem(
  data: Partial<ActionItem>
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.title?.trim()) {
    errors.title = 'Title is required';
  } else if (data.title.trim().length > 200) {
    errors.title = 'Title must be under 200 characters';
  }

  if (!data.category || !VALID_CATEGORIES.includes(data.category)) {
    errors.category = 'Valid category is required';
  }

  if (!data.contact?.trim()) {
    errors.contact = 'Contact or company name is required';
  }

  if (!data.assignedTo?.trim()) {
    errors.assignedTo = 'Assigned to is required';
  }

  if (!data.priority || !VALID_PRIORITIES.includes(data.priority)) {
    errors.priority = 'Valid priority is required';
  }

  if (!data.status || !VALID_STATUSES.includes(data.status)) {
    errors.status = 'Valid status is required';
  }

  if (!data.dueDate) {
    errors.dueDate = 'Due date is required';
  } else {
    const date = new Date(data.dueDate);
    if (isNaN(date.getTime())) {
      errors.dueDate = 'Due date must be a valid date';
    }
  }

  if (data.notes && data.notes.length > 2000) {
    errors.notes = 'Notes must be under 2000 characters';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

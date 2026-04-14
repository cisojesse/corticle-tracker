import { useState, useMemo } from 'react';
import type { ActionItem, FilterState, Category, Priority, Status } from '@/types';
import { CATEGORY_LABELS, CATEGORY_COLORS, PRIORITY_COLORS, STATUS_COLORS } from '@/types';
import { TEAM_DISPLAY_NAMES } from '@/auth/users.config';
import { formatDueDate, isOverdue } from '@/utils/dateHelpers';
import { CalendarInviteModal } from './CalendarInviteModal';
import { Pencil, Trash2, CalendarPlus, CalendarCheck, ArrowUpDown } from 'lucide-react';

interface Props {
  items: ActionItem[];
  onEdit: (item: ActionItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (item: ActionItem) => void;
  initialFilter?: Partial<FilterState>;
}

type SortField = 'dueDate' | 'priority' | 'status' | 'title';
type SortDir = 'asc' | 'desc';

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

export function ActionItemTable({ items, onEdit, onDelete, onUpdate, initialFilter }: Props) {
  const [filter, setFilter] = useState<FilterState>({
    category: initialFilter?.category ?? 'all',
    priority: initialFilter?.priority ?? 'all',
    status: initialFilter?.status ?? 'all',
    assignedTo: initialFilter?.assignedTo ?? '',
    search: initialFilter?.search ?? '',
  });
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [calendarItem, setCalendarItem] = useState<ActionItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    let result = [...items];

    if (filter.category !== 'all') {
      result = result.filter(i => i.category === filter.category);
    }
    if (filter.priority !== 'all') {
      result = result.filter(i => i.priority === filter.priority);
    }
    if (filter.status !== 'all') {
      result = result.filter(i => i.status === filter.status);
    }
    if (filter.assignedTo) {
      result = result.filter(i => i.assignedTo === filter.assignedTo);
    }
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.contact.toLowerCase().includes(q) ||
        i.notes.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'dueDate':
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'priority':
          cmp = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [items, filter, sortField, sortDir]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search..."
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan focus:border-transparent w-48"
          aria-label="Search items"
        />
        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value as Category | 'all' }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by category"
        >
          <option value="all">All Categories</option>
          {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filter.priority}
          onChange={e => setFilter(f => ({ ...f, priority: e.target.value as Priority | 'all' }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by priority"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value as Status | 'all' }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          value={filter.assignedTo}
          onChange={e => setFilter(f => ({ ...f, assignedTo: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by assignee"
        >
          <option value="">All Assignees</option>
          {TEAM_DISPLAY_NAMES.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[
                { field: 'title' as SortField, label: 'Title' },
                { field: 'dueDate' as SortField, label: 'Due' },
                { field: 'priority' as SortField, label: 'Priority' },
                { field: 'status' as SortField, label: 'Status' },
              ].map(col => (
                <th
                  key={col.field}
                  className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                  onClick={() => toggleSort(col.field)}
                  role="columnheader"
                  aria-sort={sortField === col.field ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown size={14} className="text-gray-400" />
                  </span>
                </th>
              ))}
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned</th>
              <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No items found.
                </td>
              </tr>
            ) : (
              filtered.map(item => {
                const overdue = item.status !== 'done' && isOverdue(item.dueDate);
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      overdue ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-xs">{item.title}</div>
                      <div className="text-xs text-gray-500 truncate">{item.contact}</div>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                      {formatDueDate(item.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[item.priority]}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs truncate max-w-[120px]">
                      {item.assignedTo}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setCalendarItem(item)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.calendarInviteSent
                              ? 'text-green-500 hover:bg-green-50'
                              : 'text-gray-400 hover:text-corticle-cyan hover:bg-cyan-50'
                          }`}
                          aria-label={item.calendarInviteSent ? 'Calendar invite sent' : 'Add to calendar'}
                        >
                          {item.calendarInviteSent ? <CalendarCheck size={16} /> : <CalendarPlus size={16} />}
                        </button>
                        <button
                          onClick={() => onEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-corticle-cyan hover:bg-cyan-50 rounded-lg transition-colors"
                          aria-label="Edit item"
                        >
                          <Pencil size={16} />
                        </button>
                        {deleteConfirm === item.id ? (
                          <button
                            onClick={() => { onDelete(item.id); setDeleteConfirm(null); }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                            aria-label="Confirm delete"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Delete item"
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
      </div>

      <p className="text-xs text-gray-400 mt-2 text-right">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>

      {calendarItem && (
        <CalendarInviteModal
          item={calendarItem}
          onClose={() => setCalendarItem(null)}
          onInviteSent={(updated) => { onUpdate(updated); setCalendarItem(null); }}
        />
      )}
    </div>
  );
}

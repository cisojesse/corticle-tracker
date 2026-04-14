import { useState } from 'react';
import type { ActionItem } from '@/types';
import type { useStorage } from '@/hooks/useStorage';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ActionItemModal } from '@/components/items/ActionItemModal';
import { isOverdue, isDueSoon, formatDueDate } from '@/utils/dateHelpers';
import { CATEGORY_LABELS, CATEGORY_COLORS, PRIORITY_COLORS } from '@/types';
import { Plus, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

export default function Dashboard({ storage }: Props) {
  const [modalItem, setModalItem] = useState<ActionItem | null | undefined>(undefined);
  const items = storage.data.items;

  const overdueItems = items.filter(i => i.status !== 'done' && isOverdue(i.dueDate));
  const dueSoonItems = items.filter(i => i.status !== 'done' && isDueSoon(i.dueDate));

  function handleSave(item: ActionItem) {
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      storage.updateItem(item);
    } else {
      storage.addItem(item);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} total item{items.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <button
          onClick={() => setModalItem(null)}
          className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
          aria-label="Create new action item"
        >
          <Plus size={18} />
          New Item
        </button>
      </div>

      {/* Stats */}
      <DashboardStats items={items} />

      {/* Overdue panel */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-3">
            <AlertTriangle size={16} />
            Overdue ({overdueItems.length})
          </h2>
          <div className="space-y-2">
            {overdueItems.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => setModalItem(item)}
                className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors text-left"
                aria-label={`Edit overdue item: ${item.title}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.contact}</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-red-600 font-medium">{formatDueDate(item.dueDate)}</p>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_COLORS[item.priority]}`}>
                    {item.priority}
                  </span>
                </div>
              </button>
            ))}
            {overdueItems.length > 5 && (
              <p className="text-xs text-red-600 text-center">+{overdueItems.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Due soon panel */}
      {dueSoonItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-yellow-800 mb-3">
            <Clock size={16} />
            Due Soon ({dueSoonItems.length})
          </h2>
          <div className="space-y-2">
            {dueSoonItems.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => setModalItem(item)}
                className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm hover:bg-yellow-50 transition-colors text-left"
                aria-label={`Edit due-soon item: ${item.title}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.contact}</p>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <p className="text-xs text-yellow-700 font-medium">{formatDueDate(item.dueDate)}</p>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[item.category]}`}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent items */}
      {items.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recently Updated</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {[...items]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 8)
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => setModalItem(item)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-left"
                  aria-label={`Edit item: ${item.title}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.contact} · {item.assignedTo}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-gray-400">{formatDueDate(item.dueDate)}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">No action items yet.</p>
          <button
            onClick={() => setModalItem(null)}
            className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors"
          >
            <Plus size={18} />
            Create Your First Item
          </button>
        </div>
      )}

      {/* Modal */}
      {modalItem !== undefined && (
        <ActionItemModal
          item={modalItem}
          onSave={handleSave}
          onClose={() => setModalItem(undefined)}
        />
      )}
    </div>
  );
}

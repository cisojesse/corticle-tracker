import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import type { ActionItem, Category } from '@/types';
import { CATEGORY_LABELS } from '@/types';
import type { useStorage } from '@/hooks/useStorage';
import { ActionItemTable } from '@/components/items/ActionItemTable';
import { ActionItemModal } from '@/components/items/ActionItemModal';
import { Plus } from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function CategoryView({ storage }: Props) {
  const { cat } = useParams<{ cat: string }>();
  const [modalItem, setModalItem] = useState<ActionItem | null | undefined>(undefined);

  if (!cat || !VALID_CATEGORIES.includes(cat)) {
    return <Navigate to="/" replace />;
  }

  const category = cat as Category;
  const categoryItems = storage.data.items.filter(i => i.category === category);

  function handleSave(item: ActionItem) {
    const existing = storage.data.items.find(i => i.id === item.id);
    if (existing) {
      storage.updateItem(item);
    } else {
      storage.addItem(item);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{CATEGORY_LABELS[category]}</h1>
          <p className="text-sm text-gray-500 mt-1">{categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}</p>
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

      <ActionItemTable
        items={categoryItems}
        onEdit={item => setModalItem(item)}
        onDelete={id => storage.deleteItem(id)}
        onUpdate={item => storage.updateItem(item)}
        initialFilter={{ category }}
      />

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

import { useState } from 'react';
import type { ActionItem } from '@/types';
import type { useStorage } from '@/hooks/useStorage';
import { ActionItemTable } from '@/components/items/ActionItemTable';
import { ActionItemModal } from '@/components/items/ActionItemModal';
import { Plus } from 'lucide-react';

interface Props {
  storage: ReturnType<typeof useStorage>;
}

export default function AllItems({ storage }: Props) {
  const [modalItem, setModalItem] = useState<ActionItem | null | undefined>(undefined);

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
        <h1 className="text-2xl font-bold text-gray-900">All Items</h1>
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
        items={storage.data.items}
        onEdit={item => setModalItem(item)}
        onDelete={id => storage.deleteItem(id)}
        onUpdate={item => storage.updateItem(item)}
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

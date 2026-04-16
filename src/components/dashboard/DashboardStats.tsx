import type { ActionItem } from '@/types';
import { isOverdue, isDueSoon } from '@/utils/dateHelpers';
import { ListTodo, AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react';

interface Props {
  items: ActionItem[];
  cadenceOverdueCount?: number;
}

export function DashboardStats({ items, cadenceOverdueCount = 0 }: Props) {
  const total = items.length;
  const overdueCount = items.filter(i => i.status !== 'done' && isOverdue(i.dueDate)).length;
  const dueSoonCount = items.filter(i => i.status !== 'done' && isDueSoon(i.dueDate)).length;
  const doneCount = items.filter(i => i.status === 'done').length;

  const stats = [
    { label: 'Total Items', value: total, icon: ListTodo, color: 'text-corticle-cyan', bg: 'bg-cyan-50' },
    { label: 'Needs Touch', value: cadenceOverdueCount, icon: RefreshCw, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Due Soon', value: dueSoonCount, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Completed', value: doneCount, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map(stat => (
        <div
          key={stat.label}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

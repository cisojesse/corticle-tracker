import { useState, useMemo } from 'react';
import { useAuth } from '@/auth/AuthContext';
import type { useStorage } from '@/hooks/useStorage';
import type { Deal, DealStage, DealType, Company } from '@/types';
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER, COMPANY_TYPE_LABELS } from '@/types';
import { DealModal } from '@/components/deals/DealModal';
import { formatDueDate } from '@/utils/dateHelpers';
import { Plus, Pencil, Trash2, Kanban, DollarSign } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface Props {
  storage: ReturnType<typeof useStorage>;
}

const STAGE_COLORS: Record<DealStage, { bg: string; border: string; badge: string }> = {
  lead:     { bg: 'bg-slate-50',   border: 'border-slate-200',  badge: 'bg-slate-100 text-slate-700' },
  pilot:    { bg: 'bg-blue-50',    border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  proposal: { bg: 'bg-amber-50',   border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700' },
  close:    { bg: 'bg-green-50',   border: 'border-green-200',  badge: 'bg-green-100 text-green-700' },
};

const TYPE_BADGE: Record<DealType, string> = {
  SBIR:   'bg-purple-100 text-purple-700',
  OTA:    'bg-indigo-100 text-indigo-700',
  Direct: 'bg-cyan-100 text-cyan-700',
  GSA:    'bg-teal-100 text-teal-700',
  Other:  'bg-gray-100 text-gray-600',
};

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

// ---------------------------------------------------------------------------
// Pipeline view
// ---------------------------------------------------------------------------

export default function Pipeline({ storage }: Props) {
  const { session } = useAuth();
  const fileRequired = storage.syncStatus === 'no_file';

  const { deals, companies, contacts, users } = storage.data;
  const companyById = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);
  const userById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  // Modal state: undefined = closed, null = new deal, Deal = edit
  const [modalDeal, setModalDeal] = useState<Deal | null | undefined>(undefined);
  const [defaultStage, setDefaultStage] = useState<DealStage>('lead');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filters
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<DealType | 'all'>('all');

  const filteredDeals = useMemo(() => {
    let result = [...deals];
    if (ownerFilter !== 'all') result = result.filter(d => d.ownerUserId === ownerFilter);
    if (typeFilter !== 'all') result = result.filter(d => d.dealType === typeFilter);
    return result;
  }, [deals, ownerFilter, typeFilter]);

  // Group by stage
  const dealsByStage = useMemo(() => {
    const map: Record<DealStage, Deal[]> = { lead: [], pilot: [], proposal: [], close: [] };
    for (const d of filteredDeals) map[d.stage].push(d);
    // Sort within each column by probability desc, then dealSize desc
    for (const stage of DEAL_STAGE_ORDER) {
      map[stage].sort((a, b) => b.probability - a.probability || b.dealSize - a.dealSize);
    }
    return map;
  }, [filteredDeals]);

  function openNewDeal(stage: DealStage) {
    setDefaultStage(stage);
    setModalDeal(null);
  }

  function handleStageChange(deal: Deal, newStage: DealStage) {
    storage.updateDeal({ ...deal, stage: newStage, updatedAt: new Date().toISOString() });
  }

  function handleDelete(id: string) {
    storage.deleteDeal(id);
    setDeleteConfirm(null);
  }

  // Pipeline totals
  const totalValue = filteredDeals.reduce((sum, d) => sum + d.dealSize, 0);
  const weightedValue = filteredDeals.reduce((sum, d) => sum + d.dealSize * (d.probability / 100), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''} &middot;{' '}
            {formatUSD(totalValue)} total &middot; {formatUSD(weightedValue)} weighted
          </p>
        </div>
        <button
          onClick={() => openNewDeal('lead')}
          disabled={fileRequired}
          className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={fileRequired ? 'Open a data file first' : 'Create new deal'}
        >
          <Plus size={18} />
          New Deal
        </button>
      </div>

      {fileRequired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Open or create a data file (header toolbar) before managing deals.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by owner"
        >
          <option value="all">All owners</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.displayName}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as DealType | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corticle-cyan"
          aria-label="Filter by deal type"
        >
          <option value="all">All types</option>
          {(['SBIR', 'OTA', 'Direct', 'GSA', 'Other'] as DealType[]).map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Kanban board */}
      {deals.length === 0 && !fileRequired ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Kanban size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No deals yet. Create your first to start tracking the pipeline.</p>
          <button
            onClick={() => openNewDeal('lead')}
            disabled={fileRequired}
            className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Create Your First Deal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {DEAL_STAGE_ORDER.map(stage => {
            const stageDeals = dealsByStage[stage];
            const stageTotal = stageDeals.reduce((s, d) => s + d.dealSize, 0);
            const colors = STAGE_COLORS[stage];
            return (
              <div key={stage} className={`rounded-xl border ${colors.border} ${colors.bg} min-h-[200px] flex flex-col`}>
                {/* Column header */}
                <div className="px-4 py-3 border-b border-gray-200/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{DEAL_STAGE_LABELS[stage]}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {stageDeals.length} deal{stageDeals.length !== 1 ? 's' : ''} &middot; {formatUSD(stageTotal)}
                    </p>
                  </div>
                  <button
                    onClick={() => openNewDeal(stage)}
                    disabled={fileRequired}
                    className="p-1.5 text-gray-400 hover:text-corticle-cyan hover:bg-white rounded-lg transition-colors"
                    aria-label={`Add deal to ${DEAL_STAGE_LABELS[stage]}`}
                    title={`Add deal to ${DEAL_STAGE_LABELS[stage]}`}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3">
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No deals</p>
                  )}
                  {stageDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      company={companyById.get(deal.companyId)}
                      ownerName={userById.get(deal.ownerUserId)?.displayName}
                      deleteConfirm={deleteConfirm === deal.id}
                      onEdit={() => setModalDeal(deal)}
                      onDelete={() => handleDelete(deal.id)}
                      onDeleteClick={() => setDeleteConfirm(deal.id)}
                      onStageChange={newStage => handleStageChange(deal, newStage)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalDeal !== undefined && (
        <DealModal
          deal={modalDeal}
          companies={companies}
          contacts={contacts}
          users={users}
          currentUserId={session?.userId ?? ''}
          defaultStage={defaultStage}
          onSave={d => {
            if (deals.find(x => x.id === d.id)) storage.updateDeal(d);
            else storage.addDeal(d);
          }}
          onClose={() => setModalDeal(undefined)}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Deal Card
// ===========================================================================

function DealCard({
  deal,
  company,
  ownerName,
  deleteConfirm,
  onEdit,
  onDelete,
  onDeleteClick,
  onStageChange,
}: {
  deal: Deal;
  company?: Company;
  ownerName?: string;
  deleteConfirm: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteClick: () => void;
  onStageChange: (stage: DealStage) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 space-y-2">
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={onEdit}
          className="text-sm font-medium text-gray-900 text-left hover:text-corticle-cyan transition-colors leading-snug"
        >
          {deal.name}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onEdit} className="p-1 text-gray-400 hover:text-corticle-cyan rounded transition-colors" aria-label="Edit deal">
            <Pencil size={14} />
          </button>
          {deleteConfirm ? (
            <button onClick={onDelete} className="px-1.5 py-0.5 text-red-600 hover:bg-red-50 rounded text-xs font-medium" aria-label="Confirm delete">
              Confirm
            </button>
          ) : (
            <button onClick={onDeleteClick} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" aria-label="Delete deal">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Company */}
      {company && (
        <p className="text-xs text-gray-500">
          {company.name}
          {company.type !== 'federal_agency' && company.type !== 'commercial' && (
            <span className="text-gray-400"> ({COMPANY_TYPE_LABELS[company.type]})</span>
          )}
        </p>
      )}

      {/* Badges: type + size + probability */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${TYPE_BADGE[deal.dealType]}`}>
          {deal.dealType}
        </span>
        {deal.dealSize > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-600">
            <DollarSign size={10} />
            {formatUSD(deal.dealSize)}
          </span>
        )}
        {deal.probability > 0 && (
          <span className="text-[11px] text-gray-400">{deal.probability}%</span>
        )}
      </div>

      {/* Footer: close date + owner + stage select */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-[11px] text-gray-400 min-w-0 truncate">
          {deal.expectedCloseDate && <span>Close {formatDueDate(deal.expectedCloseDate)}</span>}
          {ownerName && <span className="ml-2">{ownerName}</span>}
        </div>
        <select
          value={deal.stage}
          onChange={e => onStageChange(e.target.value as DealStage)}
          className="text-[11px] border border-gray-200 rounded px-1 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-corticle-cyan"
          aria-label="Change deal stage"
        >
          {DEAL_STAGE_ORDER.map(s => (
            <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

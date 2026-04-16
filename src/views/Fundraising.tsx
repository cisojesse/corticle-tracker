import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import type { useStorage } from '@/hooks/useStorage';
import type { Round, InvestorEngagement, InvestorStage, Company } from '@/types';
import { INVESTOR_STAGE_LABELS, INVESTOR_STAGE_ORDER } from '@/types';
import { RoundModal } from '@/components/investors/RoundModal';
import { EngagementModal } from '@/components/investors/EngagementModal';
import { Plus, Pencil, Trash2, TrendingUp, Star, DollarSign, Settings } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface Props {
  storage: ReturnType<typeof useStorage>;
}

const STAGE_COLORS: Record<InvestorStage, { bg: string; border: string }> = {
  target:     { bg: 'bg-slate-50',  border: 'border-slate-200' },
  intro:      { bg: 'bg-sky-50',    border: 'border-sky-200' },
  pitch:      { bg: 'bg-blue-50',   border: 'border-blue-200' },
  diligence:  { bg: 'bg-indigo-50', border: 'border-indigo-200' },
  term_sheet: { bg: 'bg-amber-50',  border: 'border-amber-200' },
  committed:  { bg: 'bg-green-50',  border: 'border-green-200' },
  passed:     { bg: 'bg-red-50',    border: 'border-red-200' },
};

const ROUND_STATUS_BADGE: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-blue-100 text-blue-700',
};

function formatUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export default function Fundraising({ storage }: Props) {
  const { session } = useAuth();
  const fileRequired = storage.syncStatus === 'no_file';

  const { rounds, investorEngagements, companies, contacts, users } = storage.data;
  const companyById = useMemo(() => new Map(companies.map(c => [c.id, c])), [companies]);
  const userById = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);

  // Selected round
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const activeRound = rounds.find(r => r.id === selectedRoundId) ?? rounds[0] ?? null;

  // Auto-select first round if none selected
  useEffect(() => {
    if (!selectedRoundId && activeRound) {
      setSelectedRoundId(activeRound.id);
    }
  }, [selectedRoundId, activeRound]);

  // Modals
  const [roundModal, setRoundModal] = useState<Round | null | undefined>(undefined);
  const [engModal, setEngModal] = useState<InvestorEngagement | null | undefined>(undefined);
  const [defaultStage, setDefaultStage] = useState<InvestorStage>('target');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Engagements for active round
  const roundEngagements = useMemo(
    () => activeRound ? investorEngagements.filter(e => e.roundId === activeRound.id) : [],
    [investorEngagements, activeRound],
  );

  // Group by stage
  const engByStage = useMemo(() => {
    const map: Record<InvestorStage, InvestorEngagement[]> = {
      target: [], intro: [], pitch: [], diligence: [], term_sheet: [], committed: [], passed: [],
    };
    for (const e of roundEngagements) map[e.stage].push(e);
    for (const stage of INVESTOR_STAGE_ORDER) {
      map[stage].sort((a, b) => b.checkSize - a.checkSize);
    }
    return map;
  }, [roundEngagements]);

  // Totals
  const totalCommitted = roundEngagements
    .filter(e => e.stage === 'committed')
    .reduce((sum, e) => sum + e.checkSize, 0);
  const totalPipeline = roundEngagements
    .filter(e => e.stage !== 'passed')
    .reduce((sum, e) => sum + e.checkSize, 0);

  function openNewEngagement(stage: InvestorStage) {
    setDefaultStage(stage);
    setEngModal(null);
  }

  function handleStageChange(eng: InvestorEngagement, newStage: InvestorStage) {
    storage.updateInvestorEngagement({ ...eng, stage: newStage, updatedAt: new Date().toISOString() });
  }

  function handleDeleteEngagement(id: string) {
    storage.deleteInvestorEngagement(id);
    setDeleteConfirm(null);
  }

  function handleDeleteRound(id: string) {
    const deps = investorEngagements.filter(e => e.roundId === id).length;
    if (deps > 0) {
      alert(`Cannot delete: ${deps} engagement(s) are in this round. Remove them first.`);
      return;
    }
    storage.deleteRound(id);
    setSelectedRoundId('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fundraising</h1>
          <p className="text-sm text-gray-500 mt-1">
            {rounds.length} round{rounds.length !== 1 ? 's' : ''}
            {activeRound && (
              <> &middot; {roundEngagements.length} engagement{roundEngagements.length !== 1 ? 's' : ''} &middot; {formatUSD(totalCommitted)} committed &middot; {formatUSD(totalPipeline)} pipeline</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRoundModal(null)}
            disabled={fileRequired}
            className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            New Round
          </button>
          {activeRound && (
            <button
              onClick={() => openNewEngagement('target')}
              disabled={fileRequired}
              className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Add Investor
            </button>
          )}
        </div>
      </div>

      {fileRequired && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Open or create a data file (header toolbar) before managing fundraising.
        </div>
      )}

      {/* Round selector */}
      {rounds.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {rounds.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRoundId(r.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                activeRound?.id === r.id
                  ? 'bg-corticle-cyan text-white border-corticle-cyan'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-corticle-cyan hover:text-corticle-cyan'
              }`}
            >
              {r.name}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeRound?.id === r.id ? 'bg-white/20 text-white' : ROUND_STATUS_BADGE[r.status]
              }`}>
                {r.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Round detail bar */}
      {activeRound && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Target:</span>{' '}
              <span className="font-semibold text-gray-900">{formatUSD(activeRound.targetAmount)}</span>
            </div>
            <div>
              <span className="text-gray-500">Raised:</span>{' '}
              <span className="font-semibold text-green-700">{formatUSD(activeRound.raisedAmount)}</span>
            </div>
            {activeRound.targetAmount > 0 && (
              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (activeRound.raisedAmount / activeRound.targetAmount) * 100)}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRoundModal(activeRound)}
              className="p-1.5 text-gray-400 hover:text-corticle-cyan hover:bg-cyan-50 rounded-lg transition-colors"
              aria-label="Edit round"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => handleDeleteRound(activeRound.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete round"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rounds.length === 0 && !fileRequired && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <TrendingUp size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">No fundraising rounds yet.</p>
          <button
            onClick={() => setRoundModal(null)}
            disabled={fileRequired}
            className="inline-flex items-center gap-2 bg-corticle-cyan text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-corticle-accent transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Create Your First Round
          </button>
        </div>
      )}

      {/* Kanban board */}
      {activeRound && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3">
          {INVESTOR_STAGE_ORDER.map(stage => {
            const stageEngs = engByStage[stage];
            const stageTotal = stageEngs.reduce((s, e) => s + e.checkSize, 0);
            const colors = STAGE_COLORS[stage];
            return (
              <div key={stage} className={`rounded-xl border ${colors.border} ${colors.bg} min-h-[160px] flex flex-col`}>
                {/* Column header */}
                <div className="px-3 py-2.5 border-b border-gray-200/50 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-xs">{INVESTOR_STAGE_LABELS[stage]}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {stageEngs.length} &middot; {formatUSD(stageTotal)}
                    </p>
                  </div>
                  <button
                    onClick={() => openNewEngagement(stage)}
                    disabled={fileRequired}
                    className="p-1 text-gray-400 hover:text-corticle-cyan hover:bg-white rounded transition-colors"
                    aria-label={`Add to ${INVESTOR_STAGE_LABELS[stage]}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 p-2 space-y-2">
                  {stageEngs.length === 0 && (
                    <p className="text-[10px] text-gray-400 text-center py-4">—</p>
                  )}
                  {stageEngs.map(eng => (
                    <EngagementCard
                      key={eng.id}
                      engagement={eng}
                      company={companyById.get(eng.investorCompanyId)}
                      ownerName={userById.get(eng.ownerUserId)?.displayName}
                      deleteConfirm={deleteConfirm === eng.id}
                      onEdit={() => setEngModal(eng)}
                      onDelete={() => handleDeleteEngagement(eng.id)}
                      onDeleteClick={() => setDeleteConfirm(eng.id)}
                      onStageChange={s => handleStageChange(eng, s)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {roundModal !== undefined && (
        <RoundModal
          round={roundModal}
          onSave={r => {
            if (rounds.find(x => x.id === r.id)) storage.updateRound(r);
            else storage.addRound(r);
            setSelectedRoundId(r.id);
          }}
          onClose={() => setRoundModal(undefined)}
        />
      )}
      {engModal !== undefined && activeRound && (
        <EngagementModal
          engagement={engModal}
          roundId={activeRound.id}
          companies={companies}
          contacts={contacts}
          users={users}
          currentUserId={session?.userId ?? ''}
          defaultStage={defaultStage}
          onSave={e => {
            if (investorEngagements.find(x => x.id === e.id)) storage.updateInvestorEngagement(e);
            else storage.addInvestorEngagement(e);
          }}
          onClose={() => setEngModal(undefined)}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Engagement Card
// ===========================================================================

function EngagementCard({
  engagement,
  company,
  ownerName,
  deleteConfirm,
  onEdit,
  onDelete,
  onDeleteClick,
  onStageChange,
}: {
  engagement: InvestorEngagement;
  company?: Company;
  ownerName?: string;
  deleteConfirm: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteClick: () => void;
  onStageChange: (stage: InvestorStage) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 space-y-1.5">
      {/* Title row */}
      <div className="flex items-start justify-between gap-1">
        <button
          onClick={onEdit}
          className="text-xs font-medium text-gray-900 text-left hover:text-corticle-cyan transition-colors leading-snug"
        >
          {company?.name ?? 'Unknown'}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onEdit} className="p-0.5 text-gray-400 hover:text-corticle-cyan rounded transition-colors" aria-label="Edit">
            <Pencil size={12} />
          </button>
          {deleteConfirm ? (
            <button onClick={onDelete} className="px-1 py-0.5 text-red-600 hover:bg-red-50 rounded text-[10px] font-medium">
              OK
            </button>
          ) : (
            <button onClick={onDeleteClick} className="p-0.5 text-gray-400 hover:text-red-500 rounded transition-colors" aria-label="Delete">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1">
        {engagement.isLead && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 px-1 py-0.5 rounded">
            <Star size={9} /> Lead
          </span>
        )}
        {engagement.checkSize > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-600">
            <DollarSign size={9} />
            {formatUSD(engagement.checkSize)}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] text-gray-400 truncate">{ownerName}</span>
        <select
          value={engagement.stage}
          onChange={e => onStageChange(e.target.value as InvestorStage)}
          className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-corticle-cyan"
          aria-label="Change stage"
        >
          {INVESTOR_STAGE_ORDER.map(s => (
            <option key={s} value={s}>{INVESTOR_STAGE_LABELS[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

# Phase 2a Build Plan — Corticle Ops Tracker

**Prepared:** 2026-04-15
**Based on:** `docs/WORKFLOW_RESEARCH.md` + `Corticle_Federal_GTM_Strategy V5`
**Approach:** Schema-first. Keep the local-first (JSON file) architecture. No backend.
**Deployable increments:** 3 sprints, each shippable standalone.

---

## 0. Goals and non-goals

### Goals
1. Replace the free-text `contact` field on ActionItem with real Contact / Company / Deal entities
2. Operationalize the Federal GTM playbook: deal types, agency hierarchy, pipeline Kanban, Carahsoft attribution
3. Backfill the existing 28 seed action items into the new relational model without data loss
4. Add activity logging and cadence reminders
5. Basic reporting: pipeline funnel, owner performance, aging

### Non-goals (explicitly deferred to Phase 2b or 3)
- Multi-user concurrent editing with conflict resolution → Phase 2b (Supabase)
- Live email/calendar sync → Phase 3
- AI features → Phase 3
- Comments, @mentions, real-time notifications → Phase 2b
- Mobile app → out of scope

### Constraints
- Must stay deployable to GitHub Pages from a single JSON data file
- Existing users (Jesse, Alex, Mac + admin-created) must keep working
- Existing action items must migrate cleanly — no data loss

---

## 1. Target data model (all in `src/types/index.ts`)

### New entities

```typescript
// Company = an agency, an investor firm, a partner organization, etc.
// Can nest for agency hierarchy: DoD → ARCYBER → Cyber Protection Brigade
interface Company {
  id: string;
  name: string;                       // "ARCYBER", "Sequoia Capital"
  type: CompanyType;
  parentId: string | null;            // for agency sub-orgs
  website: string;
  notes: string;
  // Federal-specific (optional)
  agencyCode: string | null;          // e.g. "DISA", "ARCYBER"
  agencyTier: 'cabinet' | 'dod' | 'civilian' | 'sub_agency' | null;
  createdAt: string;
  updatedAt: string;
}

type CompanyType =
  | 'federal_agency'    // the end customer (ARCYBER, DISA, VA...)
  | 'commercial'        // non-federal end customer
  | 'investor'          // VC, angel, etc.
  | 'partner'           // technology / integration partner (non-channel)
  | 'distributor'       // channel tier 1 (Carahsoft today; could add more)
  | 'reseller';         // channel tier 2 / VAR (anyone in Carahsoft's ecosystem)

// Contact = an individual person we talk to
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string;                      // "Director of Operations (G-3/5/7)"
  email: string;
  phone: string;
  linkedInUrl: string;
  companyId: string | null;           // FK to Company
  tags: string[];                     // free-form
  source: string;                     // "warm-intro", "conference", "inbound"
  notes: string;
  // Rolled-up from activities
  lastTouchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Deal = a tracked opportunity tied to an end-customer Company.
// Always owned by Corticle (Deal.ownerUserId → AppUser).
// Channel attribution is modeled as distributor + reseller on the Deal.
interface Deal {
  id: string;
  name: string;                       // "ARCYBER SBIR Phase II"
  companyId: string;                  // FK to Company — the END CUSTOMER
  primaryContactId: string | null;    // FK to Contact
  ownerUserId: string;                // FK to AppUser.id — ALWAYS a Corticle team member
  stage: DealStage;
  dealType: DealType;
  contractVehicle: string;            // free-text fallback
  dealSize: number;                   // USD
  probability: number;                // 0-100
  expectedCloseDate: string;
  // Channel attribution (replaces ad-hoc "carahsoftSourced" flag)
  distributorCompanyId: string | null;  // FK to Company (type: distributor)
  resellerCompanyId: string | null;     // FK to Company (type: reseller)
  // Playbook
  playbookEntry: string;              // "SBIR Phase II (DCO automation)"
  playbookHook: string;               // "Reduce incident response time by 70%"
  playbookPilot: string;              // "60-day deployment in CPTs"
  playbookExpansion: string;          // "Brigade-wide rollout ($1M+)"
  notes: string;
  createdAt: string;
  updatedAt: string;
}

type DealStage = 'lead' | 'pilot' | 'proposal' | 'close';
type DealType = 'SBIR' | 'OTA' | 'Direct' | 'GSA' | 'Other';

// Activity = a touchpoint log entry
interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'linkedin' | 'note' | 'pilot_milestone';
  subject: string;
  body: string;
  contactId: string | null;
  companyId: string | null;           // rollup
  dealId: string | null;              // rollup
  userId: string;                     // who logged it
  occurredAt: string;                 // not createdAt
  createdAt: string;
}

// Cadence = simple interval reminder per Contact
interface Cadence {
  id: string;
  contactId: string;
  intervalDays: number;               // "touch every N days"
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Extended existing entities

```typescript
interface ActionItem {
  // ... existing fields stay ...
  contact: string;                    // keep as display fallback during migration
  contactId: string | null;           // NEW — FK to Contact, nullable
  dealId: string | null;              // NEW — FK to Deal, nullable
}

interface AppData {
  version: string;
  items: ActionItem[];
  users: AppUser[];
  // NEW
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  cadences: Cadence[];
  lastSaved: string;
}
```

### Bump `DATA_VERSION` to `2.0.0` and add a migration in `normalizeAppData`
Old files (v1.0.0) should auto-upgrade on load: missing arrays default to `[]`, existing ActionItems get `contactId: null`, `dealId: null`.

---

## 2. Sprint plan

### Sprint 1 — Relational foundation (~4 days)
Goal: replace free-text `contact` with real entities. Backfill the 28 seed items. Ship the Federal pipeline Kanban.

| # | Deliverable | Files touched | Est |
|---|---|---|---|
| 1.1 | Data model + storage CRUD | `types/index.ts`, `hooks/useStorage.ts` | 0.5d |
| 1.2 | Companies view + CRUD + agency hierarchy | `views/Companies.tsx`, `components/companies/*` | 1d |
| 1.3 | Contacts view + CRUD + company picker | `views/Contacts.tsx`, `components/contacts/*` | 1d |
| 1.4 | Backfill tool: map existing ActionItems to Contacts | `views/Backfill.tsx` (admin-only) | 0.5d |
| 1.5 | Deals + Kanban pipeline + federal fields | `views/Pipeline.tsx`, `components/deals/*` | 1d |

**Ship criteria:**
- All 28 seed items have a `contactId` or an explicit "skip" flag
- Federal pipeline view shows 4 Kanban columns (Lead / Pilot / Proposal / Close)
- Deal Type, Contract Vehicle, Dollar Size, Probability all editable on a Deal

### Sprint 2 — Workflow depth (~3.5 days)
Goal: turn the relational model into a workflow system. Activities, cadences, baseline reports.

| # | Deliverable | Files touched | Est |
|---|---|---|---|
| 2.1 | Activity log (CRUD + Contact/Deal timelines) | `components/activities/*`, `views/Contact.tsx`, `views/Deal.tsx` | 1.5d |
| 2.2 | Cadence reminders surfaced on Dashboard | `hooks/useCadences.ts`, `views/Dashboard.tsx` | 1d |
| 2.3 | Reports view: funnel + owner performance + aging | `views/Reports.tsx` | 1d |

**Ship criteria:**
- Logging an email/call against a Contact updates their `lastTouchedAt`
- Dashboard surfaces contacts overdue on their cadence
- Reports page shows: deals per stage (funnel), items per owner, stale-item count

### Sprint 3 — Federal polish + import (~3 days)
Goal: close the loop on Federal GTM specifics; make seed imports first-class.

| # | Deliverable | Files touched | Est |
|---|---|---|---|
| 3.1 | Seed merge UI (Admin → Import seed JSON) | `views/Admin.tsx`, `utils/seedMerge.ts` | 1d |
| 3.2 | Account playbook template editor on Company detail | `views/Company.tsx` | 0.5d |
| 3.3 | Weekly pipeline review dashboard (Monday-view) | `views/PipelineReview.tsx` | 1d |
| 3.4 | Channel attribution report (by distributor + reseller) | within `views/Reports.tsx` | 0.5d |

**Ship criteria:**
- Can import `seeds/federal-gtm-seed.json` through the UI without clobbering existing data
- Company detail shows Entry / Hook / Pilot / Expansion playbook fields
- Monday pipeline view: deals advanced this week, stalled deals, overdue cadences
- Channel report: $ pipeline and $ closed by distributor, by reseller

---

## 3. Critical path risks & mitigations

| Risk | Mitigation |
|---|---|
| Data migration corrupts existing files | `normalizeAppData` ONLY adds missing fields, never mutates existing ones. Write migration tests before release. |
| Backfill tool is too tedious for 28 items | Auto-suggest splits: "Director of Operations (G-3/5/7), ARCYBER" → parse on `,` into title + company; one-click accept |
| Kanban drag-and-drop is a rabbit hole | Ship stage-select dropdown first; add DnD as a fast-follow if it's painful |
| Single JSON file hits size limits | At current rate (~28 items, 1 user) we're 5+ years from 2 MB. Re-evaluate at Supabase migration. |
| Existing ActionItem.contact string diverges from Contact.displayName | Keep `ActionItem.contact` as a read-only display fallback; show warning icon when it's stale |

---

## 4. Design decisions locked in

1. **Don't break v1.0.0 data files** — migration is additive only. Bumping to `2.0.0` just signals the new fields exist.
2. **Keep `ActionItem.contact` (string)** — removed in a later migration once everyone's items have `contactId`. Avoids a hard cutover.
3. **Deal is a first-class entity, ActionItem links to it** — not the reverse. Lets one Deal have many ActionItems (proposal due, briefing due, follow-up due).
4. **Pipeline stages are fixed at Lead / Pilot / Proposal / Close** for Phase 2a — matches the Federal GTM doc. Configurable stages deferred to Phase 2b.
5. **Account playbook lives on Company, not Deal** — one playbook per target account; multiple Deals can inherit from it.
6. **Bcrypt still client-side** — matches current auth model. Revisit at Supabase migration.
7. **Deal ownership is always internal Corticle (ANSWER — Q1)** — `Deal.ownerUserId` is always an AppUser (Jesse, Alex, Mac, future team). Never assigned to a reseller or distributor.
8. **Channel model is two-tier: Distributor + Reseller (ANSWER — Q1/Q3)** — every Deal can optionally reference one `distributorCompanyId` (Carahsoft today) AND one `resellerCompanyId` (any VAR in the distributor's ecosystem). `CompanyType` includes both `'distributor'` and `'reseller'` as distinct categories.

---

## 5. Open questions for Jesse

**Resolved:**
- ~~Q1 Pipeline ownership~~ → Deal.ownerUserId is always a Corticle team member. Channel tracked separately as distributor + reseller FKs on Deal.
- ~~Q3 Channel Partner category~~ → Split into two distinct `CompanyType`s: `distributor` (Carahsoft today) and `reseller` (any VAR in the distributor ecosystem).

**Still open:**
1. **Investor deals** — should fundraising rounds live in `Deal` with `dealType: 'Direct'` and a flag, or do investors get their own entity? (Recommendation: reuse Deal — a check is a check.)
2. **Backfill UX preference** — bulk review screen (all 28 items on one page with inline matchers), or one-at-a-time wizard?
3. **Execution order** — ship Sprint 1 in one big push, or sub-deploy after each deliverable (1.1, 1.2, etc)? Sub-deploy gives faster review but more busywork.
4. **Who besides Jesse assigns work?** — Alex and Mac are admins but not shown as owners in the seed. Should we assign some ARCYBER/NETCOM items to them by default, or keep all Jesse and reassign later?

---

## 6. First commit target (Sprint 1, Deliverable 1.1)

The smallest reviewable chunk:

- Add Company, Contact, Deal, Activity, Cadence interfaces to `src/types/index.ts`
- Bump `DATA_VERSION` to `2.0.0`
- Update `AppData` interface with 5 new arrays
- Update `normalizeAppData` to default missing arrays to `[]`
- Add `addCompany`/`updateCompany`/`deleteCompany` (and same for contacts, deals, activities, cadences) to `useStorage`
- NO UI yet — just foundation
- `npm run build` still passes; existing app still works end-to-end

This unblocks 1.2, 1.3, 1.4, 1.5 to be built in parallel if needed.

---

## 7. What doesn't change

To prevent regression anxiety — these stay exactly as-is through Sprint 3:

- Auth (bcrypt, sessionStorage, users.config bootstrap + admin panel)
- File System Access API storage + autosave
- ActionItem CRUD + filters + table
- Dashboard overdue/due-soon panels
- Calendar .ics export
- GitHub Pages deployment

---

## Next step

Answer the 6 questions in §5, then we start with Sprint 1 Deliverable 1.1 (foundation commit). Estimated Sprint 1 total: 4 build-days; shippable to production at the end of each deliverable.

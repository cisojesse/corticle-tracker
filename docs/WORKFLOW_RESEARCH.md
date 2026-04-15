# Corticle Ops Tracker -- Workflow System Design Brief

**Prepared:** 2026-04-14
**Audience:** Jesse Whaley, Corticle Inc. leadership
**Purpose:** Research and recommendations for evolving the Ops Tracker from a lightweight action item tool into a full-featured workflow and relationship management system.

---

## 1. Product Model Expansion

The current app has exactly one entity: `ActionItem`. The free-text `contact` field doubles as both a person and a company name, which means you cannot track relationship history, link multiple action items to the same contact, or roll up activity across a company.

### Proposed New Entities

#### Contact

A real person you interact with -- an investor, a prospect champion, a partner PM.

```typescript
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  title: string;               // e.g. "VP Engineering"
  companyId: string | null;    // FK to Company
  tags: string[];              // free-form: "technical-buyer", "board-member"
  source: string;              // how we met: "warm-intro", "conference", "inbound"
  ownerId: string;             // which Corticle team member owns this relationship
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Company (Account)

An organization -- a prospect company, an investor fund, a partner firm.

```typescript
interface Company {
  id: string;
  name: string;
  domain: string;              // e.g. "acme.com" -- useful for email matching later
  industry: string;
  size: 'startup' | 'smb' | 'mid_market' | 'enterprise' | 'government';
  type: 'prospect' | 'investor' | 'partner' | 'vendor' | 'other';
  website: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Deal (Opportunity)

A specific business outcome you are pursuing -- a sales deal, a funding round conversation, a partnership agreement.

```typescript
type DealType = 'prospect' | 'investor' | 'partnership';

interface Deal {
  id: string;
  title: string;               // e.g. "Acme Corp -- Pilot Program"
  type: DealType;
  companyId: string;           // FK to Company
  primaryContactId: string;    // FK to Contact
  pipelineId: string;          // FK to Pipeline
  stageId: string;             // FK to PipelineStage
  value: number | null;        // dollar amount (ARR, investment size, etc.)
  probability: number | null;  // 0-100
  expectedCloseDate: string;
  ownerId: string;             // Corticle team member
  status: 'active' | 'won' | 'lost' | 'on_hold';
  lostReason: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Activity (Touchpoint)

Every interaction logged against a contact or deal -- an email, a call, a meeting, a LinkedIn DM.

```typescript
type ActivityType = 'email' | 'call' | 'meeting' | 'linkedin_message' | 'text' | 'note' | 'other';

interface Activity {
  id: string;
  type: ActivityType;
  subject: string;             // short summary
  body: string;                // full details / transcript notes
  contactId: string;           // FK to Contact
  dealId: string | null;       // FK to Deal (optional)
  actionItemId: string | null; // FK to ActionItem (if this touch was part of a task)
  direction: 'inbound' | 'outbound';
  occurredAt: string;          // when the interaction happened
  createdBy: string;
  createdAt: string;
}
```

### How Entities Relate

```
Company  1---*  Contact
Company  1---*  Deal
Contact  1---*  Activity
Deal     1---*  Activity
Deal     1---*  ActionItem (new field: dealId on ActionItem)
Contact  1---*  ActionItem (contactId replaces free-text contact field)
```

The existing `ActionItem` gains two optional foreign keys:

```typescript
// Added to ActionItem
contactId: string | null;   // replaces free-text "contact" field
dealId: string | null;       // links task to a specific deal
```

**Migration note:** existing action items keep their free-text `contact` string. A one-time migration script can fuzzy-match these into newly created Contact records, or they remain as-is until manually linked.

### How This Differs from the Free-Text Contact Field

| Current state | Proposed state |
|---|---|
| "John Smith, Acme" typed into every action item | One `Contact` record for John Smith, linked to one `Company` record for Acme |
| No way to see all interactions with John across categories | Contact detail page shows every action item, activity, and deal involving John |
| Duplicate/inconsistent spelling ("John Smith" vs "J. Smith") | Single source of truth, selected from a dropdown or quick-create |
| No email, phone, LinkedIn stored | All contact details in one place |

---

## 2. Workflow and Pipeline Features

### Pipeline Definitions

Different relationship types move through different stages. A `Pipeline` entity holds the stage definitions.

```typescript
interface PipelineStage {
  id: string;
  name: string;
  order: number;
  requiredFields: string[];    // e.g. ["primaryContactId", "value"] -- must be filled to enter this stage
  autoActions: AutoAction[];   // triggers on stage entry
}

interface AutoAction {
  type: 'create_action_item' | 'send_notification' | 'set_field';
  config: Record<string, unknown>;
}

interface Pipeline {
  id: string;
  name: string;                // e.g. "BD Pipeline", "Investor Pipeline"
  type: DealType;
  stages: PipelineStage[];
}
```

### Recommended Default Pipelines

**BD / Prospects:**
`Lead` -> `Qualified` -> `Discovery Call` -> `Demo / POC` -> `Proposal Sent` -> `Negotiation` -> `Closed Won / Lost`

**Investors:**
`Identified` -> `Intro Sent` -> `First Meeting` -> `Due Diligence` -> `Term Sheet` -> `Closed`

**Partnerships:**
`Identified` -> `Exploratory Call` -> `Alignment Check` -> `Agreement Draft` -> `Signed`

### Custom vs. Fixed Stages

Recommendation: **configurable per pipeline, with sensible defaults**. Store pipeline definitions in the data file alongside items. The 3-person team can tweak stages without code changes. Avoid per-item custom stages (too complex, too few users to justify).

### Stage Transition Rules

- `requiredFields` on each stage blocks advancement until filled (e.g., must have a `value` before entering "Proposal Sent")
- Backward movement is always allowed (deals regress)
- Moving to "Closed Won" prompts for actual close date and final value
- Moving to "Closed Lost" requires `lostReason`

### Automation Triggers (Phase 2b+)

- On entering "Discovery Call" stage: auto-create an ActionItem "Prepare discovery questions for {company}"
- On entering "Proposal Sent": auto-create follow-up ActionItem due in 5 business days
- On deal stale for 14 days in any stage: surface in "Stale Deals" dashboard widget

---

## 3. Outreach Tracking

### Logging Touchpoints

Activities are logged via a quick-entry form on the Contact or Deal detail page. Fields: type (email/call/meeting/etc.), subject, body, direction, date.

For Phase 2a (no backend), this is manual entry. For Phase 2b+ with a backend, email ingestion can auto-create activities (see Section 6).

### Cadence / Sequence Management

```typescript
interface Cadence {
  id: string;
  contactId: string;
  intervalDays: number;        // e.g. 14 for "touch every 2 weeks"
  nextDueDate: string;
  enabled: boolean;
  templateActionItemTitle: string;  // auto-generated task title
}
```

When `nextDueDate` arrives, the system auto-creates an ActionItem: "Follow up with {contact.firstName} at {company.name}". After the user logs an activity against that contact, the cadence resets.

For a 3-person team, keep this simple: a "follow-up interval" field on the Contact record, not a full sequence builder. You are not Outreach.io -- you need a reminder, not a 12-step drip campaign.

### Last-Contact Rollups

The Contact detail view shows:
- **Last contacted:** computed from `MAX(activity.occurredAt)` for that contact
- **Days since last contact:** highlighted red if past the cadence interval
- **Total touchpoints:** count of activities
- **Next action:** the nearest open ActionItem linked to this contact

These are computed at render time from the Activity array -- no denormalization needed at the current data scale.

---

## 4. Activity Feed and Collaboration

### Comments on Items

```typescript
interface Comment {
  id: string;
  entityType: 'action_item' | 'deal' | 'contact';
  entityId: string;
  body: string;
  mentions: string[];          // user IDs mentioned with @
  createdBy: string;
  createdAt: string;
}
```

With 3 users and local-first storage, comments live in the JSON file. `@mentions` are parsed from the body text and stored as an array for potential notification routing.

### Audit Log

```typescript
interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
}
```

Every field change on ActionItem, Deal, or Contact writes an AuditEntry. This is the entity that will grow fastest and is the primary driver for eventually needing a backend (see Section 7).

**Size estimate:** 3 users, 50 entities, ~10 changes/day = ~300 audit entries/month = ~3,600/year. At ~200 bytes each, that is about 700 KB/year. The JSON file can absorb this for 2-3 years before search performance degrades noticeably.

### Notifications Model

For Phase 2a (no backend): browser Notification API (already implemented) plus an in-app notification feed -- an array of `Notification` objects rendered in a dropdown. These are generated locally when the app detects conditions (overdue item, stale deal, cadence due, @mention in a new comment).

For Phase 2b+: Slack webhook notifications and/or email digests via a lightweight cloud function.

---

## 5. Reporting and Analytics

### Conversion Funnel

For each pipeline, compute: how many deals are in each stage, and what is the historical conversion rate between stages. Render as a horizontal funnel chart.

Data source: all Deals plus their AuditEntries (to know when each deal entered/exited each stage). No new entities needed.

### Owner Performance

Per team member:
- Open action items count and overdue percentage
- Average time from ActionItem creation to completion
- Deals owned and weighted pipeline value (`value * probability`)
- Activity volume (touchpoints logged per week)

### Aging Reports

- **Stale deals:** deals where no activity has been logged in N days (configurable, default 14)
- **Overdue action items:** already exists, extend to show by owner and by deal
- **Neglected contacts:** contacts past their cadence interval with no recent activity

All of these are computable from existing data at render time. For a 3-person team with dozens to low hundreds of records, no pre-aggregation or OLAP is needed -- just filtered array operations.

---

## 6. Integrations

### Email Ingestion

**Phase 2a:** Manual activity logging (copy-paste email subject/body into an Activity form). This is where most startups begin.

**Phase 2b:** BCC-to-log -- a dedicated email address (e.g., `log@ops.corticle.io`) that receives forwarded or BCC'd emails. A cloud function parses sender, matches against Contact email/Company domain, and creates an Activity. Services like Mailgun or SendGrid inbound parse make this straightforward.

**Phase 3:** Full bidirectional email sync via Gmail/Outlook Graph API. This is a significant engineering investment. Only worthwhile if the team grows past 10 and email volume is high.

### Calendar Sync

The current .ics download is a good starting point. Next steps:

- **Phase 2a:** Google Calendar URL generation (already implemented). Add Outlook web URL generation.
- **Phase 2b:** 2-way sync via Google Calendar API or Microsoft Graph. When a calendar event linked to a Deal/ActionItem is completed, auto-log an Activity. Requires OAuth and a backend.

### CRM Export

For investor relations and BD reporting to a board:

- **CSV export** of Deals, Contacts, Activities -- trivial to add in Phase 2a
- **HubSpot/Salesforce push** -- only needed if an investor or partner requires data in their CRM. Use their REST APIs via a cloud function. This is a Phase 3 consideration and may never be needed for a 3-person team.

### Slack Notifications

A Slack incoming webhook is the cheapest integration to implement:

- Send a message when a deal advances stages
- Daily digest of overdue items
- Alert when a high-priority item is created

Requires only a webhook URL stored in config and a `fetch()` call. Can be done in Phase 2a with no backend (the browser makes the POST directly, or a Cloudflare Worker proxies it for security).

---

## 7. Architecture Decision: Backend vs. JSON File

### Where the Current Architecture Breaks

| Concern | JSON file limit | When it matters |
|---|---|---|
| **Multi-user concurrent edits** | Two users editing simultaneously will overwrite each other's changes. File System Access API has no locking or merge. iCloud/OneDrive sync may silently create conflict copies. | As soon as 2+ people use the app daily on the same data file. **This is the most urgent constraint.** |
| **Full-text search** | `Array.filter` + `String.includes` is O(n). Perfectly fine for hundreds of records, slow past ~5,000. | 1-2 years out at current growth. |
| **Audit log size** | JSON parse/stringify of the entire file on every save. At 10 MB+ the auto-save lag becomes perceptible. | ~3-5 years at estimated growth. |
| **Offline + sync** | Works great for one user. No conflict resolution for multi-device. | Immediately relevant if Jesse uses both laptop and phone. |
| **Access control** | bcrypt auth is client-side only -- anyone with the JSON file has all data. | Fine for internal tool; problematic if external stakeholders ever need limited access. |

### Option A: Stay Local-First (JSON + IndexedDB)

**How it works:** Keep File System Access API for persistence. Add IndexedDB as a structured local cache for faster queries. Add CRDTs (e.g., Yjs or Automerge) for multi-device conflict resolution.

**Pros:**
- Zero hosting cost, zero ops burden
- Instant load, works offline
- Jesse's preferred simplicity model
- CRDTs can handle multi-device for 1-2 users

**Cons:**
- CRDTs add significant complexity for questionable gain at 3 users
- No server means no email ingestion, no Slack webhooks from a trusted origin, no scheduled jobs
- Sharing the data file between 3 users via iCloud is fragile

**Best for:** Solo use or a 1-2 person team that values zero infrastructure above all else.

### Option B: Lightweight BaaS (Supabase, PocketBase, or Firebase)

**How it works:** Replace the JSON file with a hosted database. The React SPA talks directly to the BaaS via its client SDK. Auth moves to the BaaS provider.

| BaaS | Database | Auth | Realtime | Free tier | Self-hostable |
|---|---|---|---|---|---|
| **Supabase** | Postgres | Built-in (supports SSO) | Yes (websockets) | 500 MB, 50K rows | Yes |
| **PocketBase** | SQLite | Built-in | Yes (SSE) | N/A (self-hosted) | Yes (single Go binary) |
| **Firebase** | Firestore (NoSQL) | Built-in (Google SSO) | Yes | 1 GB | No |

**Recommendation within this tier: Supabase.**

- Postgres means proper relational schema for Contacts/Companies/Deals
- Row-level security policies can enforce per-user access without a custom backend
- Realtime subscriptions solve multi-user concurrency
- Free tier is generous enough for 3-20 users with low data volume
- Migrating to self-hosted or to raw Postgres later is trivial
- Edge Functions (Deno) can handle Slack webhooks, email ingestion, scheduled cadence checks

**Cons:**
- Introduces a hosted dependency (but Supabase is open-source and self-hostable)
- Learning curve for row-level security policies
- Slightly more complex deployment than "push to GitHub Pages"

**Best for:** A 3-10 person team that needs multi-user access, wants real-time sync, and does not want to build/maintain a custom backend.

### Option C: Custom Backend (Node + Postgres)

**How it works:** A Node.js (or Deno/Bun) API server with Postgres. Deployed to Railway, Render, Fly.io, or a VPS. The React SPA calls the API.

**Pros:**
- Full control over business logic, auth, integrations
- Can implement complex automation (cadence engine, email parsing, AI-powered features)
- Standard architecture that any future hire will understand

**Cons:**
- Hosting cost (~$5-25/month for a small instance)
- Maintenance burden: updates, backups, monitoring
- Overkill for 3 users doing 50 operations/day

**Best for:** 10+ users, or when business logic (approval workflows, multi-tenant access, complex automation) exceeds what BaaS row-level security can express.

### Recommendation

**Start with Option B (Supabase) as the Phase 2b target.** Here is the reasoning:

1. The app already has 3 users, which means concurrent edit conflicts on a shared JSON file are a real risk today.
2. Supabase's free tier handles the expected data volume for years.
3. The Postgres schema maps directly to the TypeScript interfaces above.
4. If Corticle grows to 10-20 users, Supabase scales without re-architecture.
5. If you ever need to eject to a custom backend, you are already on Postgres -- you just swap the client SDK for API calls.
6. Phase 2a work (new entity types, UI components) is stack-agnostic and carries forward regardless.

---

## 8. Migration Path and Phasing

### Phase 2a -- Lightest Touch (Current Stack, No Backend)

**Goal:** Add entity richness while staying on JSON file + GitHub Pages.

- Add `Contact` and `Company` interfaces to `types/index.ts`
- Extend `AppData` to include `contacts: Contact[]` and `companies: Company[]`
- Replace the free-text `contact` field on `ActionItemModal` with a Contact dropdown (with inline quick-create)
- Add Contact and Company list/detail views to the sidebar
- Add `Activity` logging (manual) on Contact detail view
- Add `lastContactedAt` computed display on Contact cards
- Add CSV export for all entities
- Add Slack webhook integration (outgoing only, configured via a settings panel)
- Estimated effort: 2-3 weeks of focused development

**What this preserves:** No server, no hosting changes, no auth migration. The JSON file just gets richer.

### Phase 2b -- Backend Jump (Supabase)

**Goal:** Solve multi-user concurrency and unlock server-side automation.

- Provision Supabase project, define Postgres schema matching the TypeScript interfaces
- Migrate `useStorage` hook from File System Access API to Supabase JS client
- Move auth from local bcrypt to Supabase Auth (supports email/password, SSO via Entra ID later)
- Enable Supabase Realtime so all 3 users see changes instantly
- Implement audit log as a Postgres trigger (automatic, zero app code)
- Add cadence engine as a Supabase Edge Function (cron-triggered, checks for overdue cadences, creates ActionItems)
- Add email ingestion via Supabase Edge Function + Mailgun inbound parse
- Estimated effort: 3-5 weeks, including data migration

**What this changes:** The app is no longer fully local-first. It requires internet access (though Supabase has offline support via their local-first SDK if needed).

### Phase 3+ -- Full-Featured System

Items to consider after the first two phases are stable:

- **Deal pipelines with Kanban board UI** (drag-and-drop stage transitions)
- **Reporting dashboard** with funnel charts, aging reports, owner scorecards
- **Two-way calendar sync** via Google Calendar API / Microsoft Graph
- **Email sync** (full bidirectional, not just BCC-to-log)
- **Custom fields** on any entity (user-defined key/value pairs)
- **Role-based access** (read-only viewers for advisors/board members)
- **Mobile-optimized PWA** or native wrapper via Capacitor
- **AI features:** auto-categorize inbound emails, suggest next-best-action, draft follow-up emails

### Simplicity Guardrail

Jesse liked the local-first, no-server simplicity. Each phase should be evaluated against this principle:

- Phase 2a preserves it entirely.
- Phase 2b trades it for multi-user reliability, which is a necessary trade at 3 active users.
- Phase 3+ features should only be built when there is demonstrated need, not speculatively.

---

## 9. Competitive Reference

| Feature | Inspired by | What to borrow | What to avoid |
|---|---|---|---|
| Relationship intelligence / auto-enrichment | **Affinity** | The idea that your CRM should know who you know and surface warm intros. Long-term AI feature. | Affinity's pricing and enterprise complexity. |
| Flexible object model | **Attio** | Custom fields, flexible entity types, powerful filtering. Attio proves a modern CRM does not need Salesforce's rigidity. | Attio's learning curve -- keep defaults opinionated. |
| Pipeline Kanban | **Pipedrive** | Pipedrive's dead-simple drag-and-drop deal board is the gold standard for small sales teams. Copy the UX directly. | Pipedrive's weak reporting and clunky integrations. |
| Action items + project tracking | **Linear** | Linear's speed, keyboard shortcuts, and minimal UI. The Ops Tracker already has this DNA. | Linear's engineering-centric terminology (cycles, projects, triage). |
| All-in-one workspace | **Notion** | Notion proves that a startup team will consolidate into one tool if it is flexible enough. The Ops Tracker should aim to be the one tab Jesse lives in. | Notion's "blank canvas" problem -- too much flexibility leads to no structure. Ship with strong defaults. |
| Marketing/sales CRM | **HubSpot** | HubSpot's free CRM tier proves that contact + company + deal + activity is the right core model. The schema proposed above mirrors HubSpot's object graph intentionally. | HubSpot's bloat, slow UI, and aggressive upselling. Stay lean. |

### Key Takeaway

The best move is to build a tool that feels like **Linear's speed** applied to **HubSpot's data model**, deployed with **Pipedrive's pipeline simplicity**, while keeping the current app's local-first ethos as long as practical. The proposed Phase 2a lets you validate the data model with zero infrastructure risk before committing to a backend.

---

## Appendix: Updated AppData Schema (Phase 2a Target)

For reference, here is what the expanded JSON data file would look like after Phase 2a:

```typescript
interface AppData {
  version: string;             // bump to "2.0.0"
  items: ActionItem[];
  contacts: Contact[];
  companies: Company[];
  activities: Activity[];
  deals: Deal[];
  pipelines: Pipeline[];
  comments: Comment[];
  auditLog: AuditEntry[];
  cadences: Cadence[];
  lastSaved: string;
}
```

All arrays in one file. Simple, portable, easy to back up. When the file gets unwieldy or multi-user conflicts become intolerable, Phase 2b migrates each array to a Supabase table with zero schema changes.

# Seed Data Files

These are pre-populated `AppData` JSON files you can load into the Corticle Ops Tracker.

## `federal-gtm-seed.json`

**Source:** `Corticle_Federal_GTM_Strategy.docx` (V5 as of 2026-04-15)  
**Items:** 28 action items pre-populated across the categories below.

| Category | Count | What it covers |
|---|---|---|
| `prospects_bd` | 17 | Named target individuals at ARCYBER, NETCOM, DISA, VA, CISA, Air Force + 2 current pipeline deals (ARCYBER SBIR, VA direct) |
| `partnerships` | 5 | Carahsoft portfolio leads, top reps, VAR identification (DoD + civilian) |
| `internal_ops` | 6 | Weekly execution cadence + monthly KPI tracking |

All items are:
- Assigned to **Jesse Whaley** (reassign as needed)
- Status: `open`
- `createdBy: jesse`
- Due dates: staggered 2026-04-20 through 2026-05-29

## How to use

### Option A — Start fresh with the seed
1. Copy `federal-gtm-seed.json` to your iCloud or OneDrive folder, rename to `corticle-ops-data.json`.
2. Log into the app.
3. Click **Open** in the header, select the file.
4. All 28 items appear immediately.

### Option B — Merge with an existing data file
There's no built-in merge UI yet. If you already have items:
1. Open your existing data file in a text editor.
2. Open `federal-gtm-seed.json` in a text editor.
3. Copy the `items` array from the seed into your file's `items` array.
4. Save, then re-open in the app.

(A "Merge seed" button is a good Phase 2a candidate — added to BACKLOG.)

## Regenerating

The seed is generated from the GTM strategy doc. If the doc changes, regenerate with the script in `git log` for context — or ask Claude to re-read the updated doc and produce a new seed.

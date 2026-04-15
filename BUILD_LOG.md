# Corticle Action Item Tracker — Build Log

**Date:** 2026-04-14  
**Builder:** Claude Opus 4.6 (1M context)  
**Source plan:** `~/corticle-tracker-build.md`  
**Repo:** https://github.com/cisojesse/corticle-tracker  
**Target:** `ops.digitalcyberforge.com`

---

## Environment

| Tool     | Version       |
|----------|---------------|
| Node.js  | v25.8.1       |
| npm      | 11.11.0       |
| git      | 2.50.1        |
| gh CLI   | 2.86.0        |
| GitHub   | cisojesse (github.com) |

---

## Build Execution Summary

### Phase 0 — Environment Checks
- **Status:** PASS
- All tools above minimum versions. GitHub CLI authenticated to both `github.com` and `corticle.ghe.com`.

### Phase 1 — GitHub Repository Setup
- **Status:** PASS
- Created `~/corticle-tracker/`, initialized git, created public repo `cisojesse/corticle-tracker`.
- Remote confirmed: `https://github.com/cisojesse/corticle-tracker.git`

### Phase 2 — Project Scaffold
- **Status:** PASS (with fixes)
- Scaffolded with `create-vite@9.0.4` using `react-ts` template.
- **Issue encountered:** Tailwind CSS v4 was installed by default. The build plan uses v3-style configuration (`tailwind.config.js`, `@tailwind` directives). Downgraded to `tailwindcss@3.4.19`.
- **Issue encountered:** `@radix-ui/react-badge` does not exist on npm. Skipped — badge styling handled via plain Tailwind spans instead.
- All other deps installed successfully (34 packages).

### Phase 3 — Configuration Files
- **Status:** PASS
- **tailwind.config.js** — Corticle brand colors, shadcn/ui CSS variable theme, dark mode class support.
- **vite.config.ts** — Path alias `@/` → `./src`, manual chunk splitting (vendor/ui).
- **tsconfig.app.json** — Updated with `@/*` path aliases, strict mode, ES2020 target.
- **.env.local** — Placeholder values for Entra ID, Twilio.
- **.gitignore** — Covers node_modules, dist, env files, editor dirs.

### Phase 4 — Directory Structure
- **Status:** PASS
- Created: `src/{auth, components/{ui,layout,items,dashboard,notifications}, hooks, types, utils, views, assets}`

### Phase 5 — Type Definitions
- **Status:** PASS
- `src/types/index.ts` — ActionItem (with calendar fields from Phase 10.5), AppUser, AppData, AuthSession, FilterState, SmsReminder, all category/priority/status color maps, DURATION_OPTIONS.

### Phase 6 — Utilities
- **Status:** PASS
- `cn.ts` — clsx + tailwind-merge wrapper
- `sanitize.ts` — XSS prevention (HTML strip, JS protocol strip, event handler strip, length cap)
- `validation.ts` — Full ActionItem field validation with typed error map
- `dateHelpers.ts` — formatDueDate, isOverdue, isDueSoon, toISODate, nowISO

### Phase 7 — Auth Layer
- **Status:** PASS
- `users.config.ts` — 3 users (Jesse, Alex, Mac) with bcrypt hashes, TEAM_DISPLAY_NAMES export
- `AuthContext.tsx` — React context with bcrypt login, 8-hour session timeout, sessionStorage persistence, constant-time response on invalid username
- `ProtectedRoute.tsx` — Redirect wrapper to `/login`
- `LoginPage.tsx` — Corticle-branded login UI with error handling, input sanitization

### Phase 8 — Storage Hook
- **Status:** PASS
- `useStorage.ts` — File System Access API (`showOpenFilePicker` / `showSaveFilePicker`), debounced auto-save (1.5s), CRUD operations for ActionItem, sync status tracking.

### Phase 9 — Notifications Hook
- **Status:** PASS
- `useNotifications.ts` — Browser Notification API, permission request, 30-min polling for overdue/due-soon items, SMS stub for future Twilio integration.

### Phase 10 — Core App Files
- **Status:** PASS
- `main.tsx` — React root with StrictMode, BrowserRouter, AuthProvider.
- `index.css` — Tailwind base/components/utilities, CSS custom properties for shadcn theming.
- `App.tsx` — Route tree with protected routes, storage + notification initialization.

### Phase 10.5 — Calendar Integration
- **Status:** PASS
- `calendarHelpers.ts` — RFC 5545 ICS generation with line folding, Google Calendar URL builder, Outlook Graph API stub.
- `CalendarInviteModal.tsx` — Calendar type picker (Outlook/Google), duration picker, download trigger.

### Phase 11 — Remaining Components
- **Status:** PASS
- **AppShell.tsx** — Responsive sidebar (mobile overlay), category nav, sync status indicator, file open/create buttons, user info + logout.
- **ErrorBoundary.tsx** — Class component error boundary with reload button.
- **ActionItemModal.tsx** — Full create/edit form with validation, all fields including calendar duration picker.
- **ActionItemTable.tsx** — Sortable (4 fields), filterable (5 filters + search), calendar badge indicators, inline delete confirmation.
- **DashboardStats.tsx** — 4 stat cards (total, overdue, due soon, completed) with icons.
- **Dashboard.tsx** — Stats + overdue panel + due soon panel + recent items list + empty state.
- **AllItems.tsx** — Full table view with create button.
- **CategoryView.tsx** — Category-filtered table with param validation.

### Phase 12 — Deployment Config
- **Status:** PASS
- `.github/workflows/deploy.yml` — Node 20, npm ci, vite build, upload-pages-artifact → deploy-pages.
- `public/CNAME` — `ops.digitalcyberforge.com`

### Phase 14 — Build & Commit
- **Status:** PASS (with fixes)
- **Issue encountered:** TypeScript 6.0 deprecated `baseUrl` in tsconfig. Removed it (only `paths` is needed since the module resolution is bundler mode).
- **Issue encountered:** Vite 8 / Rollup 4 changed `manualChunks` type — object syntax no longer valid. Converted to function syntax.
- Final build output:
  - `vendor-BrUFHpps.js` — 224 KB (71 KB gzipped) — React ecosystem
  - `index-BWGH2hBg.js` — 64 KB (20 KB gzipped) — App code
  - `ui-CnceqNgR.js` — 35 KB (12 KB gzipped) — Lucide + date-fns
  - `index-Fuq_6m0y.css` — 17 KB (4 KB gzipped) — Tailwind CSS
- Commit: `472b917` — 40 files, 7,712 insertions

---

## Issues & Deviations from Build Plan

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | Tailwind CSS v4 installed by default (v3 required) | Explicitly installed `tailwindcss@3.4.19` |
| 2 | `@radix-ui/react-badge` does not exist on npm | Skipped — badges rendered via Tailwind utility classes |
| 3 | TypeScript 6.0 deprecates `baseUrl` | Removed `baseUrl`, kept `paths` only (works with bundler moduleResolution) |
| 4 | Vite 8 / Rollup 4 `manualChunks` object syntax invalid | Converted to function syntax |
| 5 | Vite 8 scaffold uses `tsconfig.app.json` instead of `tsconfig.json` for src | Updated `tsconfig.app.json` with all config (aligned with scaffold pattern) |

---

## What Was NOT Done (Requires User Action)

| Item | Why | Next Step |
|------|-----|-----------|
| `git push` | Awaiting user confirmation | Run `git push -u origin main` |
| GitHub Pages activation | Requires repo settings or first push | Settings → Pages → Source: GitHub Actions |
| DNS CNAME record | Domain registrar access required | Add CNAME `ops` → `cisojesse.github.io` at registrar |
| Password changes | Security — should be done manually | Generate bcrypt hashes, update `users.config.ts` |
| Phase 13 DNS config | External | See build plan Phase 13 |
| Phase 15 post-deploy checks | Requires live site | See build plan Phase 15 checklist |

---

## File Inventory (40 files)

```
corticle-tracker/
├── .github/workflows/deploy.yml
├── .gitignore
├── .env.local (gitignored)
├── README.md
├── BUILD_LOG.md
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
│   ├── CNAME
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── auth/
    │   ├── AuthContext.tsx
    │   ├── LoginPage.tsx
    │   ├── ProtectedRoute.tsx
    │   └── users.config.ts
    ├── components/
    │   ├── dashboard/
    │   │   └── DashboardStats.tsx
    │   ├── items/
    │   │   ├── ActionItemModal.tsx
    │   │   ├── ActionItemTable.tsx
    │   │   └── CalendarInviteModal.tsx
    │   └── layout/
    │       ├── AppShell.tsx
    │       └── ErrorBoundary.tsx
    ├── hooks/
    │   ├── useNotifications.ts
    │   └── useStorage.ts
    ├── types/
    │   └── index.ts
    ├── utils/
    │   ├── calendarHelpers.ts
    │   ├── cn.ts
    │   ├── dateHelpers.ts
    │   ├── sanitize.ts
    │   └── validation.ts
    └── views/
        ├── AllItems.tsx
        ├── CategoryView.tsx
        └── Dashboard.tsx
```

---

## Stack Summary

- **React 19.2.5** + **Vite 8.0.8** + **TypeScript 6.0.2**
- **Tailwind CSS 3.4.19** with shadcn/ui CSS variable theming
- **Radix UI** primitives (dialog, select, label, dropdown-menu, tooltip, alert-dialog, popover, separator)
- **bcryptjs 3.0.3** — client-side password hashing
- **date-fns 4.1.0** — date utilities
- **lucide-react 1.8.0** — icons
- **uuid 13.0.0** — action item IDs
- **react-router-dom 7.14.1** — SPA routing

---

*Build completed 2026-04-14 by Claude Opus 4.6 (1M context)*

# Corticle Tracker — Backlog

## UI / Branding
- [ ] Replace placeholder "C" logo with actual Corticle logo
- [ ] Migrate color scheme from current Corticle brand palette to [Nord Theme](https://www.nordtheme.com/) (Polar Night, Snow Storm, Frost, Aurora)

## Admin
- [x] Admin console — create, modify, delete users (shipped 2026-04-15)

## Federal GTM alignment (from Corticle_Federal_GTM_Strategy V5)
Phase 2a additions specifically needed to operationalize the federal GTM playbook. These extend the generic CRM model proposed in `docs/WORKFLOW_RESEARCH.md`.

- [ ] Deal entity with federal-specific fields: `dealType` (SBIR / OTA / Direct / GSA / Other), `contractVehicle`, `dealSize`, `probability %`, `stage` (Lead / Pilot / Proposal / Close)
- [ ] Agency hierarchy on Company: top-level agency → sub-org (e.g. DoD → ARCYBER → Cyber Protection Brigade)
- [ ] Pipeline view with Lead → Pilot → Proposal → Close stages (Kanban)
- [ ] Account playbook template (Entry / Hook / Pilot / Expansion) — linkable per Company
- [ ] Carahsoft partner attribution — flag deals as "channel-sourced" with reseller attribution
- [ ] Weekly cadence view: Monday pipeline review dashboard, automated "2+ deal progressions this month" KPI counter
- [ ] Seed data import: UI to merge `seeds/federal-gtm-seed.json` into existing data file (currently manual)

## Research
- [x] Research doc shipped: `docs/WORKFLOW_RESEARCH.md` (2026-04-15)
- [ ] Decision needed: prioritize Phase 2a items from research doc

## Future (Phase 2 Roadmap)
- [ ] Microsoft Entra ID SSO
- [ ] Outlook Calendar API (replace .ics with Graph API)
- [ ] Google Calendar API (replace URL builder with direct API)
- [ ] Twilio SMS reminders
- [ ] Audit log
- [ ] Email digests
- [ ] Mobile PWA

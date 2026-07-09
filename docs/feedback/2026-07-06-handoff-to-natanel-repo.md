# Handoff — moving work to the shared repo (2026-07-06)

Purpose: a single summary to carry into a **new session opened directly on
`2069936/CAM-CRM-Vincere`** so we continue without repeating the back-and-forth.
Everything below was developed against the demo repo
(`pedro-cmyks/cam-crm-vincere-demo`) as a spec + reference; the real codebase is
now Natanel's, and that is the single source of truth from here on.

> **Tip:** paste the "Quick context for the new session" block below as the first
> message in the new chat, then attach or link this file.

---

## Quick context for the new session (paste this)

> We're now working in the shared repo `2069936/CAM-CRM-Vincere` (owner: Natanel),
> on branch **`dev/natanel`**. Rules from the repo owner: work only on
> `dev/natanel`, never push to `main`, `git pull origin dev/natanel` before
> starting, and after pushing let Natanel review before he merges to main.
> First task: review the actual codebase (it's a Supabase-backed build, different
> from the earlier localStorage demo), then compare against the backlog in this
> handoff and continue. Don't assume the demo repo's code — read the real files.

Working flow (from Natanel):
```
git clone https://github.com/2069936/CAM-CRM-Vincere.git
cd CAM-CRM-Vincere
git fetch origin
git checkout dev/natanel
git pull origin dev/natanel          # before working
# ...changes...
git add .
git commit -m "Describe your changes"
git push origin dev/natanel          # then tell Natanel to review
```

---

## Project in one paragraph

Vincere CRM: a web CRM for managing prop-firm trading clients. CAMs (Client
Account Managers) each manage a roster of clients running NinjaTrader algos on
VPSs; a Manager oversees the whole team. Daily NinjaTrader CSV exports are
ingested to track PnL, drawdown, payouts, and flags. The app has a Manager
Operations view and per-CAM workspaces. Login/users/SOP/DB are wired to Supabase
in Natanel's build.

Source docs in the demo repo (`docs/feedback/`):
- `2026-07-02-manager-review.md` — full feedback + intake-sheet field mapping.
- `2026-07-02-ninjatrader-data-research.md` — NT8 data storage & export research.
- `2026-07-02-patch-notes-for-natanel.md` — Round 1 hand-off (implemented by Natanel).
- `2026-07-06-patch-notes-for-natanel.md` — Round 2 hand-off (below).

---

## The Users / CAM model we converged on (important)

Three distinct concepts — keep them separate:

- **role** (`Manager` | `CAM`) = **permissions**.
- **CAM profile** = whether the person is an **active, client-carrying CAM shown
  in the sidebar**. Implemented as a **Yes/No toggle** per user. ON creates +
  links a `cam_profile` (can hold clients); OFF removes it. Managers have none.
- **status** (`Active` | `Inactive`) = employed vs deactivated. Inactive =
  **hidden from sidebar/roster but still listed**, dimmed and badged.

Rules:
- **Delete a user** → remove **everywhere** (user + `cam_profile` + clean up
  `client_assignments`).
- **Delete/deactivate a CAM** → their clients become **Unassigned**; the Manager
  sees a **red banner** with the count + names and reassigns from the Client
  roster.
- Clients attach to a `cam_profile` via `client_assignments` (per the ERD). The
  new-intake clients (future Google Sheet) land as Unassigned for the Manager to
  assign.

---

## Data-model additions introduced (mirror in Supabase if not already there)

- `client.profile.productKey` — NinjaTrader product key (required for algos).
- `client.profile.additionalEmails: string[]` — multiple emails without clutter.
- `client.profile.timezone` — from a fixed dropdown list.
- `client.profile.country` — typeahead (free text + suggestions).
- `client.credentials.ntLogin` = **NinjaTrader username**; `credentials.ntPassword`
  = **NinjaTrader password** (the old "Prop firm login/password" here were wrong).
- `client.propFirms: Array<{ id, name, connection, login, password }>` — multiple
  prop firms per client; `connection` is a **Tradovate | Rithmic** toggle.
- `users[].status` (`Active` | `Inactive`); CAM-profile link toggled per user.

---

## Reference changes already built (verify vs Natanel's code, port what's missing)

1. Client "Credentials & Notes" form: time-zone dropdown, Discord-only (Telegram
   dropped), country typeahead, Product Key, multiple emails, NT username +
   password, multiple prop firms (Tradovate/Rithmic).
2. Daily SOP replaced with the real CAM checklist (payout 54k / passed-eval 53k
   thresholds; OGX low-risk within $300–$500 of payout).
3. UI: emoji swapped for lucide vector icons (password toggle, contact chips,
   mail/phone, SOP) — kept emoji only in client-facing WhatsApp/report templates.
4. Users & Access: CAM profile Yes/No toggle, Active/Inactive status, delete
   cascades to the cam_profile.
5. Unassigned-clients Manager banner.

---

## Bugs reported for the deployed build

- **[Fixed by Natanel]** CAM edits to a client weren't visible to the Manager —
  needed a single shared client record across roles.
- **[To validate]** An **unassigned client (no CAM) throws a database error**.
  Unassigned must be a valid state: `cam_profile_id` nullable / null-safe joins
  (LEFT JOIN), not an FK failure.

---

## Backlog / next up

Near-term (from the reviews, if not yet in Natanel's build):
- Verify the Users/CAM toggle + status + delete-everywhere + unassigned banner
  exist in the real codebase; port if missing.
- Validate the unassigned-client DB error above.

Bigger items (need design):
- **Intake Google Sheet → auto-populate unassigned clients** (new clients only;
  existing clients migrate manually). Column→field mapping in the manager-review
  doc. Leave an integration point/route ready.
- **CAM permissions:** manager-granted, per-CAM create/delete-client access
  (Senior CAM yes; Normal/Training no), audited; temporarily open during the
  migration backlog.
- **Manager portal — client lifecycle + per-CAM performance metrics** (the data
  focus from the new lead): lifecycle funnel (intake → onboarding → evaluation →
  funded → payout → churn), per-CAM scorecard (days-to-funded, days-to-payout,
  pass rate, avg PnL), "clients needing attention." `start date` is the anchor.
- **UI polish** (Natanel's suggestion): fix spacing/padding/tab placement and the
  AI-generated-looking copy/icons. Keep the dark, data-dense identity — baseline
  is `DESIGN.md` in the repo.

R&D — "export the information differently":
- NinjaTrader: recent NT8 stores its DB as **SQLite** (`db\NinjaTrader.sqlite`),
  readable directly from Python → pull accounts/executions per client VPS and
  compare the same algo across clients (the "lab"). Historical `.ncd` price data
  is proprietary/hard; backtests via a NinjaScript that writes CSV. Full detail in
  `2026-07-02-ninjatrader-data-research.md`. Worth scoping as its own track.

---

## Workflow going forward

- Single source of truth = `2069936/CAM-CRM-Vincere`. Work on `dev/natanel`,
  never `main`. Pull before, push after, tell Natanel to review/merge.
- The demo repo (`pedro-cmyks/cam-crm-vincere-demo`) + PR #1 stay as history and
  reference only.
- Keep the design identity aligned with `DESIGN.md`.

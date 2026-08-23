# Lien Ledger — Design Spec

## Problem

Every personal injury case carries medical liens — hospitals, chiropractors, MRI centers, Medi-Cal — and right now each paralegal tracks them in a private Excel sheet. Liens go stale or never get logged at all, and negotiating reductions happens over scattered phone calls and email with nothing centralized. About 1 in 5 settlements surfaces a lien surprise at disbursement. In the most recent case, an $4,200 chiropractic lien appeared after an $85,000 settlement was ready to disburse — the clinic had sold the account to a lien-buying company and the notice sat unread in an email folder. Client payout was delayed three weeks and the firm ate part of the reduction to keep the client happy. At 8–12 settlements a month, that's roughly two bad settlements a month.

## Current workaround

Paralegals keep a separate Excel sheet per case, one per paralegal, with no shared view. The firm runs Clio for case management, but Clio only offers a static custom field where you type a single lien amount per case. There is no per-provider ledger, no negotiation history, no status distinction between asserted, verified, reduced, and paid, and no alert when a case reaches settlement with unverified liens. Because Clio gives one flat number, the paralegals fell back to Excel. Switching case management software entirely is off the table — too disruptive.

## Users

- 4 paralegals — the daily users. They enter lien rows, chase providers, and run the settlement checklist before disbursement.
- 2 attorneys — read and review, especially around settlement.
- Working against roughly 120 open cases, with 8–12 settling per month. Small enough that adoption is a single team meeting.
- No client access. No vendor access.

## Core features

1. Per-case list of lien rows. Each row has provider, amount, status, and one free-text notes field.
2. Manual entry of lien rows by paralegals. No auto-population in v1.
3. Status field per lien with six values: asserted, verified, negotiating, reduced, paid, waived.
4. Free-text notes field per lien to capture negotiation activity.
5. Per-case settlement gate screen: lists every lien row not yet verified or waived, so the paralegal must clear each one before disbursement.
6. Logins for the 6 firm staff only.

## Screens

- **Case list** — all open cases the user works, as an entry point.
- **Case lien ledger** — the rows for one case: provider, amount, status, notes; add and edit rows here.
- **Lien detail / edit** — a single lien row's fields, including the free-text notes.
- **Settlement gate** — for one case, every lien not yet verified or waived, to be cleared before disbursement.
- **Login** — access for the 6 authorized staff.

## Out of scope

- Auto-seeding lien rows from the treatment or records list (deferred to v2 — this was identified as the real fix for unlogged liens, but not in v1).
- Structured negotiation history (v1 uses one free-text notes field instead).
- Any Clio integration. Paralegals keep working in Clio and use this alongside it.
- Client access to the app.
- Vendor or outside-party access.

## Success criteria

- Settlements that surface an unlogged or stale lien drop below the current ~1 in 5 rate.
- No repeat of a multi-week client payout delay caused by a late-discovered lien.
- The firm stops absorbing reduction costs to cover its own tracking misses.
- Paralegals stop keeping per-case Excel sheets and work from the shared ledger instead.
- The settlement gate is actually run before disbursement on every settling case.

## Open questions

- Where exactly does it get hosted — the firm's own server, or a HIPAA-eligible cloud account under a BAA? Both were named as acceptable; the choice wasn't made.
- How are cases created in the app, given there is no Clio integration? Manual case creation was implied but never specified.
- Does the settlement gate hard-block disbursement, or just display the unresolved rows for the paralegal to work through?
- What counts as "clearing" a row at the gate — moving it to verified/waived, or an explicit acknowledgement?
- Do the 2 attorneys have the same permissions as paralegals, or read-only?
- How is the purge at 5 years post-closing actually triggered and performed?
- No decision on reporting or cross-case views (e.g., all unresolved liens across all cases).

## Legal & privacy notes

- **What personal data:** Medical treatment data (provider, lien amounts) — this is PHI — plus client settlement and financial data.
- **Whose:** The firm's personal injury clients. They are not users of the app.
- **Where it lives:** Inside the firm. Either the firm's own server or a HIPAA-eligible cloud account under a BAA, matching how the firm already handles document storage.
- **Who can see it:** Logins limited to 4 paralegals and 2 attorneys. No client access. No vendor access.
- **How long it's kept:** Retention follows the case file — 5 years after case closing per the firm's California file retention policy, then purged along with the file.
- **Open:** The purge mechanism and the final hosting choice are not yet settled (see Open questions).

## Decisions after spec (2026-08-22)

- Settlement gate is a checklist only — it never hard-blocks disbursement.
- A lien row clears the gate by status alone; unresolved statuses are asserted and negotiating (verified, reduced, paid, waived are resolved).
- All 6 users have identical permissions; no roles in v1.
- Stack: Next.js (App Router) + TypeScript + Tailwind + better-sqlite3 + better-auth (email/password) + Vitest. Self-hosted later; dev runs locally.
- Hosting and 5-year purge mechanism remain deferred (deployment concerns, not v1 code).

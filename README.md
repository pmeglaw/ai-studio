# Lien Ledger

Shared per-case medical-lien tracking with a settlement-gate checklist,
for a California PI firm. Replaces per-paralegal Excel sheets.

Spec: `docs/superpowers/specs/2026-08-22-lien-ledger-design.md`
Plan: `docs/superpowers/plans/2026-08-22-lien-ledger-v1.md`

## Run

1. `npm install`
2. `.env.local` needs `BETTER_AUTH_SECRET` (openssl rand -hex 32) and
   `BETTER_AUTH_URL=http://localhost:3100`
3. One-time: `npx --yes auth@latest migrate --yes`, then seed staff logins:
   `ALLOW_SIGNUP=1 SEED_PASSWORD='<temp pw>' npx tsx scripts/seed-users.ts`
4. `npm run dev` → http://localhost:3100

## Statuses

`asserted → verified → negotiating → reduced → paid` (or `waived`).
The settlement gate lists liens still `asserted` or `negotiating` —
those are the ones with unknown validity or amount at disbursement.
The gate is a checklist; it never blocks anything.

## Data

Two SQLite files under `data/` (gitignored): `ledger.db` (cases, liens),
`auth.db` (users, sessions). PHI stays on this machine — no external
services. Retention: case data purged 5 years after case close, with the
file (manual for now; see spec Open questions).

## Tests

`npm test` — money parsing and query/gate logic.

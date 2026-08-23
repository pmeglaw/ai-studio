# Lien Ledger v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shared per-case medical-lien ledger with a settlement-gate checklist for a 6-person PI firm, replacing per-paralegal Excel sheets.

**Architecture:** Next.js App Router serves both UI and API routes; all data in two local SQLite files (`data/ledger.db` for domain, `data/auth.db` for better-auth). Server components read the DB directly; mutations go through API routes guarded by a session check. No external services — PHI stays on the machine.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind 4, better-sqlite3 (plain SQL), better-auth (email/password, signup disabled), Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-22-lien-ledger-design.md`

## Global Constraints

- Lien `status` values, exactly six: `asserted`, `verified`, `negotiating`, `reduced`, `paid`, `waived`.
- Unresolved (gate-blocking) statuses: `asserted`, `negotiating`. All others are resolved.
- Money stored as integer cents (`amount_cents`), never floats.
- Settlement gate is a checklist — it never blocks any action.
- No roles: every authenticated user can do everything. No client/vendor access; public signup disabled.
- No external network services at runtime. No Clio integration, no auto-seeding (v2).
- Dev server on port **3100** (`next dev -p 3100`) — the studio owns 3000.
- Every commit ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Scaffold and visual foundation

**Files:**
- Create: entire Next.js scaffold at repo root (`create-next-app`)
- Modify: `app/globals.css`, `app/layout.tsx`, `package.json` (scripts), `.gitignore`

**Interfaces:**
- Produces: design tokens (`ground`, `surface`, `ink`, `muted`, `line`, `navy`, `oxblood`, `resolved`) and fonts (`font-sans` = Source Sans 3, `font-mono` = IBM Plex Mono) used by every later UI task.

- [ ] **Step 1: Scaffold into the existing repo**

```bash
cd ~/lien-ledger
npx --yes create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes
npm install better-sqlite3 better-auth
npm install -D @types/better-sqlite3 vitest @tailwindcss/typography
```

(`create-next-app` tolerates the existing `docs/` and `.git`; if it refuses, scaffold in a temp dir and `rsync -a` the result in, excluding `.git`.)

- [ ] **Step 2: Set scripts and env**

In `package.json` set:

```json
"scripts": {
  "dev": "next dev -p 3100",
  "build": "next build",
  "start": "next start -p 3100",
  "lint": "eslint",
  "test": "vitest run"
}
```

Create `.env.local` (already gitignored by `.env*`):

```
BETTER_AUTH_SECRET=REPLACE_WITH_openssl_rand_hex_32
BETTER_AUTH_URL=http://localhost:3100
```

Generate the secret: `openssl rand -hex 32`. Append to `.gitignore`:

```
# local databases
/data/
```

- [ ] **Step 3: Replace `app/globals.css`**

Design identity — "counsel ledger": paper ground, navy ink actions, oxblood reserved for unresolved liens, tabular numerals everywhere money appears.

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --color-ground: #f4f3ef;
  --color-surface: #fcfbf8;
  --color-ink: #22252a;
  --color-muted: #6d7178;
  --color-line: #dcdad2;
  --color-navy: #27415e;
  --color-navy-deep: #1c3049;
  --color-oxblood: #7c2d2d;
  --color-resolved: #3d6b4f;

  --font-sans: var(--font-source-sans), system-ui, sans-serif;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;
}

body {
  background: var(--color-ground);
  color: var(--color-ink);
}
```

- [ ] **Step 4: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Lien Ledger",
  description: "Per-case medical lien tracking and settlement gate.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSans.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between px-6 py-4">
            <a
              href="/"
              className="font-mono text-sm font-medium tracking-[0.2em] uppercase"
            >
              Lien Ledger
            </a>
            <span className="font-mono text-xs text-muted">
              nothing missed at settlement
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run build
git add -A && git commit -m "chore: scaffold Next.js app, deps, counsel-ledger design tokens"
```

Expected: build succeeds listing route `/`.

---

### Task 2: Money utils, DB layer, and queries (TDD)

**Files:**
- Create: `lib/money.ts`, `lib/types.ts`, `lib/db.ts`, `lib/queries.ts`, `vitest.config.ts`
- Test: `lib/money.test.ts`, `lib/queries.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - `parseDollarsToCents(input: string): number | null` — `"4,200"` → `420000`; `"4200.50"` → `420050`; invalid/negative → `null`
  - `formatCents(cents: number): string` — `420000` → `"$4,200.00"`
  - `LIEN_STATUSES` (readonly array of the six statuses), `UNRESOLVED_STATUSES` (`["asserted","negotiating"]`), types `LienStatus`, `Case`, `Lien`
  - `createCase(title: string): Case`
  - `listOpenCases(): (Case & { lien_count: number; unresolved_count: number })[]`
  - `getCase(id: number): Case | undefined`
  - `closeCase(id: number): void`
  - `addLien(caseId: number, provider: string, amountCents: number): Lien`
  - `getLien(id: number): Lien | undefined`
  - `updateLien(id: number, fields: { provider?: string; amount_cents?: number; status?: LienStatus; notes?: string }): Lien`
  - `liensForCase(caseId: number): Lien[]`
  - `unresolvedLiens(caseId: number): Lien[]`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
```

- [ ] **Step 2: Write failing money tests — `lib/money.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { formatCents, parseDollarsToCents } from "@/lib/money";

describe("parseDollarsToCents", () => {
  it("parses plain dollars", () => expect(parseDollarsToCents("4200")).toBe(420000));
  it("parses commas and $", () => expect(parseDollarsToCents("$4,200.50")).toBe(420050));
  it("rejects garbage", () => expect(parseDollarsToCents("abc")).toBeNull());
  it("rejects negatives", () => expect(parseDollarsToCents("-5")).toBeNull());
  it("rejects three decimals", () => expect(parseDollarsToCents("1.234")).toBeNull());
});

describe("formatCents", () => {
  it("formats with grouping", () => expect(formatCents(420000)).toBe("$4,200.00"));
  it("formats zero", () => expect(formatCents(0)).toBe("$0.00"));
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/money`.

- [ ] **Step 4: Implement `lib/money.ts`**

```ts
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [dollars, decimals = ""] = cleaned.split(".");
  return Number(dollars) * 100 + Number(decimals.padEnd(2, "0") || 0);
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
```

- [ ] **Step 5: Run money tests — expect PASS, then commit**

```bash
npm test
git add -A && git commit -m "feat: money parsing and formatting in integer cents"
```

- [ ] **Step 6: Implement `lib/types.ts` and `lib/db.ts`** (schema first — queries tests need it)

`lib/types.ts` has NO imports — client components import statuses and types
from here; importing them from `lib/db` would pull `better-sqlite3` (a Node
native module) into the browser bundle and break the build.

```ts
// lib/types.ts
export const LIEN_STATUSES = [
  "asserted",
  "verified",
  "negotiating",
  "reduced",
  "paid",
  "waived",
] as const;
export type LienStatus = (typeof LIEN_STATUSES)[number];

// Gate-blocking: amount or validity still unknown at disbursement time.
export const UNRESOLVED_STATUSES: LienStatus[] = ["asserted", "negotiating"];

export type Case = {
  id: number;
  title: string;
  status: "open" | "closed";
  created_at: string;
};

export type Lien = {
  id: number;
  case_id: number;
  provider: string;
  amount_cents: number;
  status: LienStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};
```

```ts
// lib/db.ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export * from "@/lib/types"; // server code may import everything from here

const globalForDb = globalThis as unknown as { _ledgerDb?: Database.Database };

function open(): Database.Database {
  const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "ledger.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS liens (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id      INTEGER NOT NULL REFERENCES cases(id),
      provider     TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
      status       TEXT NOT NULL DEFAULT 'asserted'
                   CHECK (status IN ('asserted','verified','negotiating','reduced','paid','waived')),
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_liens_case ON liens(case_id);
  `);
  return db;
}

export const db = globalForDb._ledgerDb ?? (globalForDb._ledgerDb = open());
```

- [ ] **Step 7: Write failing queries tests — `lib/queries.test.ts`**

`DB_PATH` must be set before the import so the test uses a throwaway DB.

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ledger-")), "test.db");

import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  addLien, closeCase, createCase, getCase, getLien,
  liensForCase, listOpenCases, unresolvedLiens, updateLien,
} from "@/lib/queries";

beforeEach(() => {
  db.exec("DELETE FROM liens; DELETE FROM cases;");
});

describe("cases", () => {
  it("creates and lists open cases with counts", () => {
    const c = createCase("Gomez v. Rideshare Co");
    addLien(c.id, "Valley MRI", 120000);
    const rows = listOpenCases();
    expect(rows).toHaveLength(1);
    expect(rows[0].lien_count).toBe(1);
    expect(rows[0].unresolved_count).toBe(1); // new liens start 'asserted'
  });

  it("closed cases leave the list", () => {
    const c = createCase("Old Matter");
    closeCase(c.id);
    expect(listOpenCases()).toHaveLength(0);
    expect(getCase(c.id)?.status).toBe("closed");
  });
});

describe("liens", () => {
  it("updates fields and bumps updated_at", () => {
    const c = createCase("A");
    const lien = addLien(c.id, "Chiro Group", 420000);
    const updated = updateLien(lien.id, { status: "reduced", notes: "agreed $2,900" });
    expect(updated.status).toBe("reduced");
    expect(updated.notes).toBe("agreed $2,900");
    expect(getLien(lien.id)?.status).toBe("reduced");
  });

  it("gate lists only asserted and negotiating", () => {
    const c = createCase("B");
    const a = addLien(c.id, "Hospital", 900000);            // asserted
    const b = addLien(c.id, "Chiro", 420000);
    updateLien(b.id, { status: "negotiating" });
    const done = addLien(c.id, "MRI", 120000);
    updateLien(done.id, { status: "paid" });
    const open = unresolvedLiens(c.id).map((l) => l.id);
    expect(open.sort()).toEqual([a.id, b.id].sort());
    expect(liensForCase(c.id)).toHaveLength(3);
  });

  it("rejects an unknown status at the DB layer", () => {
    const c = createCase("C");
    const lien = addLien(c.id, "X", 100);
    expect(() =>
      updateLien(lien.id, { status: "settled" as never }),
    ).toThrow();
  });
});
```

- [ ] **Step 8: Run to verify failure**

Run: `npm test`
Expected: money tests PASS, queries tests FAIL — cannot resolve `@/lib/queries`.

- [ ] **Step 9: Implement `lib/queries.ts`**

```ts
import { db, type Case, type Lien, type LienStatus, UNRESOLVED_STATUSES } from "@/lib/db";

export { closeCase, createCase, getCase, listOpenCases };
export { addLien, getLien, liensForCase, unresolvedLiens, updateLien };

function createCase(title: string): Case {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO cases (title) VALUES (?)")
    .run(title);
  return getCase(Number(lastInsertRowid))!;
}

function getCase(id: number): Case | undefined {
  return db.prepare("SELECT * FROM cases WHERE id = ?").get(id) as Case | undefined;
}

function listOpenCases(): (Case & { lien_count: number; unresolved_count: number })[] {
  return db
    .prepare(
      `SELECT c.*,
              (SELECT COUNT(*) FROM liens l WHERE l.case_id = c.id) AS lien_count,
              (SELECT COUNT(*) FROM liens l WHERE l.case_id = c.id
                 AND l.status IN ('asserted','negotiating')) AS unresolved_count
         FROM cases c WHERE c.status = 'open' ORDER BY c.created_at DESC`,
    )
    .all() as (Case & { lien_count: number; unresolved_count: number })[];
}

function closeCase(id: number): void {
  db.prepare("UPDATE cases SET status = 'closed' WHERE id = ?").run(id);
}

function addLien(caseId: number, provider: string, amountCents: number): Lien {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO liens (case_id, provider, amount_cents) VALUES (?, ?, ?)")
    .run(caseId, provider, amountCents);
  return getLien(Number(lastInsertRowid))!;
}

function getLien(id: number): Lien | undefined {
  return db.prepare("SELECT * FROM liens WHERE id = ?").get(id) as Lien | undefined;
}

function updateLien(
  id: number,
  fields: { provider?: string; amount_cents?: number; status?: LienStatus; notes?: string },
): Lien {
  const current = getLien(id);
  if (!current) throw new Error(`Lien ${id} not found`);
  const next = { ...current, ...fields };
  db.prepare(
    `UPDATE liens SET provider = ?, amount_cents = ?, status = ?, notes = ?,
        updated_at = datetime('now') WHERE id = ?`,
  ).run(next.provider, next.amount_cents, next.status, next.notes, id);
  return getLien(id)!;
}

function liensForCase(caseId: number): Lien[] {
  return db
    .prepare("SELECT * FROM liens WHERE case_id = ? ORDER BY created_at")
    .all(caseId) as Lien[];
}

function unresolvedLiens(caseId: number): Lien[] {
  const placeholders = UNRESOLVED_STATUSES.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT * FROM liens WHERE case_id = ? AND status IN (${placeholders}) ORDER BY created_at`,
    )
    .all(caseId, ...UNRESOLVED_STATUSES) as Lien[];
}
```

- [ ] **Step 10: Run all tests — expect PASS, then commit**

```bash
npm test && npx tsc --noEmit
git add -A && git commit -m "feat: ledger schema and query layer with gate logic"
```

---

### Task 3: Authentication (better-auth, seeded users, route guard)

**Files:**
- Create: `lib/auth.ts`, `lib/auth-client.ts`, `lib/guard.ts`, `app/api/auth/[...all]/route.ts`, `app/login/page.tsx`, `scripts/seed-users.ts`

**Interfaces:**
- Consumes: design tokens from Task 1.
- Produces:
  - `requireSession(): Promise<Session>` (server) — redirects to `/login` when unauthenticated; every later page calls this first.
  - `requireSessionApi(req: Request): Promise<Session | null>` — API-route variant; caller returns 401 on `null`.
  - `authClient.signIn.email({ email, password })` / `authClient.signOut()` (client).

- [ ] **Step 1: Check current better-auth API**

WebFetch `https://www.better-auth.com/docs/installation` and `https://www.better-auth.com/docs/authentication/email-password`. The code below reflects the API as of early 2026 — if the docs differ (option names, handler import path, CLI invocation), follow the docs and keep the plan's structure.

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });

export const auth = betterAuth({
  database: new Database(path.join(dir, "auth.db")),
  emailAndPassword: {
    enabled: true,
    // Public signup stays off; the seed script flips this via env.
    disableSignUp: process.env.ALLOW_SIGNUP !== "1",
  },
});
```

- [ ] **Step 3: Create handler `app/api/auth/[...all]/route.ts`**

```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: Generate auth tables**

```bash
npx --yes @better-auth/cli@latest migrate --yes
```

Expected: creates `user`, `session`, `account`, `verification` tables in `data/auth.db`. Verify: `sqlite3 data/auth.db '.tables'`.

- [ ] **Step 5: Create `scripts/seed-users.ts`**

```ts
import { auth } from "@/lib/auth";

// Usage: ALLOW_SIGNUP=1 npx tsx scripts/seed-users.ts
// Edit this list to the firm's real 6 staff before running.
const USERS = [
  { name: "Patrick", email: "patrick@megeredchianlaw.com" },
  // ...5 more
];

const password = process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_PASSWORD (users change it after first login).");

for (const u of USERS) {
  await auth.api.signUpEmail({ body: { ...u, password } });
  console.log("created", u.email);
}
```

Add dev dep: `npm install -D tsx`. Run once:

```bash
ALLOW_SIGNUP=1 SEED_PASSWORD='<one-time password>' npx tsx scripts/seed-users.ts
```

- [ ] **Step 6: Create `lib/auth-client.ts` and `lib/guard.ts`**

```ts
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();
```

```ts
// lib/guard.ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

export async function requireSessionApi(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}
```

- [ ] **Step 7: Create `app/login/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setError("Sign-in failed. Check the email and password.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-md border border-line bg-surface p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
        </label>
        {error && <p className="text-sm text-oxblood">{error}</p>}
        <button type="submit" disabled={busy}
          className="mt-1 rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Verify auth end-to-end**

```bash
npx tsc --noEmit && npm run dev &   # then:
curl -s -X POST http://localhost:3100/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"patrick@megeredchianlaw.com","password":"<seed password>"}' -i | head -5
```

Expected: `200` with a `set-auth-token`/session cookie header. A wrong password returns `401`. Also confirm signup is closed:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3100/api/auth/sign-up/email \
  -H 'Content-Type: application/json' -d '{"name":"X","email":"x@x.com","password":"pw12345678"}'
```

Expected: 4xx (signup disabled).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: better-auth email/password, seeded staff logins, session guards"
```

---

### Task 4: Case list and case creation

**Files:**
- Create: `app/api/cases/route.ts`, `components/new-case-form.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `requireSession`, `requireSessionApi`, `listOpenCases`, `createCase`, tokens.
- Produces: `GET/POST /api/cases`; home page linking to `/case/[id]` (Task 5 provides that page).

- [ ] **Step 1: Create `app/api/cases/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/guard";
import { createCase, listOpenCases } from "@/lib/queries";

export async function GET(req: Request) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json(listOpenCases());
}

export async function POST(req: Request) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title)
    return NextResponse.json({ error: "A case title is required." }, { status: 400 });
  return NextResponse.json(createCase(title), { status: 201 });
}
```

- [ ] **Step 2: Create `components/new-case-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewCaseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not create the case.");
      setBusy(false);
      return;
    }
    const c = await res.json();
    router.push(`/case/${c.id}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} required
        placeholder="Client v. Defendant"
        className="flex-1 rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
      <button type="submit" disabled={busy}
        className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
        {busy ? "Adding…" : "Add case"}
      </button>
      {error && <p className="text-sm text-oxblood">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { listOpenCases } from "@/lib/queries";
import { NewCaseForm } from "@/components/new-case-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireSession();
  const cases = listOpenCases();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Open cases</h1>
        <p className="mt-1 text-muted">
          Every case carries its liens. Red count = unresolved at the gate.
        </p>
      </section>

      <NewCaseForm />

      {cases.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-muted">
          No cases yet. Add the first one above.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/case/${c.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-ground/60">
                <span className="font-semibold">{c.title}</span>
                <span className="font-mono text-xs text-muted">
                  {c.lien_count} lien{c.lien_count === 1 ? "" : "s"}
                  {c.unresolved_count > 0 && (
                    <span className="ml-3 rounded bg-oxblood px-2 py-0.5 text-white">
                      {c.unresolved_count} unresolved
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/api/cases        # expect 401
# with a browser session: sign in at /login, add a case, see it listed
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: case list and creation behind auth"
```

---

### Task 5: Case lien ledger screen

**Files:**
- Create: `app/case/[id]/page.tsx`, `app/api/liens/route.ts`, `components/add-lien-form.tsx`, `components/status-badge.tsx`

**Interfaces:**
- Consumes: `getCase`, `liensForCase`, `addLien`, `parseDollarsToCents`, `formatCents`, `UNRESOLVED_STATUSES`, guards.
- Produces: `POST /api/liens` (`{ caseId, provider, amount }`, amount as dollar string); `StatusBadge` component reused by Tasks 6–7; ledger page linking to `/lien/[id]` and `/case/[id]/gate`.

- [ ] **Step 1: Create `components/status-badge.tsx`**

```tsx
import { UNRESOLVED_STATUSES, type LienStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: LienStatus }) {
  const unresolved = (UNRESOLVED_STATUSES as string[]).includes(status);
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-xs uppercase tracking-wider ${
        unresolved ? "bg-oxblood/10 text-oxblood" : "bg-resolved/10 text-resolved"
      }`}
    >
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Create `app/api/liens/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/guard";
import { parseDollarsToCents } from "@/lib/money";
import { addLien, getCase } from "@/lib/queries";

export async function POST(req: Request) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json();
  const caseRow = getCase(Number(body.caseId));
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const cents = typeof body.amount === "string" ? parseDollarsToCents(body.amount) : null;
  if (!caseRow || !provider || cents === null)
    return NextResponse.json(
      { error: "Provider and a valid dollar amount are required." },
      { status: 400 },
    );
  return NextResponse.json(addLien(caseRow.id, provider, cents), { status: 201 });
}
```

- [ ] **Step 3: Create `components/add-lien-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddLienForm({ caseId }: { caseId: number }) {
  const router = useRouter();
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/liens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, provider, amount }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not add the lien.");
      setBusy(false);
      return;
    }
    setProvider("");
    setAmount("");
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-1 min-w-48 flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Provider</span>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} required
          placeholder="Valley MRI Center"
          className="rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
      </label>
      <label className="flex w-40 flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Amount</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} required
          placeholder="$4,200.00" inputMode="decimal"
          className="rounded border border-line bg-white px-3 py-2 font-mono outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
      </label>
      <button type="submit" disabled={busy}
        className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
        {busy ? "Adding…" : "Add lien"}
      </button>
      {error && <p className="w-full text-sm text-oxblood">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 4: Create `app/case/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { formatCents } from "@/lib/money";
import { getCase, liensForCase, unresolvedLiens } from "@/lib/queries";
import { AddLienForm } from "@/components/add-lien-form";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const caseRow = getCase(Number(id));
  if (!caseRow) notFound();

  const liens = liensForCase(caseRow.id);
  const openCount = unresolvedLiens(caseRow.id).length;
  const totalCents = liens.reduce((sum, l) => sum + l.amount_cents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="font-mono text-xs text-muted hover:text-ink">← All cases</Link>
          <h1 className="text-2xl font-bold tracking-tight">{caseRow.title}</h1>
        </div>
        <Link href={`/case/${caseRow.id}/gate`}
          className={`rounded px-4 py-2 text-sm font-medium ${
            openCount > 0
              ? "bg-oxblood text-white hover:opacity-90"
              : "border border-line bg-surface hover:bg-ground"
          }`}>
          Settlement gate{openCount > 0 ? ` · ${openCount} open` : " · clear"}
        </Link>
      </div>

      <AddLienForm caseId={caseRow.id} />

      {liens.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-muted">
          No liens on this case yet. Add each provider above as notices come in.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {liens.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.provider}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCents(l.amount_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="max-w-64 truncate px-4 py-3 text-muted">{l.notes}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/lien/${l.id}`} className="text-navy underline-offset-2 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-mono text-xs text-muted">
                <td className="px-4 py-3">Total asserted</td>
                <td className="px-4 py-3 text-right">{formatCents(totalCents)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit && npm run build
```

In the browser: open a case, add two liens, see rows, total, and the red gate button.

```bash
git add -A && git commit -m "feat: per-case lien ledger with add form and totals"
```

---

### Task 6: Lien detail / edit

**Files:**
- Create: `app/lien/[id]/page.tsx`, `app/api/liens/[id]/route.ts`, `components/edit-lien-form.tsx`

**Interfaces:**
- Consumes: `getLien`, `updateLien`, `getCase`, `LIEN_STATUSES`, `parseDollarsToCents`, `formatCents`, guards, `StatusBadge`.
- Produces: `PATCH /api/liens/[id]` (`{ provider?, amount?, status?, notes? }`, amount as dollar string).

- [ ] **Step 1: Create `app/api/liens/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { LIEN_STATUSES, type LienStatus } from "@/lib/db";
import { requireSessionApi } from "@/lib/guard";
import { parseDollarsToCents } from "@/lib/money";
import { getLien, updateLien } from "@/lib/queries";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!getLien(Number(id)))
    return NextResponse.json({ error: "Lien not found." }, { status: 404 });

  const body = await req.json();
  const fields: Parameters<typeof updateLien>[1] = {};

  if (typeof body.provider === "string") {
    const provider = body.provider.trim();
    if (!provider) return NextResponse.json({ error: "Provider can't be empty." }, { status: 400 });
    fields.provider = provider;
  }
  if (typeof body.amount === "string") {
    const cents = parseDollarsToCents(body.amount);
    if (cents === null) return NextResponse.json({ error: "Invalid dollar amount." }, { status: 400 });
    fields.amount_cents = cents;
  }
  if (typeof body.status === "string") {
    if (!(LIEN_STATUSES as readonly string[]).includes(body.status))
      return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    fields.status = body.status as LienStatus;
  }
  if (typeof body.notes === "string") fields.notes = body.notes;

  return NextResponse.json(updateLien(Number(id), fields));
}
```

- [ ] **Step 2: Create `components/edit-lien-form.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIEN_STATUSES, type Lien } from "@/lib/types";

export function EditLienForm({ lien }: { lien: Lien }) {
  const router = useRouter();
  const [provider, setProvider] = useState(lien.provider);
  const [amount, setAmount] = useState((lien.amount_cents / 100).toFixed(2));
  const [status, setStatus] = useState<string>(lien.status);
  const [notes, setNotes] = useState(lien.notes);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/liens/${lien.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, amount, status, notes }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not save changes.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const field =
    "rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20";
  const label = "font-mono text-xs uppercase tracking-widest text-muted";

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className={label}>Provider</span>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} required className={field} />
      </label>
      <div className="flex gap-3">
        <label className="flex w-40 flex-col gap-1">
          <span className={label}>Amount</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} required
            inputMode="decimal" className={`${field} font-mono`} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={label}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            {LIEN_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={label}>Negotiation notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6}
          placeholder="Dates, names, offers, agreed reductions…" className={field} />
      </label>
      {error && <p className="text-sm text-oxblood">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy}
          className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="font-mono text-xs text-resolved">Saved</span>}
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `app/lien/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { getCase, getLien } from "@/lib/queries";
import { EditLienForm } from "@/components/edit-lien-form";

export const dynamic = "force-dynamic";

export default async function LienPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const lien = getLien(Number(id));
  if (!lien) notFound();
  const caseRow = getCase(lien.case_id)!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/case/${caseRow.id}`} className="font-mono text-xs text-muted hover:text-ink">
          ← {caseRow.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{lien.provider}</h1>
      </div>
      <EditLienForm lien={lien} />
    </div>
  );
}
```

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npm run build
```

Browser: edit a lien's status to `negotiating`, add a note, save, confirm badge changes on the case page.

```bash
git add -A && git commit -m "feat: lien detail page with full edit form"
```

---

### Task 7: Settlement gate

**Files:**
- Create: `app/case/[id]/gate/page.tsx`

**Interfaces:**
- Consumes: `getCase`, `unresolvedLiens`, `liensForCase`, `formatCents`, `StatusBadge`, `requireSession`.

- [ ] **Step 1: Create `app/case/[id]/gate/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { formatCents } from "@/lib/money";
import { getCase, liensForCase, unresolvedLiens } from "@/lib/queries";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function GatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const caseRow = getCase(Number(id));
  if (!caseRow) notFound();

  const open = unresolvedLiens(caseRow.id);
  const total = liensForCase(caseRow.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/case/${caseRow.id}`} className="font-mono text-xs text-muted hover:text-ink">
          ← {caseRow.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Settlement gate</h1>
        <p className="mt-1 text-muted">
          Every lien below is still asserted or in negotiation. Clear each one —
          verify it, finish the negotiation, or waive it — before disbursement.
        </p>
      </div>

      {open.length === 0 ? (
        <div className="rounded-md border border-resolved/40 bg-resolved/5 p-6">
          <p className="font-semibold text-resolved">Gate is clear.</p>
          <p className="mt-1 text-sm text-muted">
            All {total.length} lien{total.length === 1 ? "" : "s"} on this case
            are verified, reduced, paid, or waived. Nothing is blocking disbursement.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-oxblood/40 bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {open.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.provider}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCents(l.amount_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/lien/${l.id}`} className="text-navy underline-offset-2 hover:underline">
                      Resolve
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit && npm run build
```

Browser: case with one `asserted` lien → gate shows it in the red-bordered table; mark it `waived` on its edit page → gate shows the green "Gate is clear" panel.

```bash
git add -A && git commit -m "feat: settlement gate checklist screen"
```

---

### Task 8: Sign-out, README, final verification

**Files:**
- Create: `components/sign-out-button.tsx`, `README.md` (replace scaffold README)
- Modify: `app/layout.tsx` (add the button to the header)

**Interfaces:**
- Consumes: `authClient.signOut`.

- [ ] **Step 1: Create `components/sign-out-button.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
      }}
      className="font-mono text-xs text-muted hover:text-ink"
    >
      Sign out
    </button>
  );
}
```

In `app/layout.tsx`, import it and place `<SignOutButton />` after the tagline `<span>` inside the header flex row.

- [ ] **Step 2: Replace `README.md`**

```markdown
# Lien Ledger

Shared per-case medical-lien tracking with a settlement-gate checklist,
for a California PI firm. Replaces per-paralegal Excel sheets.

Spec: `docs/superpowers/specs/2026-08-22-lien-ledger-design.md`
Plan: `docs/superpowers/plans/2026-08-22-lien-ledger-v1.md`

## Run

1. `npm install`
2. `.env.local` needs `BETTER_AUTH_SECRET` (openssl rand -hex 32) and
   `BETTER_AUTH_URL=http://localhost:3100`
3. One-time: `npx @better-auth/cli migrate --yes`, then seed staff logins:
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
```

- [ ] **Step 3: Full verification pass**

```bash
npm test && npx tsc --noEmit && npm run build
```

Then the end-to-end walk, in the browser at :3100:
1. Signed out → `/` redirects to `/login`.
2. Sign in (seeded user) → case list.
3. Add case "Gomez v. Rideshare Co" → add liens "Valley MRI $1,200", "Chiro Group $4,200".
4. Case shows 2 unresolved; gate lists both.
5. Edit Valley MRI → `verified`; Chiro Group → `negotiating`, note "left VM with adjuster".
6. Gate now lists only Chiro Group. Set it `reduced` → gate clear panel.
7. Restart `npm run dev`, refresh — everything persisted.
8. `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/api/cases` (no cookie) → 401.

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "feat: sign-out, README, v1 complete"
```

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

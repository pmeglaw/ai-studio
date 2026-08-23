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

  it("rejects a negative amount at the DB layer", () => {
    const c = createCase("D");
    expect(() => addLien(c.id, "X", -100)).toThrow();
  });
});

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

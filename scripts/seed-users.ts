import { auth } from "@/lib/auth";

// Usage: ALLOW_SIGNUP=1 SEED_PASSWORD='...' npx tsx scripts/seed-users.ts
// Edit this list to the firm's real 6 staff before running.
const USERS = [
  { name: "Patrick", email: "patrick@megeredchianlaw.com" },
  // ...5 more
];

const password = process.env.SEED_PASSWORD;
if (!password) throw new Error("Set SEED_PASSWORD (users change it after first login).");

async function main(pw: string) {
  for (const u of USERS) {
    await auth.api.signUpEmail({ body: { ...u, password: pw } });
    console.log("created", u.email);
  }
}

main(password);

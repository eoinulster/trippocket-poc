import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { databaseURL } from "./config.mjs";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
const localDir = new URL("../.data/", import.meta.url);
export function ownerKey(token) {
  if (typeof token !== "string" || !/^[-a-zA-Z0-9]{60,100}$/.test(token))
    throw Object.assign(
      new Error("Your device key is missing. Refresh and try again."),
      { status: 401 },
    );
  return createHash("sha256").update(token).digest("hex");
}
export function sqlClient() {
  const url = databaseURL();
  return url ? neon(url) : null;
}
export async function initDatabase() {
  const sql = sqlClient();
  if (!sql) return false;
  await sql`CREATE TABLE IF NOT EXISTS trippocket_wallets (owner TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS trippocket_ai_usage (bucket TEXT NOT NULL, day DATE NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(bucket,day))`;
  return true;
}
export async function readWallet(owner) {
  const sql = sqlClient();
  if (sql) {
    const rows =
      await sql`SELECT data FROM trippocket_wallets WHERE owner = ${owner}`;
    return rows[0]?.data || null;
  }
  if (process.env.VERCEL)
    throw new Error(
      "Cloud storage is not connected yet. Your pocket remains saved on this device.",
    );
  try {
    return JSON.parse(
      await readFile(new URL(owner + ".json", localDir), "utf8"),
    );
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
export async function saveWallet(owner, wallet) {
  const sql = sqlClient();
  if (sql) {
    if (!wallet.trips.length) {
      await sql`DELETE FROM trippocket_wallets WHERE owner = ${owner}`;
      return;
    }
    await sql`INSERT INTO trippocket_wallets (owner,data) VALUES (${owner},${JSON.stringify(wallet)}::jsonb) ON CONFLICT(owner) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
    return;
  }
  if (process.env.VERCEL)
    throw new Error("Cloud storage is not connected yet.");
  await mkdir(localDir, { recursive: true });
  const temp = new URL(owner + ".tmp", localDir);
  await writeFile(temp, JSON.stringify(wallet), { mode: 0o600 });
  await rename(temp, new URL(owner + ".json", localDir));
}
const usage = new Map();
export async function allowAI(owner) {
  const sql = sqlClient();
  const day = new Date().toISOString().slice(0, 10);
  if (sql) {
    const counts =
      await sql`INSERT INTO trippocket_ai_usage (bucket,day,count) VALUES (${owner},${day},1), ('global',${day},1) ON CONFLICT (bucket,day) DO UPDATE SET count=trippocket_ai_usage.count+1 RETURNING bucket,count`;
    return counts.every(
      (row) => row.count <= (row.bucket === "global" ? 40 : 12),
    );
  }
  if (process.env.VERCEL) return false;
  for (const bucket of [owner, "global"]) {
    const key = day + bucket;
    usage.set(key, (usage.get(key) || 0) + 1);
    if (usage.get(key) > (bucket === "global" ? 40 : 12)) return false;
  }
  return true;
}

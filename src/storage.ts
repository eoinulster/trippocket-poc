import type { Wallet } from "./model";
const DB_NAME = "trippocket";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("wallet");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function loadWallet(): Promise<Wallet | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("wallet");
    const req = tx.objectStore("wallet").get("current");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => d.close();
  });
}
export async function storeWallet(wallet: Wallet) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("wallet", "readwrite");
    tx.objectStore("wallet").put(wallet, "current");
    tx.oncomplete = () => {
      d.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
export function deviceToken() {
  let token = localStorage.getItem("trippocket-device");
  if (!token) {
    token = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem("trippocket-device", token);
  }
  return token;
}
export async function api(path: string, body?: unknown, method?: string) {
  const r = await fetch("/api/" + path, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      "X-Wallet-Token": deviceToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(path === "extract" ? 60000 : 15000),
  });
  const data = await r
    .json()
    .catch(() => ({ error: "The server could not be reached." }));
  if (!r.ok) throw new Error(data.error || "Please try again.");
  return data;
}

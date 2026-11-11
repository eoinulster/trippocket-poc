// Deploy ONLY committed public source. Credentials stay in process memory.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { databaseURL, modelKey } from "../server/config.mjs";
const token = process.env.VERCEL_TOKEN,
  project = process.env.VERCEL_PROJECT_ID,
  team = process.env.VERCEL_TEAM_ID;
if (!token || !project || !team || !databaseURL() || !modelKey())
  throw new Error(
    "Required server environment variables are missing. See .env.example and README.",
  );
const query = new URLSearchParams({ teamId: team });
async function call(path, method = "GET", body) {
  const r = await fetch(
    "https://api.vercel.com" + path + (path.includes("?") ? "&" : "?") + query,
    {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      `Vercel ${r.status}: ${data.error?.code || "request failed"}`,
    );
  return data;
}
await call(`/v10/projects/${project}/env?upsert=true`, "POST", [
  {
    key: "DATABASE_URL",
    value: databaseURL(),
    type: "encrypted",
    target: ["production", "preview"],
  },
  {
    key: "OPENROUTER_API_KEY",
    value: modelKey(),
    type: "encrypted",
    target: ["production", "preview"],
  },
]);
await call(`/v9/projects/${project}`, "PATCH", {
  framework: "vite",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  installCommand: "npm ci",
  nodeVersion: "24.x",
});
const names = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD"], {
  encoding: "utf8",
})
  .trim()
  .split("\n");
if (
  names.some((f) =>
    /^\.env(?!\.example$)|^\.projects\/|^\.vercel\/|^\.data\//.test(f),
  )
)
  throw new Error("Refusing to deploy private local files.");
const files = names.map((file) => ({
  file,
  data: execFileSync("git", ["show", "HEAD:" + file]).toString("base64"),
  encoding: "base64",
}));
const result = await call("/v13/deployments", "POST", {
  name: "trippocket-poc",
  project,
  target: "production",
  files,
  projectSettings: {
    framework: "vite",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    installCommand: "npm ci",
    nodeVersion: "24.x",
  },
});
mkdirSync(".vercel", { recursive: true });
writeFileSync(
  ".vercel/deployment.json",
  JSON.stringify({ id: result.id, url: result.url }),
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    status: result.readyState || result.status,
    url: result.url,
  }),
);

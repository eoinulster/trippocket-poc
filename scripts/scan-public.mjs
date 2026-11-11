// Scan the exact index before committing. Never print secret values.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
const files = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const known = existsSync(".env")
  ? Object.entries(parseEnv(readFileSync(".env", "utf8")))
      .filter(
        ([k, v]) =>
          v.length > 8 &&
          /(KEY|TOKEN|SECRET|PASSWORD|CONNECTION|URL|_ID$)/.test(k),
      )
      .map(([, v]) => v)
  : [];
const patterns = [
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}/,
  /\bsk-or-v1-[A-Za-z0-9]{12,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\b(?:acct|project|team|prj|fres|facctrq|prvdr)_[A-Za-z0-9]{10,}/,
  /postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
let failures = 0;
for (const file of files) {
  if (
    /(^|\/)(?:\.projects|\.vercel|\.data|node_modules|dist|test-results|playwright-report)(\/|$)/.test(
      file,
    ) ||
    /(^|\/)\.env(?!\.example$)/.test(file) ||
    file.endsWith(".log")
  ) {
    console.error("Forbidden public file:", file);
    failures++;
    continue;
  }
  const source = execFileSync("git", ["show", ":" + file], {
    encoding: "utf8",
  });
  if (
    known.some((value) => source.includes(value)) ||
    patterns.some((p) => p.test(source))
  ) {
    console.error("Possible secret or account identifier:", file);
    failures++;
  }
}
if (failures) {
  process.exitCode = 1;
  console.error("Public source scan failed.");
} else
  console.log(
    `Public source scan passed for ${files.length} staged files; no known secret values or account IDs found.`,
  );

// Applies the output of a read-only release job to the checkout, in the job that holds
// write access, and refuses anything beyond the expected JSON fields. The read-only job
// runs dependency code (lerna, npm install), so its output is untrusted here.
//
// Usage (from the repository root, before anything else modifies the checkout):
//   node scripts/release/apply-changes.mjs version-bump <patch-file>
//     The patch may only touch lerna.json, the root package-lock.json and publishable
//     package.json files, and only their version fields and internal @stamp-lib/* ranges.
//   node scripts/release/apply-changes.mjs web-ui <dir-with-package.json-and-package-lock.json>
//     apps/web-ui may only change @stamp-lib/* dependencies. Lockfile entries may only be
//     added, removed, or (for @stamp-lib/*) changed, and every added or changed entry must
//     match the npm registry (resolved URL, integrity, dependencies).
//
// The file lists are checked before anything is written, so this script itself can never
// be replaced by the input it is checking.
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { DEP_FIELDS, REPO_ROOT, fail, publishablePackages } from "./packages.mjs";

const REGISTRY = "https://registry.npmjs.org";
const isStamp = (name) => typeof name === "string" && name.startsWith("@stamp-lib/");
const git = (...args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
const readCurrent = (path) => JSON.parse(readFileSync(join(REPO_ROOT, path), "utf8"));
const readHead = (path) => JSON.parse(git("show", `HEAD:${path}`));

// Paths (arrays of keys) at which two JSON values differ. A key present on only one
// side is reported as a single path to that key.
function diffPaths(a, b, path = []) {
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObject(a) || !isObject(b)) return JSON.stringify(a) === JSON.stringify(b) ? [] : [path];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) =>
    key in a && key in b ? diffPaths(a[key], b[key], [...path, key]) : [[...path, key]],
  );
}

function checkFields(path, allowed) {
  const rejected = diffPaths(readHead(path), readCurrent(path)).filter((p) => !allowed(p));
  return rejected.map((p) => `${path}: unexpected change at ${JSON.stringify(p)}`);
}

function versionBump(patchFile) {
  const dirs = new Set(publishablePackages().map((p) => p.dir));
  const allowedFiles = new Set(["lerna.json", "package-lock.json", ...[...dirs].map((d) => `${d}/package.json`)]);

  // 1. File list, before applying: only modifications of allowed files.
  const summary = git("apply", "--summary", patchFile).trim();
  if (summary) fail(`The patch creates, deletes, renames or changes the mode of files:\n${summary}`);
  const files = git("apply", "--numstat", patchFile)
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t")[2]);
  const unexpected = files.filter((f) => !allowedFiles.has(f));
  if (unexpected.length) fail(`The patch touches unexpected files: ${unexpected.join(", ")}`);

  // 2. Apply, then check the JSON fields.
  git("apply", "--index", patchFile);
  const versionOrStampRange = (p) => (p.length === 1 && p[0] === "version") || (p.length === 2 && DEP_FIELDS.includes(p[0]) && isStamp(p[1]));
  const errors = files.flatMap((file) => {
    if (file === "lerna.json") return checkFields(file, (p) => p.length === 1 && p[0] === "version");
    if (file === "package-lock.json") {
      return checkFields(file, (p) => p[0] === "packages" && dirs.has(p[1]) && versionOrStampRange(p.slice(2)));
    }
    return checkFields(file, versionOrStampRange);
  });
  if (errors.length) fail(errors);
}

async function registryMatches(lockPath, entry) {
  const match = entry.resolved?.match(/^https:\/\/registry\.npmjs\.org\/((?:@[^/]+\/)?[^/]+)\/-\/[^/]+\.tgz$/);
  if (!match || !entry.version || !entry.integrity) return `${lockPath} is not a plain npm registry package`;
  const res = await fetch(`${REGISTRY}/${encodeURIComponent(match[1])}/${entry.version}`);
  if (!res.ok) return `${lockPath}: ${match[1]}@${entry.version} not found on the registry (${res.status})`;
  const manifest = await res.json();
  if (manifest.dist?.tarball !== entry.resolved) return `${lockPath}: resolved URL does not match the registry`;
  if (manifest.dist?.integrity !== entry.integrity) return `${lockPath}: integrity does not match the registry`;
  const sorted = (deps = {}) => JSON.stringify(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)));
  for (const field of ["dependencies", "optionalDependencies"]) {
    if (sorted(manifest[field]) !== sorted(entry[field])) {
      return `${lockPath}: ${field} do not match the registry manifest`;
    }
  }
  return undefined;
}

async function webUi(dir) {
  // 1. Input files, before copying.
  const names = readdirSync(resolve(dir)).sort();
  if (JSON.stringify(names) !== JSON.stringify(["package-lock.json", "package.json"])) {
    fail(`Expected only package.json and package-lock.json in ${dir}, got: ${names.join(", ")}`);
  }
  for (const name of names) copyFileSync(join(resolve(dir), name), join(REPO_ROOT, "apps/web-ui", name));

  // 2. JSON fields.
  const manifestErrors = checkFields("apps/web-ui/package.json", (p) => p.length === 2 && p[0] === "dependencies" && isStamp(p[1]));

  const lockPath = "apps/web-ui/package-lock.json";
  const before = readHead(lockPath).packages ?? {};
  const after = readCurrent(lockPath).packages ?? {};
  const changedEntries = new Set();
  const lockErrors = checkFields(lockPath, (p) => {
    if (p[0] !== "packages" || p.length < 2) return false;
    const [, key] = p;
    if (key === "") return p.length === 4 && p[2] === "dependencies" && isStamp(p[3]);
    const added = !(key in before);
    const removed = !(key in after);
    const stampEntry = isStamp(key.split("node_modules/").at(-1));
    if (removed) return true;
    if (added || stampEntry) {
      changedEntries.add(key);
      return true;
    }
    return false; // existing third-party entries must stay as they are
  });
  const registryErrors = (await Promise.all([...changedEntries].map((key) => registryMatches(key, after[key])))).filter(Boolean);

  const errors = [...manifestErrors, ...lockErrors, ...registryErrors];
  if (errors.length) fail(errors);
  console.log(`apps/web-ui: ${changedEntries.size} lockfile entries added or updated, all verified against the registry`);
}

const [mode, input] = process.argv.slice(2);
if (mode === "version-bump" && input) versionBump(input);
else if (mode === "web-ui" && input) await webUi(input);
else fail("Usage: apply-changes.mjs version-bump <patch-file> | web-ui <dir>");

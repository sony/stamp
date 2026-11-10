// Applies the output of a read-only release job to the checkout, in the job that holds write
// access, and refuses anything beyond the expected JSON fields. The read-only job runs
// dependency code (lerna, npm install), so its output is untrusted here.
//
// Usage (from the repository root, before anything else modifies the checkout):
//   node scripts/release/apply-changes.mjs version-bump <patch-file>
//     Only lerna.json, the root package-lock.json and publishable package.json files, and only
//     their version fields and internal @stamp-lib/* ranges.
//   node scripts/release/apply-changes.mjs web-ui <dir with package.json and package-lock.json>
//     Only @stamp-lib/* dependencies of apps/web-ui. Lockfile entries may only be added,
//     removed, or (for @stamp-lib/*) changed, and every added or changed entry must match the
//     npm registry (resolved URL, integrity, dependencies).
//
// File lists are checked before anything is written, so the input can never replace this script.
import { $, argv, fs, path } from "zx";
import { DEP_FIELDS, REPO_ROOT, fail, isStamp, publishablePackages, readJson, registryManifest } from "./lib.mjs";

const readHead = async (file) => JSON.parse((await $`git show ${`HEAD:${file}`}`).stdout);

// Key paths at which two JSON values differ; a key present on one side only is one path.
function diffPaths(a, b, keys = []) {
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObject(a) || !isObject(b)) return JSON.stringify(a) === JSON.stringify(b) ? [] : [keys];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) =>
    key in a && key in b ? diffPaths(a[key], b[key], [...keys, key]) : [[...keys, key]],
  );
}

async function unexpectedChanges(file, allowed) {
  const changes = diffPaths(await readHead(file), await readJson(file));
  return changes.filter((keys) => !allowed(keys)).map((keys) => `${file}: unexpected change at ${JSON.stringify(keys)}`);
}

async function versionBump(patchFile) {
  const dirs = new Set((await publishablePackages()).map((p) => p.dir));
  const allowedFiles = new Set(["lerna.json", "package-lock.json", ...[...dirs].map((dir) => `${dir}/package.json`)]);

  // 1. Before applying: only in-place modifications of the allowed files.
  const summary = (await $`git apply --summary ${patchFile}`).stdout.trim();
  if (summary) fail(`The patch creates, deletes, renames or changes the mode of files:\n${summary}`);
  const files = (await $`git apply --numstat ${patchFile}`).lines().map((line) => line.split("\t")[2]);
  const unexpected = files.filter((file) => !allowedFiles.has(file));
  if (unexpected.length) fail(`The patch touches unexpected files: ${unexpected.join(", ")}`);

  // 2. Apply, then check the JSON fields.
  await $`git apply --index ${patchFile}`;
  const isVersion = (keys) => keys.length === 1 && keys[0] === "version";
  const isVersionOrStampRange = (keys) => isVersion(keys) || (keys.length === 2 && DEP_FIELDS.includes(keys[0]) && isStamp(keys[1]));
  const allowed = {
    "lerna.json": isVersion,
    "package-lock.json": ([field, dir, ...rest]) => field === "packages" && dirs.has(dir) && isVersionOrStampRange(rest),
  };
  const errors = await Promise.all(files.map((file) => unexpectedChanges(file, allowed[file] ?? isVersionOrStampRange)));
  if (errors.flat().length) fail(errors.flat());
}

async function registryMismatch(key, entry) {
  const name = entry.resolved?.match(/^https:\/\/registry\.npmjs\.org\/((?:@[^/]+\/)?[^/]+)\/-\/[^/]+\.tgz$/)?.[1];
  if (!name || !entry.version || !entry.integrity) return `${key} is not a plain npm registry package`;
  const manifest = await registryManifest(name, entry.version);
  if (!manifest) return `${key}: ${name}@${entry.version} is not on the registry`;
  if (manifest.dist.tarball !== entry.resolved) return `${key}: resolved URL does not match the registry`;
  if (manifest.dist.integrity !== entry.integrity) return `${key}: integrity does not match the registry`;
  const canonical = (deps = {}) => JSON.stringify(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)));
  for (const field of ["dependencies", "optionalDependencies"]) {
    if (canonical(manifest[field]) !== canonical(entry[field])) return `${key}: ${field} do not match the registry manifest`;
  }
  return undefined;
}

async function webUi(inputDir) {
  // 1. Before copying: exactly the two manifests.
  const names = (await fs.readdir(inputDir)).sort();
  if (names.join() !== "package-lock.json,package.json") fail(`Expected only package.json and package-lock.json in ${inputDir}, got: ${names.join(", ")}`);
  for (const name of names) await fs.copy(path.join(inputDir, name), path.join(REPO_ROOT, "apps/web-ui", name));

  // 2. JSON fields.
  const lockFile = "apps/web-ui/package-lock.json";
  const before = (await readHead(lockFile)).packages ?? {};
  const after = (await readJson(lockFile)).packages ?? {};
  const toVerify = new Set();
  const lockAllowed = ([field, key, ...rest]) => {
    if (field !== "packages" || key === undefined) return false;
    if (key === "") return rest.length === 2 && rest[0] === "dependencies" && isStamp(rest[1]);
    if (!(key in after)) return true; // removed
    if (!(key in before) || isStamp(key.split("node_modules/").at(-1))) {
      toVerify.add(key); // added, or a @stamp-lib/* entry
      return true;
    }
    return false; // existing third-party entries must stay as they are
  };

  const errors = [
    ...(await unexpectedChanges("apps/web-ui/package.json", (keys) => keys.length === 2 && keys[0] === "dependencies" && isStamp(keys[1]))),
    ...(await unexpectedChanges(lockFile, lockAllowed)),
  ];
  errors.push(...(await Promise.all([...toVerify].map((key) => registryMismatch(key, after[key])))).filter(Boolean));
  if (errors.length) fail(errors);
  console.log(`apps/web-ui: ${toVerify.size} lockfile entries added or updated, all verified against the registry`);
}

const [mode, input] = argv._;
if (mode === "version-bump" && input) await versionBump(path.resolve(input));
else if (mode === "web-ui" && input) await webUi(path.resolve(input));
else fail("Usage: apply-changes.mjs version-bump <patch-file> | web-ui <dir>");

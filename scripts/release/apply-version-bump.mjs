// Applies the version bump patch from the read-only bump-version job (which runs lerna, i.e.
// package code, so its output is untrusted here) in the job that holds write access, and
// refuses anything beyond the expected changes:
//   - only lerna.json, the root package-lock.json and publishable package.json files,
//   - only their version fields and existing internal @stamp-lib/* ranges,
//   - and the result must be a consistent release.
// The file list is checked before anything is written, so the patch can never replace this script.
//
// Usage (from the repository root): node scripts/release/apply-version-bump.mjs <patch-file>
import { $, argv, path } from "zx";
import { DEP_FIELDS, fail, isStamp, publishablePackages, readJson, verifyRelease } from "./lib.mjs";

const patchFile = path.resolve(argv._[0] ?? fail("Usage: apply-version-bump.mjs <patch-file>"));
const packages = await publishablePackages();
const dirs = new Set(packages.map((p) => p.dir));

// 1. Before applying: only in-place modifications of the allowed files.
const allowedFiles = new Set(["lerna.json", "package-lock.json", ...[...dirs].map((dir) => `${dir}/package.json`)]);
const summary = (await $`git apply --summary ${patchFile}`).stdout.trim();
if (summary) fail(`The patch creates, deletes, renames or changes the mode of files:\n${summary}`);
const files = (await $`git apply --numstat ${patchFile}`).lines().map((line) => line.split("\t")[2]);
const unexpectedFiles = files.filter((file) => !allowedFiles.has(file));
if (unexpectedFiles.length) fail(`The patch touches unexpected files: ${unexpectedFiles.join(", ")}`);

// 2. Apply, then allow only changed values (no added or removed keys) of the version and of
//    existing internal @stamp-lib/* ranges.
await $`git apply --index ${patchFile}`;

const get = (obj, keys) => keys.reduce((o, k) => (o !== null && typeof o === "object" ? o[k] : undefined), obj);

// Key paths at which two JSON values differ; a key present on one side only is one path.
function diffPaths(a, b, keys = []) {
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObject(a) || !isObject(b)) return JSON.stringify(a) === JSON.stringify(b) ? [] : [keys];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) =>
    key in a && key in b ? diffPaths(a[key], b[key], [...keys, key]) : [[...keys, key]],
  );
}

const isVersion = (keys) => keys.length === 1 && keys[0] === "version";
const isVersionOrStampRange = (keys) => isVersion(keys) || (keys.length === 2 && DEP_FIELDS.includes(keys[0]) && isStamp(keys[1]));
const allowedPaths = {
  "lerna.json": isVersion,
  "package-lock.json": ([field, dir, ...rest]) => field === "packages" && dirs.has(dir) && isVersionOrStampRange(rest),
};

const fieldErrors = [];
for (const file of files) {
  const [before, after] = [await readJson(file, "HEAD"), await readJson(file)];
  const allowed = allowedPaths[file] ?? isVersionOrStampRange;
  for (const keys of diffPaths(before, after)) {
    const changedValue = get(before, keys) !== undefined && get(after, keys) !== undefined;
    if (!changedValue || !allowed(keys)) fieldErrors.push(`${file}: unexpected change at ${JSON.stringify(keys)}`);
  }
}
if (fieldErrors.length) fail(fieldErrors);

// 3. The result is a consistent release: every package and internal range on the new version,
//    and the root lockfile's workspace entries agree with the package manifests.
const { version } = await verifyRelease();
const { packages: locked } = await readJson("package-lock.json");
const lockErrors = [];
for (const { name, dir, manifest } of await publishablePackages()) {
  if (locked[dir]?.version !== version) lockErrors.push(`package-lock.json: ${dir} is ${locked[dir]?.version}, expected ${version}`);
  for (const field of DEP_FIELDS) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (isStamp(dep) && locked[dir]?.[field]?.[dep] !== range) {
        lockErrors.push(`package-lock.json: ${dir} ${field}.${dep} does not match ${name}/package.json`);
      }
    }
  }
}
if (lockErrors.length) fail(lockErrors);
console.log(`Applied the version bump to ${version} (${files.length} files).`);

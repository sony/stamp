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
import { DEP_FIELDS, REPO_ROOT, fail, isStamp, publishablePackages, readJson, registryManifest, verifyRelease, verifyWebUi } from "./lib.mjs";

const readHead = async (file) => JSON.parse((await $`git show ${`HEAD:${file}`}`).stdout);

// Key paths at which two JSON values differ; a key present on one side only is one path.
function diffPaths(a, b, keys = []) {
  const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!isObject(a) || !isObject(b)) return JSON.stringify(a) === JSON.stringify(b) ? [] : [keys];
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) =>
    key in a && key in b ? diffPaths(a[key], b[key], [...keys, key]) : [[...keys, key]],
  );
}

// `allowed(keys, has)` decides per changed path; has(keys) is true when the path exists both
// before and after (a changed value rather than an added or removed key).
async function unexpectedChanges(file, allowed) {
  const [before, after] = [await readHead(file), await readJson(file)];
  const get = (obj, keys) => keys.reduce((o, k) => (o !== null && typeof o === "object" ? o[k] : undefined), obj);
  const has = (keys) => get(before, keys) !== undefined && get(after, keys) !== undefined;
  const changes = diffPaths(before, after);
  return changes.filter((keys) => !allowed(keys, has)).map((keys) => `${file}: unexpected change at ${JSON.stringify(keys)}`);
}

// The name of the package at a lockfile key, e.g. "node_modules/a/node_modules/@s/b" -> "@s/b".
const lockKeyName = (key) => key.split("node_modules/").at(-1);

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
  // Only changed values (no added or removed keys): the version, and existing internal @stamp-lib/* ranges.
  const isVersion = (keys) => keys.length === 1 && keys[0] === "version";
  const isVersionOrStampRange = (keys) => isVersion(keys) || (keys.length === 2 && DEP_FIELDS.includes(keys[0]) && isStamp(keys[1]));
  const allowed = {
    "lerna.json": (keys, has) => has(keys) && isVersion(keys),
    "package-lock.json": (keys, has) => has(keys) && keys[0] === "packages" && dirs.has(keys[1]) && isVersionOrStampRange(keys.slice(2)),
  };
  const fallback = (keys, has) => has(keys) && isVersionOrStampRange(keys);
  const errors = await Promise.all(files.map((file) => unexpectedChanges(file, allowed[file] ?? fallback)));
  if (errors.flat().length) fail(errors.flat());

  // 3. The result is a consistent release: every package and internal range on the new version,
  //    and the root lockfile's workspace entries agree with the package manifests.
  const { version } = await verifyRelease();
  const { packages: locked } = await readJson("package-lock.json");
  const lockErrors = (await publishablePackages()).flatMap(({ name, dir, manifest }) =>
    [
      locked[dir]?.version !== version && `package-lock.json: ${dir} is ${locked[dir]?.version}, expected ${version}`,
      ...DEP_FIELDS.flatMap((field) =>
        Object.entries(manifest[field] ?? {})
          .filter(([dep, range]) => isStamp(dep) && locked[dir]?.[field]?.[dep] !== range)
          .map(([dep]) => `package-lock.json: ${dir} ${field}.${dep} does not match ${name}/package.json`),
      ),
    ].filter(Boolean),
  );
  if (lockErrors.length) fail(lockErrors);
}

async function registryMismatch(key, entry) {
  const name = entry.resolved?.match(/^https:\/\/registry\.npmjs\.org\/((?:@[^/]+\/)?[^/]+)\/-\/[^/]+\.tgz$/)?.[1];
  if (!name || !entry.version || !entry.integrity) return `${key} is not a plain npm registry package`;
  // The entry must be the package its location says it is (no substitution, no aliases).
  if (name !== lockKeyName(key) || (entry.name !== undefined && entry.name !== name)) return `${key} resolves to a different package (${name})`;
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
  const lockAllowed = (keys, has) => {
    const [field, key, ...rest] = keys;
    if (field !== "packages" || key === undefined) return false;
    if (key === "") return has(keys) && rest.length === 2 && rest[0] === "dependencies" && isStamp(rest[1]);
    if (!(key in after)) return true; // removed
    if (!(key in before) || isStamp(lockKeyName(key))) {
      toVerify.add(key); // added, or a @stamp-lib/* entry
      return true;
    }
    return false; // existing third-party entries must stay as they are
  };

  const errors = [
    // Existing @stamp-lib/* dependencies may change version; none may be added or removed.
    ...(await unexpectedChanges("apps/web-ui/package.json", (keys, has) => has(keys) && keys.length === 2 && keys[0] === "dependencies" && isStamp(keys[1]))),
    ...(await unexpectedChanges(lockFile, lockAllowed)),
  ];
  errors.push(...(await Promise.all([...toVerify].map((key) => registryMismatch(key, after[key])))).filter(Boolean));
  if (errors.length) fail(errors);

  // 3. The result uses exactly the current release, with a lockfile entry for every direct dependency.
  await verifyWebUi();
  console.log(`apps/web-ui: ${toVerify.size} lockfile entries added or updated, all verified against the registry`);
}

const [mode, input] = argv._;
if (mode === "version-bump" && input) await versionBump(path.resolve(input));
else if (mode === "web-ui" && input) await webUi(path.resolve(input));
else fail("Usage: apply-changes.mjs version-bump <patch-file> | web-ui <dir>");

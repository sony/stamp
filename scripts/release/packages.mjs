// Shared helpers for the release scripts. No third-party dependencies on purpose:
// these scripts run in release jobs before (or instead of) `npm ci`.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

export const REPO_ROOT = resolve(import.meta.dirname, "../..");
export const REPOSITORY = "sony/stamp";
export const STAGE_WORKFLOW_PATH = ".github/workflows/npm-stage-publish.yml";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export function lernaVersion() {
  return readJson(join(REPO_ROOT, "lerna.json")).version;
}

// Publishable (non-private) packages, resolved from the "dir/*" globs in lerna.json.
export function publishablePackages() {
  const { packages: globs } = readJson(join(REPO_ROOT, "lerna.json"));
  const result = [];
  for (const glob of globs) {
    if (!/^[\w.-]+\/\*$/.test(glob)) {
      throw new Error(`Unsupported lerna.json package glob: ${glob} (only "dir/*" is supported)`);
    }
    const parent = join(REPO_ROOT, glob.slice(0, -2));
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      const manifestPath = join(parent, entry.name, "package.json");
      if (!entry.isDirectory() || !existsSync(manifestPath)) continue;
      const manifest = readJson(manifestPath);
      if (manifest.private) continue;
      result.push({ name: manifest.name, version: manifest.version, dir: join(glob.slice(0, -2), entry.name), manifest });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

// Checks that the repository is in a releasable state and returns the version and dist-tag:
// - lerna.json version is "x.y.z" (latest) or "x.y.z-rc.N" (rc)
// - every publishable package has that version, and depends on the others at "^<version>"
// - every publishable package has repository.url pointing here (required by npm trusted publishing)
export function verifyRelease() {
  const version = lernaVersion();
  const errors = [];

  let distTag;
  if (/^\d+\.\d+\.\d+$/.test(version)) distTag = "latest";
  else if (/^\d+\.\d+\.\d+-rc\.\d+$/.test(version)) distTag = "rc";
  else errors.push(`Unsupported version format: ${version} (expected x.y.z or x.y.z-rc.N)`);

  const repoUrl = new RegExp(`^(git\\+)?https://github\\.com/${REPOSITORY.replace("/", "\\/")}(\\.git)?$`);
  for (const pkg of publishablePackages()) {
    if (pkg.version !== version) {
      errors.push(`${pkg.name} is ${pkg.version}, expected ${version} (lerna.json)`);
    }
    const { dependencies, devDependencies, peerDependencies, optionalDependencies } = pkg.manifest;
    for (const [dep, range] of Object.entries({ ...dependencies, ...devDependencies, ...peerDependencies, ...optionalDependencies })) {
      if (dep.startsWith("@stamp-lib/") && range !== `^${version}`) {
        errors.push(`${pkg.name} depends on ${dep}@${range}, expected ^${version}`);
      }
    }
    const url = typeof pkg.manifest.repository === "string" ? pkg.manifest.repository : pkg.manifest.repository?.url;
    if (!url || !repoUrl.test(url)) {
      errors.push(`${pkg.name} (${pkg.dir}/package.json) must set repository.url to https://github.com/${REPOSITORY}.git`);
    }
  }

  if (errors.length) fail(errors);
  return { version, distTag };
}

export const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

// File name `npm pack` gives a package tarball, e.g. @stamp-lib/stamp-hub -> stamp-lib-stamp-hub-1.0.0.tgz
export function tarballName(name, version) {
  return `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`;
}

export function fail(messages) {
  for (const message of [].concat(messages)) console.error(`::error::${message}`);
  process.exit(1);
}

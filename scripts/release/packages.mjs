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

export function fail(messages) {
  for (const message of [].concat(messages)) console.error(`::error::${message}`);
  process.exit(1);
}

// Checks that apps/web-ui depends on exactly the lerna.json version of every
// @stamp-lib/* package it uses, in both package.json and package-lock.json,
// so that a release tag never points at a web-ui that still uses an old version.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, lernaVersion, publishablePackages, fail } from "./packages.mjs";

const version = lernaVersion();
const webUi = join(REPO_ROOT, "apps/web-ui");
const manifest = JSON.parse(readFileSync(join(webUi, "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(webUi, "package-lock.json"), "utf8"));
const published = new Set(publishablePackages().map((p) => p.name));
const errors = [];

const deps = { ...manifest.dependencies, ...manifest.devDependencies };
for (const [name, range] of Object.entries(deps)) {
  if (!name.startsWith("@stamp-lib/")) continue;
  if (!published.has(name)) errors.push(`apps/web-ui depends on ${name}, which is not a publishable package in this repository`);
  if (range !== version) errors.push(`apps/web-ui/package.json: ${name} is "${range}", expected "${version}"`);
}

for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  const name = path.match(/(?:^|\/)node_modules\/(@stamp-lib\/[^/]+)$/)?.[1];
  if (name && entry.version !== version) {
    errors.push(`apps/web-ui/package-lock.json: ${path} is ${entry.version}, expected ${version}`);
  }
}

if (errors.length) fail(errors);
console.log(`apps/web-ui uses @stamp-lib/* ${version}`);

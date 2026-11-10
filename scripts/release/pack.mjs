// Build-job half of npm-stage-publish.yml (runs WITHOUT id-token permission).
// Verifies the packages are ready to release and packs them into tarballs, writing
// <out-dir>/manifest.json in dependency order for stage.mjs.
//
// Usage: node scripts/release/pack.mjs <out-dir>
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { REPO_ROOT, verifyRelease, fail } from "./packages.mjs";

const outDir = resolve(process.argv[2] ?? fail("Usage: pack.mjs <out-dir>"));
const { version, distTag } = verifyRelease();

// Dependency order (dependencies first), which is also the order to approve them in.
const ordered = JSON.parse(
  execFileSync("npx", ["--no-install", "lerna", "list", "--toposort", "--json", "--loglevel", "silent"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }),
);

mkdirSync(outDir, { recursive: true });
const packages = [];
for (const { name, location } of ordered) {
  const output = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", outDir], { cwd: location, encoding: "utf8" }));
  // npm 11 prints an array, npm 12 an object keyed by package name.
  const packed = Array.isArray(output) ? output[0] : output[name];
  if (!packed) fail(`Unexpected npm pack output in ${location}`);
  if (packed.name !== name || packed.version !== version) {
    fail(`npm pack in ${location} produced ${packed.name}@${packed.version}, expected ${name}@${version}`);
  }
  console.log(`packed ${packed.filename} (${packed.entryCount} files)`);
  packages.push({ name, version, file: packed.filename, integrity: packed.integrity });
}

writeFileSync(join(outDir, "manifest.json"), JSON.stringify({ version, distTag, packages }, null, 2));

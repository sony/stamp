// Build-job half of npm-stage-publish.yml (runs WITHOUT id-token permission).
// Verifies the packages are ready to release, packs them, and writes
// <out-dir>/manifest.json listing the tarballs in dependency order for stage.mjs.
//
// Usage: node scripts/release/pack.mjs <out-dir>
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { REPO_ROOT, verifyRelease, fail } from "./packages.mjs";

const outDir = resolve(process.argv[2] ?? fail("Usage: pack.mjs <out-dir>"));
const { version, distTag } = verifyRelease();
const run = (command, args) => JSON.parse(execFileSync(command, args, { cwd: REPO_ROOT, encoding: "utf8" }));

// Dependency order (dependencies first), which is also the order to approve them in.
const ordered = run("npx", ["--no-install", "lerna", "list", "--toposort", "--json", "--loglevel", "silent"]);

mkdirSync(outDir, { recursive: true });
const packed = run("npm", ["pack", "--json", "--pack-destination", outDir, ...ordered.flatMap((p) => ["--workspace", p.name])]);

const packages = ordered.map(({ name }) => ({ name, file: packed[name].filename }));
writeFileSync(join(outDir, "manifest.json"), JSON.stringify({ version, distTag, packages }, null, 2));
console.log(packages.map((p) => p.file).join("\n"));

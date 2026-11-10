// Build-job half of npm-stage-publish.yml (runs WITHOUT id-token permission).
// Verifies the packages are ready to release and packs them into tarballs, writing
// <out-dir>/manifest.json in dependency order for stage.mjs.
//
// Usage: node scripts/release/pack.mjs <out-dir>
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { REPO_ROOT, REPOSITORY, lernaVersion, publishablePackages, fail } from "./packages.mjs";

const outDir = resolve(process.argv[2] ?? fail("Usage: pack.mjs <out-dir>"));
const version = lernaVersion();
const errors = [];

// Only "x.y.z" (latest) and "x.y.z-rc.N" (rc) are produced by the versionup scripts.
let distTag;
if (/^\d+\.\d+\.\d+$/.test(version)) distTag = "latest";
else if (/^\d+\.\d+\.\d+-rc\.\d+$/.test(version)) distTag = "rc";
else errors.push(`Unsupported version format: ${version} (expected x.y.z or x.y.z-rc.N)`);

const repoUrl = new RegExp(`^(git\\+)?https://github\\.com/${REPOSITORY.replace("/", "\\/")}(\\.git)?$`);
for (const pkg of publishablePackages()) {
  if (pkg.version !== version) {
    errors.push(`${pkg.name} is ${pkg.version}, expected ${version} (lerna.json)`);
  }
  // npm trusted publishing rejects packages whose repository.url does not match the repository.
  const url = typeof pkg.manifest.repository === "string" ? pkg.manifest.repository : pkg.manifest.repository?.url;
  if (!url || !repoUrl.test(url)) {
    errors.push(`${pkg.name} (${pkg.dir}/package.json) must set repository.url to https://github.com/${REPOSITORY}.git`);
  }
}
if (errors.length) fail(errors);

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

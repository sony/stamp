// Stage-job half of npm-stage-publish.yml (runs WITH id-token permission).
// Stages the tarballs built by pack.mjs. No dependencies are installed and no
// package code runs in this job. The artifact download already verifies the
// tarballs against the digest recorded at upload; the version, dist-tag and the
// expected set of tarballs are recomputed here from the checkout instead of being
// taken from the build job.
//
// Usage: node scripts/release/stage.mjs <tarball-dir>
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { fail, publishablePackages, tarballName, verifyRelease } from "./packages.mjs";

const dir = resolve(process.argv[2] ?? fail("Usage: stage.mjs <tarball-dir>"));
const { version, distTag } = verifyRelease();
const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));

// The build job only decides the order; everything else must match the checkout.
const expected = publishablePackages()
  .map((p) => p.name)
  .sort();
const ordered = manifest.packages.map((p) => p.name);
const expectedFiles = [...expected.map((name) => tarballName(name, version)), "manifest.json"].sort();
if (
  manifest.version !== version ||
  manifest.distTag !== distTag ||
  JSON.stringify([...ordered].sort()) !== JSON.stringify(expected) ||
  manifest.packages.some((p) => p.file !== tarballName(p.name, version)) ||
  JSON.stringify(readdirSync(dir).sort()) !== JSON.stringify(expectedFiles)
) {
  fail("The build job's tarballs do not match the packages and version in this commit.");
}

const summary = (line = "") => appendFileSync(process.env.GITHUB_STEP_SUMMARY ?? "/dev/null", `${line}\n`);
const isPublished = (name) => {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

summary(`## Staged @stamp-lib packages ${version} (dist-tag: ${distTag})`);
summary();
summary("Approve them on npmjs.com (package page → Staged Packages) or with `npm stage approve`, in this order:");
summary();

const staged = [];
const failed = [];
for (const name of ordered) {
  if (isPublished(name)) {
    summary(`1. \`${name}\` (already published)`);
    continue;
  }
  try {
    execFileSync("npm", ["stage", "publish", join(dir, tarballName(name, version)), "--tag", distTag, "--provenance"], { stdio: "inherit" });
    staged.push(name);
    summary(`1. \`${name}\``);
  } catch {
    failed.push(name);
    summary(`1. \`${name}\` **not staged** (it may already be staged from an earlier run: \`npm stage list ${name}\`)`);
  }
}

summary();
summary("After approving all of them, run the **release** workflow with `bump-web-ui`.");

if (failed.length) {
  fail(
    `Not staged: ${failed.join(", ")}. If a version is already staged (pending approval) from an earlier run, ` +
      "approve it, or reject it (npm stage reject) and re-run to rebuild it.",
  );
}
if (staged.length === 0) {
  fail(`Every package is already published at ${version}. Was the version bump PR merged before running this workflow?`);
}

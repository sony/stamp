// Stage-job half of npm-stage-publish.yml (runs WITH id-token permission).
// Stages the tarballs built by pack.mjs. No dependencies are installed and no
// package code runs in this job. The artifact download already verifies the
// tarballs against the digest recorded at upload.
//
// Usage: node scripts/release/stage.mjs <tarball-dir>
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { fail } from "./packages.mjs";

const dir = resolve(process.argv[2] ?? fail("Usage: stage.mjs <tarball-dir>"));
const { version, distTag, packages } = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
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

const failed = [];
for (const { name, file } of packages) {
  if (isPublished(name)) {
    summary(`1. \`${name}\` (already published)`);
    continue;
  }
  try {
    execFileSync("npm", ["stage", "publish", join(dir, file), "--tag", distTag, "--provenance"], { stdio: "inherit" });
    summary(`1. \`${name}\``);
  } catch {
    failed.push(name);
    summary(`1. \`${name}\` **failed to stage**`);
  }
}

summary();
summary("After approving all of them, run the **release** workflow with `bump-web-ui`.");

if (failed.length) {
  fail(`Failed to stage: ${failed.join(", ")}. An already staged version must be rejected (npm stage reject) before re-staging.`);
}

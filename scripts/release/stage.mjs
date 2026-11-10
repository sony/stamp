// Stage-job half of npm-stage-publish.yml (runs WITH id-token permission).
// Stages the tarballs built by pack.mjs. No dependencies are installed and no
// package code is executed in this job: it only hashes and uploads tarballs.
//
// Usage: node scripts/release/stage.mjs <tarball-dir>
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { fail } from "./packages.mjs";

const dir = resolve(process.argv[2] ?? fail("Usage: stage.mjs <tarball-dir>"));
const { version, distTag, packages } = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const summary = (line = "") => (summaryPath ? appendFileSync(summaryPath, `${line}\n`) : undefined);

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
summary(
  "Approve them on npmjs.com (package page → Staged Packages) or with `npm stage list <package>` / `npm stage approve <stage-id>`, in this order (dependencies first):",
);
summary();

const failed = [];
for (const { name, file, integrity } of packages) {
  const tarball = join(dir, file);
  const actual = `sha512-${createHash("sha512").update(readFileSync(tarball)).digest("base64")}`;
  if (actual !== integrity) fail(`${file} does not match the integrity recorded by the build job`);

  console.log(`::group::${name}`);
  if (isPublished(name)) {
    console.log(`${name}@${version} is already published, skipping.`);
    summary(`1. \`${name}\` (already published)`);
  } else {
    try {
      execFileSync("npm", ["stage", "publish", tarball, "--tag", distTag, "--provenance"], { stdio: "inherit" });
      summary(`1. \`${name}\``);
    } catch {
      failed.push(name);
      summary(`1. \`${name}\` **failed to stage**`);
    }
  }
  console.log("::endgroup::");
}

summary();
summary("After approving all of them, run the **release** workflow with `bump-web-ui`.");

if (failed.length) {
  fail(
    `Failed to stage: ${failed.join(", ")}. A version that is already staged cannot be staged again; ` +
      "reject it with `npm stage reject <stage-id>` if it must be rebuilt.",
  );
}

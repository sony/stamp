// Checks that every publishable package at the lerna.json version is live on npm
// (i.e. its staged version was approved), that its SLSA provenance says it was built
// by this repository's stage-publish workflow on main, that all packages were built
// from the same commit, and that the library sources at HEAD still match that commit
// (so a release tag on HEAD contains exactly what was published).
//
// The provenance signatures themselves are verified by `npm audit signatures`
// after installing the packages; this script checks what the provenance claims.
// Needs the full git history (actions/checkout with fetch-depth: 0).
//
// Prints the commit the packages were built from on stdout.
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import { REPO_ROOT, lernaVersion, publishablePackages, REPOSITORY, STAGE_WORKFLOW_PATH, fail } from "./packages.mjs";

const REGISTRY = "https://registry.npmjs.org";
const EXPECTED_WORKFLOW = {
  repository: `https://github.com/${REPOSITORY}`,
  path: STAGE_WORKFLOW_PATH,
  ref: "refs/heads/main",
};
// Everything that goes into the published packages.
const LIBRARY_PATHS = ["packages", "catalogs", "plugins", "lerna.json", "package.json", "package-lock.json", "tsconfig.base.json"];

const version = lernaVersion();

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

// Returns { commit } or { error }.
async function check({ name }) {
  const spec = `${encodeURIComponent(name)}/${version}`;
  const manifest = await getJson(`${REGISTRY}/${spec}`);
  if (!manifest) return { error: `${name}@${version} is not published yet. Approve it on npm first (npm stage list ${name}).` };

  const attestations = await getJson(`${REGISTRY}/-/npm/v1/attestations/${encodeURIComponent(name)}@${version}`);
  const slsa = attestations?.attestations?.find((a) => a.predicateType === "https://slsa.dev/provenance/v1");
  if (!slsa) return { error: `${name}@${version} has no SLSA provenance; it was not published by ${STAGE_WORKFLOW_PATH}.` };

  const statement = JSON.parse(Buffer.from(slsa.bundle.dsseEnvelope.payload, "base64").toString("utf8"));
  const { externalParameters, resolvedDependencies } = statement.predicate?.buildDefinition ?? {};
  for (const [key, expected] of Object.entries(EXPECTED_WORKFLOW)) {
    if (externalParameters?.workflow?.[key] !== expected) {
      return { error: `${name}@${version} provenance ${key} is "${externalParameters?.workflow?.[key]}", expected "${expected}".` };
    }
  }

  // The provenance must describe the exact tarball the registry serves.
  // Package URLs (purl) percent-encode the scope's "@".
  const purl = `pkg:npm/${name.replace(/^@/, "%40")}@${version}`;
  const integrity = manifest.dist?.integrity ?? "";
  const sha512 = integrity.startsWith("sha512-") ? Buffer.from(integrity.slice(7), "base64").toString("hex") : undefined;
  if (!sha512 || statement.subject?.find((s) => s.name === purl)?.digest?.sha512 !== sha512) {
    return { error: `${name}@${version} provenance subject digest does not match the published tarball.` };
  }

  const commit = resolvedDependencies?.[0]?.digest?.gitCommit;
  if (!/^[0-9a-f]{40}$/.test(commit ?? "")) return { error: `${name}@${version} provenance has no source commit.` };
  console.error(`ok  ${name}@${version} (built from ${commit})`);
  return { commit };
}

const results = await Promise.all(publishablePackages().map(check));
const errors = results.map((r) => r.error).filter(Boolean);
if (errors.length) fail(errors);

const commits = [...new Set(results.map((r) => r.commit))];
if (commits.length !== 1) fail(`Packages were built from different commits (${commits.join(", ")}). Re-stage all packages from one commit.`);
const [commit] = commits;

const git = (...args) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
try {
  git("merge-base", "--is-ancestor", commit, "HEAD");
} catch {
  fail(`Commit ${commit} is not an ancestor of HEAD (needs fetch-depth: 0, and the commit must be on main).`);
}
const changed = git("diff", "--name-only", commit, "HEAD", "--", ...LIBRARY_PATHS);
if (changed) {
  fail(
    `Library sources changed on main after the packages were built from ${commit}, so a tag here would not match npm:\n${changed}\n` +
      "Release those changes as a new version.",
  );
}
console.log(commit);

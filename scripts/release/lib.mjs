// Shared helpers and checks for the release scripts. Install with `npm ci --prefix scripts/release`.
import { $, fs, glob, path } from "zx";

export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
export const REPOSITORY = "sony/stamp";
export const STAGE_WORKFLOW_PATH = ".github/workflows/npm-stage-publish.yml";
export const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const REGISTRY = "https://registry.npmjs.org";
// Everything that can affect the published packages: the sources and also the build and release
// tooling (workflows, release scripts, npm config). Only the web UI and docs may differ.
const RELEASE_INPUTS = [".", ":(exclude)apps/web-ui", ":(exclude)docs"];

$.cwd = REPO_ROOT;

export function fail(...messages) {
  for (const message of messages.flat()) console.error(`::error::${message}`);
  process.exit(1);
}

export async function summary(...lines) {
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, lines.map((l) => `${l}\n`).join(""));
}

// Reads a JSON file from the working tree, or from a commit when `ref` is given.
export const readJson = async (file, ref) => (ref ? JSON.parse((await $`git show ${`${ref}:${file}`}`).stdout) : fs.readJson(path.join(REPO_ROOT, file)));
export const lernaVersion = async (ref) => (await readJson("lerna.json", ref)).version;
export const isStamp = (name) => typeof name === "string" && name.startsWith("@stamp-lib/");

// File name `npm pack` gives a package tarball, e.g. @stamp-lib/stamp-hub -> stamp-lib-stamp-hub-1.0.0.tgz
export const tarballName = (name, version) => `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`;

// Publishable (non-private) packages matched by the lerna.json globs, sorted by name.
export async function publishablePackages() {
  const { packages: globs } = await readJson("lerna.json");
  const files = await glob(
    globs.map((g) => `${g}/package.json`),
    { cwd: REPO_ROOT },
  );
  const packages = await Promise.all(files.map(async (file) => ({ dir: path.dirname(file), manifest: await readJson(file) })));
  return packages
    .filter((p) => !p.manifest.private)
    .map((p) => ({ name: p.manifest.name, version: p.manifest.version, ...p }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// The repository is releasable: lerna.json has "x.y.z" (latest) or "x.y.z-rc.N" (rc), every
// publishable package has that version and depends on the others at "^<version>", and every
// package's repository.url points here (required by npm trusted publishing).
export async function verifyRelease() {
  const version = await lernaVersion();
  const distTag = /^\d+\.\d+\.\d+$/.test(version) ? "latest" : /^\d+\.\d+\.\d+-rc\.\d+$/.test(version) ? "rc" : undefined;
  const errors = distTag ? [] : [`Unsupported version format: ${version} (expected x.y.z or x.y.z-rc.N)`];
  const repoUrl = new RegExp(`^(git\\+)?https://github\\.com/${REPOSITORY}(\\.git)?$`);

  for (const { name, dir, manifest } of await publishablePackages()) {
    if (manifest.version !== version) errors.push(`${name} is ${manifest.version}, expected ${version} (lerna.json)`);
    for (const field of DEP_FIELDS) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        if (isStamp(dep) && range !== `^${version}`) errors.push(`${name} depends on ${dep}@${range}, expected ^${version}`);
      }
    }
    const url = manifest.repository?.url ?? manifest.repository;
    if (!repoUrl.test(url ?? "")) errors.push(`${dir}/package.json must set repository.url to https://github.com/${REPOSITORY}.git`);
  }

  if (errors.length) fail(errors);
  return { version, distTag };
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

export const registryManifest = (name, version) => getJson(`${REGISTRY}/${encodeURIComponent(name)}/${version}`);

// Every publishable package is live on npm at the lerna.json version, with SLSA provenance from
// this repository's stage-publish workflow on main, all built from one commit, and `ref` has
// exactly that commit's sources and release tooling (so a tag on `ref` matches npm).
// Needs the full git history. Returns the source commit.
// (Provenance signatures are verified by `npm audit signatures` after installing.)
export async function verifyPublished(ref = "HEAD") {
  const version = await lernaVersion(ref);
  const expected = { repository: `https://github.com/${REPOSITORY}`, path: STAGE_WORKFLOW_PATH, ref: "refs/heads/main" };

  const check = async (name) => {
    const manifest = await registryManifest(name, version);
    if (!manifest) return { error: `${name}@${version} is not published yet. Approve it on npm first (npm stage list ${name}).` };

    const { attestations } = (await getJson(`${REGISTRY}/-/npm/v1/attestations/${encodeURIComponent(name)}@${version}`)) ?? {};
    const slsa = attestations?.find((a) => a.predicateType === "https://slsa.dev/provenance/v1");
    if (!slsa) return { error: `${name}@${version} has no SLSA provenance; it was not published by ${STAGE_WORKFLOW_PATH}.` };

    const statement = JSON.parse(Buffer.from(slsa.bundle.dsseEnvelope.payload, "base64").toString("utf8"));
    const { externalParameters, resolvedDependencies } = statement.predicate.buildDefinition;
    for (const [key, value] of Object.entries(expected)) {
      const actual = externalParameters.workflow?.[key];
      if (actual !== value) return { error: `${name}@${version} provenance ${key} is "${actual}", expected "${value}".` };
    }

    // The provenance must describe the exact tarball the registry serves.
    // Package URLs (purl) percent-encode the scope's "@".
    const purl = `pkg:npm/${name.replace(/^@/, "%40")}@${version}`;
    const sha512 = Buffer.from(manifest.dist.integrity.replace(/^sha512-/, ""), "base64").toString("hex");
    if (statement.subject?.find((s) => s.name === purl)?.digest?.sha512 !== sha512) {
      return { error: `${name}@${version} provenance subject digest does not match the published tarball.` };
    }

    const commit = resolvedDependencies?.[0]?.digest?.gitCommit;
    if (!/^[0-9a-f]{40}$/.test(commit ?? "")) return { error: `${name}@${version} provenance has no source commit.` };
    console.error(`ok  ${name}@${version} (built from ${commit})`);
    return { commit };
  };

  const results = await Promise.all((await publishablePackages()).map((p) => check(p.name)));
  const errors = results.map((r) => r.error).filter(Boolean);
  if (errors.length) fail(errors);

  const commits = [...new Set(results.map((r) => r.commit))];
  if (commits.length !== 1) fail(`Packages were built from different commits (${commits.join(", ")}). Re-stage all packages from one commit.`);
  const [commit] = commits;

  if (!(await $({ nothrow: true, quiet: true })`git merge-base --is-ancestor ${commit} ${ref}`).ok) {
    fail(`Commit ${commit} is not an ancestor of ${ref} (needs fetch-depth: 0, and the commit must be on main).`);
  }
  const changed = (await $`git diff --name-only ${commit} ${ref} -- ${RELEASE_INPUTS}`).stdout.trim();
  if (changed) {
    fail(
      `Files outside apps/web-ui and docs changed after the packages were built from ${commit}, so a tag here would not match npm:\n${changed}\nRelease them as a new version.`,
    );
  }
  return commit;
}

// apps/web-ui (in the working tree, or at `ref`) depends on exactly the lerna.json version of every
// @stamp-lib/* package it uses, in package.json and package-lock.json.
export async function verifyWebUi(ref) {
  const version = await lernaVersion(ref);
  const manifest = await readJson("apps/web-ui/package.json", ref);
  const { packages: locked = {} } = await readJson("apps/web-ui/package-lock.json", ref);
  const published = new Set((await publishablePackages()).map((p) => p.name));
  const errors = [];

  for (const [name, range] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
    if (!isStamp(name)) continue;
    if (!published.has(name)) errors.push(`apps/web-ui depends on ${name}, which is not a publishable package here`);
    if (range !== version) errors.push(`apps/web-ui/package.json: ${name} is "${range}", expected "${version}"`);
    if (!locked[`node_modules/${name}`]) errors.push(`apps/web-ui/package-lock.json has no entry for ${name}`);
  }
  for (const [key, entry] of Object.entries(locked)) {
    if (isStamp(key.split("node_modules/").at(-1)) && entry.version !== version) {
      errors.push(`apps/web-ui/package-lock.json: ${key} is ${entry.version}, expected ${version}`);
    }
  }

  if (errors.length) fail(errors);
  console.error(`apps/web-ui uses @stamp-lib/* ${version}`);
}

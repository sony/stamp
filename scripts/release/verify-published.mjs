// Checks that every publishable package at the lerna.json version is live on npm
// (i.e. its staged version was approved) and that its SLSA provenance says it was
// built by this repository's stage-publish workflow on main.
//
// The provenance signatures themselves are verified by `npm audit signatures`
// after installing the packages; this script checks what the provenance claims.
import { Buffer } from "node:buffer";
import { lernaVersion, publishablePackages, REPOSITORY, STAGE_WORKFLOW_PATH, fail } from "./packages.mjs";

const REGISTRY = "https://registry.npmjs.org";
const EXPECTED_WORKFLOW = {
  repository: `https://github.com/${REPOSITORY}`,
  path: STAGE_WORKFLOW_PATH,
  ref: "refs/heads/main",
};

const version = lernaVersion();

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function check(pkg) {
  const encoded = pkg.name.replace("/", "%2f");
  const manifest = await getJson(`${REGISTRY}/${encoded}/${version}`);
  if (!manifest) {
    return `${pkg.name}@${version} is not published yet. Approve it on npm first (npm stage list ${pkg.name}).`;
  }

  const attestations = await getJson(`${REGISTRY}/-/npm/v1/attestations/${encoded}@${version}`);
  const slsa = attestations?.attestations?.find((a) => a.predicateType === "https://slsa.dev/provenance/v1");
  if (!slsa) return `${pkg.name}@${version} has no SLSA provenance; it was not published by ${STAGE_WORKFLOW_PATH}.`;

  const statement = JSON.parse(Buffer.from(slsa.bundle.dsseEnvelope.payload, "base64").toString("utf8"));
  const workflow = statement.predicate?.buildDefinition?.externalParameters?.workflow ?? {};
  for (const [key, expected] of Object.entries(EXPECTED_WORKFLOW)) {
    if (workflow[key] !== expected) {
      return `${pkg.name}@${version} provenance ${key} is "${workflow[key]}", expected "${expected}".`;
    }
  }

  // The provenance must describe the exact tarball the registry serves.
  const integrity = manifest.dist?.integrity ?? "";
  const sha512 = integrity.startsWith("sha512-") ? Buffer.from(integrity.slice(7), "base64").toString("hex") : undefined;
  const subject = statement.subject?.find((s) => s.name === `pkg:npm/${pkg.name}@${version}`);
  if (!sha512 || subject?.digest?.sha512 !== sha512) {
    return `${pkg.name}@${version} provenance subject digest does not match the published tarball.`;
  }

  console.log(`ok  ${pkg.name}@${version} (built from ${workflow.repository}/${workflow.path}@${workflow.ref})`);
  return undefined;
}

const errors = (await Promise.all(publishablePackages().map(check))).filter(Boolean);
if (errors.length) fail(errors);

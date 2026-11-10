// Checks that every publishable package is ready to be staged:
// - its version matches lerna.json
// - its repository.url points at this repository (required by npm trusted publishing)
// Prints the npm dist-tag to use for the version.
import { lernaVersion, publishablePackages, REPOSITORY, fail } from "./packages.mjs";

const version = lernaVersion();
const errors = [];
const repoUrl = new RegExp(`^(git\\+)?https://github\\.com/${REPOSITORY.replace("/", "\\/")}(\\.git)?$`);

for (const pkg of publishablePackages()) {
  if (pkg.version !== version) {
    errors.push(`${pkg.name} is ${pkg.version}, expected ${version} (lerna.json)`);
  }
  const url = typeof pkg.manifest.repository === "string" ? pkg.manifest.repository : pkg.manifest.repository?.url;
  if (!url || !repoUrl.test(url)) {
    errors.push(`${pkg.name} (${pkg.dir}/package.json) must set repository.url to https://github.com/${REPOSITORY}.git`);
  }
}

// Only "x.y.z" (latest) and "x.y.z-rc.N" (rc) are produced by the versionup scripts.
let distTag;
if (/^\d+\.\d+\.\d+$/.test(version)) distTag = "latest";
else if (/^\d+\.\d+\.\d+-rc\.\d+$/.test(version)) distTag = "rc";
else errors.push(`Unsupported version format: ${version} (expected x.y.z or x.y.z-rc.N)`);

if (errors.length) fail(errors);
console.log(distTag);

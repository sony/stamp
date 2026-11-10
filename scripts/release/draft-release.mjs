// Creates the draft GitHub Release vX.Y.Z. The tag (created when the draft is published) goes on
// the commit that last changed apps/web-ui/package-lock.json, i.e. the merged web-ui bump, not on
// whatever main's HEAD is by now. That commit is verified first: npm has exactly its libraries
// and release tooling, and apps/web-ui there uses them. Needs the full git history and GH_TOKEN.
//
// Usage: node scripts/release/draft-release.mjs
import { $ } from "zx";
import { fail, lernaVersion, summary, verifyPublished, verifyWebUi } from "./lib.mjs";

const target = (await $`git log -1 --format=%H -- apps/web-ui/package-lock.json`).stdout.trim();
await verifyPublished(target);
await verifyWebUi(target);

const version = await lernaVersion(target);
const tag = `v${version}`;
if ((await $({ nothrow: true, quiet: true })`git ls-remote --exit-code --tags origin ${`refs/tags/${tag}`}`).ok) {
  fail(`Tag ${tag} already exists.`);
}
if ((await $({ nothrow: true, quiet: true })`gh release view ${tag}`).ok) {
  fail(`A release for ${tag} already exists (maybe a draft). Publish or delete it first.`);
}

const prerelease = version.includes("-") ? ["--prerelease"] : [];
const url = (await $`gh release create ${tag} --draft --target ${target} --title ${tag} --generate-notes ${prerelease}`).stdout.trim();
await summary(`Draft release: ${url} (tag ${tag} on ${target})`);
console.log(`Review and publish the draft (tag ${tag} on ${target}): ${url}`);

// Creates the draft GitHub Release vX.Y.Z on this commit after checking that npm has exactly
// this commit's libraries and that apps/web-ui uses them. The tag is created when the draft is
// published. Needs the full git history and GH_TOKEN.
//
// Usage: node scripts/release/draft-release.mjs
import { $ } from "zx";
import { fail, lernaVersion, summary, verifyPublished, verifyWebUi } from "./lib.mjs";

await verifyPublished();
await verifyWebUi();

const version = await lernaVersion();
const tag = `v${version}`;
if ((await $({ nothrow: true, quiet: true })`git ls-remote --exit-code --tags origin ${`refs/tags/${tag}`}`).ok) {
  fail(`Tag ${tag} already exists.`);
}
if ((await $({ nothrow: true, quiet: true })`gh release view ${tag}`).ok) {
  fail(`A release for ${tag} already exists (maybe a draft). Publish or delete it first.`);
}

const prerelease = version.includes("-") ? ["--prerelease"] : [];
const url = (await $`gh release create ${tag} --draft --target ${process.env.GITHUB_SHA} --title ${tag} --generate-notes ${prerelease}`).stdout.trim();
await summary(`Draft release: ${url}`);
console.log(`Review and publish the draft: ${url}`);

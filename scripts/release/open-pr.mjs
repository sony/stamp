// Commits the prepared change (apply-version-bump.mjs or bump-web-ui.mjs update) to a new branch and opens a PR.
// Runs in the write-enabled job; needs GH_TOKEN.
//
// Usage: node scripts/release/open-pr.mjs <version-bump|web-ui>
import { $, argv } from "zx";
import { fail, lernaVersion, summary } from "./lib.mjs";

const { GH_TOKEN, GITHUB_REPOSITORY, GITHUB_SERVER_URL, GITHUB_RUN_ID } = process.env;
if (!GH_TOKEN || !GITHUB_REPOSITORY || !GITHUB_SERVER_URL) fail("Run in GitHub Actions with GH_TOKEN set.");
const version = await lernaVersion();
const runUrl = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;

const kinds = {
  "version-bump": {
    branch: `release/v${version}`,
    title: `v${version}`,
    files: [], // already staged by `git apply --index`
    body: [
      `Bump every \`@stamp-lib/*\` package to \`${version}\` (\`lerna version\`, run by ${runUrl}).`,
      "",
      "After merging, run the **npm stage publish** workflow and approve the staged packages on npm.",
    ],
  },
  "web-ui": {
    branch: `release/web-ui-v${version}`,
    title: `chore(web-ui): bump @stamp-lib dependencies to ${version}`,
    files: ["apps/web-ui/package.json", "apps/web-ui/package-lock.json"],
    body: [
      `Update \`apps/web-ui\` to the \`@stamp-lib/*\` ${version} packages (run by ${runUrl}).`,
      "",
      "- All `@stamp-lib/*` dependencies pinned; provenance verified (built from `main` by `npm-stage-publish.yml`)",
      "- `npm audit signatures` and `tsc --noEmit` passed; only `@stamp-lib/*` and newly added lockfile entries changed, each verified against the npm registry",
      "",
      "After merging, run the **release** workflow with `draft-release`.",
    ],
  },
};

const kind = kinds[argv._[0]] ?? fail(`Usage: open-pr.mjs <${Object.keys(kinds).join("|")}>`);
const { branch, title, files, body } = kind;

if (files.length) await $`git add ${files}`;
if ((await $({ nothrow: true })`git diff --cached --quiet`).ok) {
  console.log(`Nothing changed; ${branch} is not needed.`);
  process.exit(0);
}
if ((await $({ nothrow: true, quiet: true })`git ls-remote --exit-code --heads origin ${branch}`).ok) {
  fail(`Branch ${branch} already exists. Merge or close its PR and delete the branch, then re-run.`);
}

await $`git switch -c ${branch}`;
await $`git -c user.name=github-actions[bot] -c user.email=41898282+github-actions[bot]@users.noreply.github.com commit -m ${title}`;
await $`git push ${`https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git`} ${branch}`;

const pr = await $({ nothrow: true })`gh pr create --base main --head ${branch} --title ${title} --body ${body.join("\n")}`;
if (pr.ok) {
  console.log(pr.stdout.trim());
} else {
  // e.g. the repository does not allow GitHub Actions to create pull requests
  const url = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/compare/main...${branch}?expand=1`;
  console.log(`::warning::Could not open the PR automatically. Open it here: ${url}`);
  await summary(`Open the PR: ${url}`);
}

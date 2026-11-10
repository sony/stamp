# Releasing Stamp

Stamp packages (`@stamp-lib/*`) are published to npm from GitHub Actions with
[trusted publishing](https://docs.npmjs.com/trusted-publishers/) and
[staged publishing](https://docs.npmjs.com/staged-publishing/):

- No npm token is stored anywhere. The workflow authenticates to npm with a short-lived OIDC token.
- The workflow can only **stage** packages. A maintainer approves each staged version on npm with 2FA before it becomes public, and CI credentials cannot approve.
- Every package gets an SLSA provenance attestation. The release steps refuse packages that were not built by `.github/workflows/npm-stage-publish.yml` on `main`.

`apps/web-ui` installs the published packages from npm and has its own lockfile, so it can only be bumped after the packages are live. The GitHub Release tag is therefore created last, on the commit that bumps `apps/web-ui`, so the tag always contains matching libraries and web UI.

## Release flow

| Step                                     | Who / where                           | Result                                             |
| ---------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| 1. **release** workflow, `bump-version`  | Actions → Run workflow (on `main`)    | PR bumping all package versions (no tag); merge it |
| 2. **npm stage publish** workflow        | Actions → Run workflow (on `main`)    | All packages staged on npm                         |
| 3. Approve                               | Maintainer, npmjs.com or CLI with 2FA | Packages live on npm                               |
| 4. **release** workflow, `bump-web-ui`   | Actions → Run workflow (on `main`)    | PR bumping `apps/web-ui`; merge it                 |
| 5. **release** workflow, `draft-release` | Actions → Run workflow (on `main`)    | Draft GitHub Release `vX.Y.Z`                      |
| 6. Publish the draft release             | Maintainer, GitHub                    | Tag `vX.Y.Z` created on the web-ui bump commit     |

### 1. Bump versions

Run **release** with step `bump-version` and choose the bump (`patch`, `minor`, `major`, `rc`, `patch-rc`, `minor-rc`, `major-rc`, the same names as the `versionup:*` scripts). It runs `lerna version` in a read-only job. A second job accepts only changes to the version fields and internal `@stamp-lib/*` ranges of `lerna.json`, the root `package-lock.json` and the package manifests, and checks that all packages agree on the new version. Then it opens a PR `vX.Y.Z`. Merge it (see [Merging the bot's PRs](#merging-the-bots-prs)).

`lerna.json` configures `lerna version` to always bump every package (`forcePublish`), skip lifecycle scripts, and not commit, tag or push. The tag is created later from the GitHub Release. Running `npm run versionup:<bump>` locally and opening the PR by hand gives the same result.

### 2. Stage the packages

Run **npm stage publish** from the Actions tab on `main`. It builds and packs everything in one job, then stages the tarballs from a second job (`latest` for `x.y.z`, `rc` for `x.y.z-rc.N`). The stage job checks the tarballs against its own checkout, including the `package.json` inside each one, and its job summary lists the **stage ID** of every package it staged, in dependency order.

Already published versions are skipped. A version can be staged only once, and the CI token cannot list staged versions, so a package that is already staged is reported as "not staged". If an earlier run you started staged it (for example after a partial failure), its stage ID is in that run's summary. Otherwise it was staged by something else: do not approve it, reject it with `npm stage reject <stage-id>` and re-run. The workflow fails if nothing was staged because every package is already published (usually: the version bump PR was not merged yet).

### 3. Approve on npm

Approve **only the stage IDs listed in the job summary of a run you started**, in the listed order (dependencies first), either on npmjs.com (package page → **Staged Packages** → **Approve**) or from the CLI. Anyone with write access to the repository can run a modified copy of the workflow and stage the same version first; such a version has a stage ID that is not in your run's summary.

```sh
npm stage list @stamp-lib/stamp-types   # compare the stage ID with the job summary
npm stage view <stage-id>               # optional: npm stage download <stage-id> to inspect the tarball
npm stage approve <stage-id>
```

### 4. Bump apps/web-ui

Run **release** with `bump-web-ui`. It checks that every package is live, was built from `main` by the stage-publish workflow from a single commit, and that nothing outside `apps/web-ui` and `docs` (sources, build and release tooling) has changed on `main` since. Then a read-only job installs the new versions into `apps/web-ui` and runs `npm audit signatures` and `tsc --noEmit`. The job that opens the PR regenerates `package.json` and `package-lock.json` itself with `npm install --package-lock-only` (package metadata only, no package code runs) and opens the PR only if they are byte-identical to the tested ones. Merge it (see [Merging the bot's PRs](#merging-the-bots-prs)). If the repository does not allow GitHub Actions to create pull requests, the job summary links to a prefilled PR instead.

`apps/web-ui/.npmrc` exempts `@stamp-lib/*` from the 7-day `min-release-age`, so the new packages can be installed right away. Third-party dependencies, including the dependencies of `@stamp-lib/*`, keep the 7-day window.

### 5–6. Create the GitHub Release

After the web-ui PR is merged, run **release** with `draft-release`. The release targets the commit that last changed `apps/web-ui/package-lock.json` (the merged web-ui bump), not `main`'s current HEAD, so later pushes do not end up in the tag. It repeats the npm package checks against that commit and checks that `apps/web-ui` there uses exactly the new version, then creates a draft release with generated notes (marked as pre-release for rc versions). Review and publish it; the tag is created at that point.

### Merging the bot's PRs

The release branches are not protected, so anyone with write access could push extra commits to a bot PR after it was opened. Each bot PR names the single commit it should contain; merge only if the PR's head is exactly that commit, authored by github-actions[bot].

## One-time setup

These steps need an npm maintainer of the `@stamp-lib` packages and someone who can edit the repository's Actions variables.

1. Merge the release workflows into `main`.
2. Set the repository variable **`NPM_RELEASE_ACTORS`** (Settings → Secrets and variables → Actions → Variables) to the comma-separated GitHub logins allowed to run the release workflows. Every job checks it (re-running a single failed job skips the jobs that already passed), and the workflows refuse to run when it is empty. Repository variables cannot be changed with plain write access.
3. Configure trusted publishing (stage-only) for all packages (npm 12, as required by the repository's `devEngines`):

   ```sh
   npm ci --prefix scripts/release
   node scripts/release/setup-npm-trust.mjs --dry-run
   node scripts/release/setup-npm-trust.mjs
   ```

   A new trusted publisher configuration expires if it is not used for a successful publish within 2 days, so do this right before a release (steps 1–3 above). Check the result with `npm trust list <package>`: exactly one trusted publisher per package, for `sony/stamp` and `npm-stage-publish.yml`, stage only.

4. Right away (trusted publishing does not depend on it), on each package's **Settings → Publishing access** on npmjs.com, select **Require two-factor authentication and disallow tokens**. Revoke npm tokens that could publish these packages (npmjs.com → Access Tokens), and check that every maintainer of the packages has 2FA and still needs access.
5. Recommended, needs a repository admin: a ruleset for `main` and `release/*` that blocks direct pushes and force pushes and requires PRs. Without it, writers can push to `main` and to the bot's branches directly; the checks above and the merge rule for bot PRs cover that, but a ruleset closes it.

## Security model

- Dependency code never runs in a job that holds write or OIDC credentials:
  - `npm-stage-publish.yml`: the `build` job (`contents: read`) installs, builds and packs. The `stage` job (`id-token: write`) installs only the release scripts (zx); it downloads the tarballs (the artifact download verifies their digest), requires the version, the set of tarballs and each tarball's `package.json` to match its own checkout, and runs `npm stage publish <tarball>`. A compromised build dependency could still alter the compiled code inside a tarball; that is the residual risk of building with third-party tools.
  - `release.yml` `bump-version` and `bump-web-ui`: the job that installs dependencies and runs lerna/npm is read-only. The job that pushes and opens the PR installs only the release scripts and never takes files from the read-only job as-is. The version bump patch has its file list checked before it is applied, then only the expected JSON field changes are accepted (`scripts/release/apply-version-bump.mjs`). The web-ui manifests are regenerated and compared (`scripts/release/bump-web-ui.mjs update`).
- No dependency cache is used, and lifecycle scripts are disabled (`ignore-scripts=true` in `.npmrc`; `ignoreScripts` for `lerna version`).
- lerna runs with `useNx: false` (its plain task runner: no nx daemon, cache or Nx Cloud).
- Every job starts with the local composite action `.github/actions/release-setup` (referenced with the self-repository syntax `$/`, so it always comes from the running commit). It sets up Node 26 (LTS), installs the release scripts (`scripts/release`, a separate npm project whose only dependency is [zx](https://github.com/google/zx), pinned by its own lockfile), and runs the actor check.
- Release jobs run on Node 26 with the newest npm 12 that is at least 7 days old (`npm install --global npm@12 --min-release-age=7`, matching the repository's `min-release-age`). npm 12 also blocks dependency install scripts unless they are allowed. Actions are pinned by commit SHA.
- npm trusted publishing does not restrict the git ref, so someone with write access could run a modified copy of the workflow from another branch, or stage the next version before you do. That run can still only stage packages, which nobody can install until a maintainer approves them, so approve only stage IDs listed in the summary of a run you started.
- Before tagging, the release steps require all packages to come from one commit on `main` and nothing but `apps/web-ui` and `docs` to have changed since, so a workflow or release script modified for one run on `main` and then reverted is caught.

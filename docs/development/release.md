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

Run **release** with step `bump-version` and choose the bump (`patch`, `minor`, `major`, `rc`, `patch-rc`, `minor-rc`, `major-rc`, the same names as the `versionup:*` scripts). It runs `lerna version` in a read-only job. A second job accepts only changes to the version fields and internal `@stamp-lib/*` ranges of `lerna.json`, the root `package-lock.json` and the package manifests, and checks that all packages agree on the new version. Then it opens a PR `vX.Y.Z`. Merge it.

`lerna.json` configures `lerna version` to always bump every package (`forcePublish`), skip lifecycle scripts, and not commit, tag or push. The tag is created later from the GitHub Release. Running `npm run versionup:<bump>` locally and opening the PR by hand gives the same result.

### 2. Stage the packages

Run **npm stage publish** from the Actions tab on `main`. It builds and packs everything in one job, then stages the tarballs from a second job (`latest` for `x.y.z`, `rc` for `x.y.z-rc.N`). The job summary lists the packages in dependency order.

Already published versions are skipped. A version that is already staged (pending approval) cannot be staged again, and the CI token cannot list staged versions, so after a partial failure a re-run reports those packages as "not staged": approve them, or reject them with `npm stage reject <stage-id>` and re-run to rebuild them. The workflow fails if nothing was staged because every package is already published (usually: the version bump PR was not merged yet).

### 3. Approve on npm

Approve every staged package in the order shown in the job summary (dependencies first), either on npmjs.com (package page → **Staged Packages** → **Approve**) or from the CLI:

```sh
npm stage list @stamp-lib/stamp-types
npm stage view <stage-id>       # optional: npm stage download <stage-id> to inspect the tarball
npm stage approve <stage-id>
```

### 4. Bump apps/web-ui

Run **release** with `bump-web-ui`. It checks that every package is live, was built from `main` by the stage-publish workflow from a single commit, and that the library sources on `main` have not changed since. Then it updates `apps/web-ui`, runs `npm audit signatures` and `tsc --noEmit`, and opens a PR. Only `@stamp-lib/*` dependencies and lockfile entries that are added or belong to `@stamp-lib/*` may change, and each of those entries is checked against the npm registry. If a release also needs other web-ui dependencies updated, the job stops and the bump is done by hand. If the repository does not allow GitHub Actions to create pull requests, the job summary links to a prefilled PR instead.

`apps/web-ui/.npmrc` exempts `@stamp-lib/*` from the 7-day `min-release-age`, so the new packages can be installed right away. Third-party dependencies, including the dependencies of `@stamp-lib/*`, keep the 7-day window.

### 5–6. Create the GitHub Release

After the web-ui PR is merged, run **release** with `draft-release`. It repeats the npm package checks (including that the library sources at this commit are the ones the packages were built from) and checks that `apps/web-ui` uses exactly the new version, then creates a draft release with generated notes (marked as pre-release for rc versions). Review and publish it; the tag is created at that point.

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

   A new trusted publisher configuration expires if it is not used for a successful publish within 2 days, so do this right before a release (steps 1–3 above).

4. After the first release through the workflow, on each package's **Settings → Publishing access** on npmjs.com, select **Require two-factor authentication and disallow tokens**, and delete any npm tokens that could publish these packages. Trusted publishing keeps working with this setting.

## Security model

- Dependency code never runs in a job that holds write or OIDC credentials:
  - `npm-stage-publish.yml`: the `build` job (`contents: read`) installs, builds and packs. The `stage` job (`id-token: write`) installs only the release scripts (zx); it downloads the tarballs (the artifact download verifies their digest) and runs `npm stage publish <tarball>`.
  - `release.yml` `bump-version` and `bump-web-ui`: the job that installs dependencies and runs lerna/npm is read-only. The job that pushes and opens the PR installs only the release scripts. It checks the file list before applying anything, then accepts only the expected JSON field changes (`scripts/release/apply-changes.mjs`).
- No dependency cache is used, and lifecycle scripts are disabled (`ignore-scripts=true` in `.npmrc`; `ignoreScripts` for `lerna version`).
- lerna runs with `useNx: false` (its plain task runner: no nx daemon, cache or Nx Cloud).
- Every job starts with the local composite action `.github/actions/release-setup` (referenced with the self-repository syntax `$/`, so it always comes from the running commit). It sets up Node 26 (LTS), installs the release scripts (`scripts/release`, a separate npm project whose only dependency is [zx](https://github.com/google/zx), pinned by its own lockfile), and runs the actor check.
- Release jobs run on Node 26 with the newest npm 12 that is at least 7 days old (`npm install --global npm@12 --min-release-age=7`, matching the repository's `min-release-age`). npm 12 also blocks dependency install scripts unless they are allowed. Actions are pinned by commit SHA.
- npm trusted publishing does not restrict the git ref, so someone with write access could run a modified copy of the workflow from another branch. That run can still only stage packages, which nobody can install until a maintainer approves them. Only approve versions staged by a workflow run you started yourself.

# Releasing Stamp

Stamp packages (`@stamp-lib/*`) are published to npm from GitHub Actions with
[trusted publishing](https://docs.npmjs.com/trusted-publishers/) and
[staged publishing](https://docs.npmjs.com/staged-publishing/):

- No npm token is stored anywhere. The workflow authenticates to npm with a short-lived OIDC token.
- The workflow can only **stage** packages. A maintainer approves each staged version on npm with 2FA before it becomes public, and CI credentials cannot approve.
- Every package gets an SLSA provenance attestation. The release steps refuse packages that were not built by `.github/workflows/npm-stage-publish.yml` on `main`.

`apps/web-ui` installs the published packages from npm and has its own lockfile, so it can only be bumped after the packages are live. The GitHub Release tag is therefore created last, on the commit that bumps `apps/web-ui`, so the tag always contains matching libraries and web UI.

## Release flow

| Step                                     | Who / where                           | Result                                                      |
| ---------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| 1. Version bump PR                       | Maintainer, locally                   | `lerna.json` and package versions bumped on `main` (no tag) |
| 2. **npm stage publish** workflow        | Actions → Run workflow (on `main`)    | All packages staged on npm                                  |
| 3. Approve                               | Maintainer, npmjs.com or CLI with 2FA | Packages live on npm                                        |
| 4. **release** workflow, `bump-web-ui`   | Actions → Run workflow (on `main`)    | PR bumping `apps/web-ui`; merge it                          |
| 5. **release** workflow, `draft-release` | Actions → Run workflow (on `main`)    | Draft GitHub Release `vX.Y.Z`                               |
| 6. Publish the draft release             | Maintainer, GitHub                    | Tag `vX.Y.Z` created on the web-ui bump commit              |

### 1. Bump versions

```sh
git switch -c release/vX.Y.Z origin/main
npm run versionup:minor   # or :patch, :major, :rc, :patch-rc, :minor-rc, :major-rc
git commit -am "vX.Y.Z"
```

`lerna version` is configured not to commit, tag or push (`lerna.json`). Open a PR and merge it.

### 2. Stage the packages

Run **npm stage publish** from the Actions tab on `main`. It builds everything and runs `npm stage publish` for each package (`latest` for `x.y.z`, `rc` for `x.y.z-rc.N`). The job summary lists the packages in dependency order.

Already published versions are skipped, so the workflow can be re-run after a partial failure. A version that is already staged cannot be staged again: reject it first with `npm stage reject <stage-id>` if it needs to be rebuilt.

### 3. Approve on npm

Approve every staged package in the order shown in the job summary (dependencies first), either on npmjs.com (package page → **Staged Packages** → **Approve**) or from the CLI:

```sh
npm stage list @stamp-lib/stamp-types
npm stage view <stage-id>       # optional: npm stage download <stage-id> to inspect the tarball
npm stage approve <stage-id>
```

### 4. Bump apps/web-ui

Run **release** with `bump-web-ui`. It checks that every package is live and was built from `main` by the stage-publish workflow, updates `apps/web-ui` to the new version, runs `npm audit signatures` and the build, and opens a PR. If the repository does not allow GitHub Actions to create pull requests, the job summary links to a prefilled PR instead.

`apps/web-ui/.npmrc` exempts `@stamp-lib/*` from the 7-day `min-release-age`, so the new packages can be installed right away. Third-party dependencies, including the dependencies of `@stamp-lib/*`, keep the 7-day window.

### 5–6. Create the GitHub Release

After the web-ui PR is merged, run **release** with `draft-release`. It verifies the npm packages and that `apps/web-ui` uses exactly the new version, then creates a draft release with generated notes (marked as pre-release for rc versions). Review and publish it; the tag is created at that point.

## One-time setup

These steps need an npm maintainer of the `@stamp-lib` packages and someone who can edit the repository's Actions variables.

1. Merge the release workflows into `main`.
2. Set the repository variable **`NPM_RELEASE_ACTORS`** (Settings → Secrets and variables → Actions → Variables) to the comma-separated GitHub logins allowed to run the release workflows. The workflows refuse to run when it is empty. Repository variables cannot be changed with plain write access.
3. Configure trusted publishing (stage-only) for all packages, using npm >= 11.15.0:

   ```sh
   scripts/release/setup-npm-trust.sh --dry-run
   scripts/release/setup-npm-trust.sh
   ```

   A new trusted publisher configuration expires if it is not used for a successful publish within 2 days, so do this right before a release (steps 1–3 above).

4. After the first release through the workflow, on each package's **Settings → Publishing access** on npmjs.com, select **Require two-factor authentication and disallow tokens**, and delete any npm tokens that could publish these packages. Trusted publishing keeps working with this setting.

## Security model

- `npm-stage-publish.yml` has `id-token: write` and `contents: read` only. It does not use a dependency cache, and dependency lifecycle scripts are disabled (`ignore-scripts=true` in `.npmrc`).
- The npm CLI used by the release jobs is pinned by version and tarball integrity (`scripts/release/install-npm.sh`). Actions are pinned by commit SHA.
- npm trusted publishing does not restrict the git ref, so someone with write access could run a modified copy of the workflow from another branch. That run can still only stage packages, which nobody can install until a maintainer approves them. Only approve versions staged by a workflow run you started yourself.

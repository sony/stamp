## catalogs/iam-role/

### How to setup

Deploy [cf-db-template.yaml (catalogs/iam-role)](./cf-db-template.yaml) to CloudFormation

### Running tests

This catalog ships two kinds of tests:

1. **Pure unit tests** — no AWS access required. They exercise config parsing,
   IAM role name building, and resource-output shaping.
2. **Integration / end-to-end tests** — require real AWS resources (DynamoDB
   tables provisioned via `cf-db-template.yaml`, the IAM Role Factory
   provisioned via `cf-iam-role-factory-template.yaml`) and AWS credentials.

#### Unit tests only (no AWS)

```bash
cd catalogs/iam-role
npm ci

# Run just the AWS-free unit tests
npx vitest run \
  src/config.test.ts \
  src/events/resource/gitHubIamRole.unit.test.ts \
  src/handlers/gitHubIamRoleResource.unit.test.ts
```

#### Full test suite (requires AWS)

Before running, set these environment variables and provide AWS credentials
(via `AWS_PROFILE`, `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, or any other
standard AWS SDK credential source):

| Variable | Description |
| --- | --- |
| `AWS_ACCOUNT_ID` | Target AWS account ID used by the tests |
| `IAM_ROLE_FACTORY_AWS_ACCOUNT_ID` | Account hosting the IAM Role Factory |
| `IAM_ROLE_DYNAMO_TABLE_PREFIX` | Prefix used in `cf-db-template.yaml` deployment (table names become `${prefix}-iam-role-XxxResource`) |
| `GITHUB_ORG_NAME` | A GitHub Organization name fixture tests can use |
| `GITHUB_IAM_ROLE_ATTACHED_POLICY_ARN` | ARN of a managed policy that integration tests can attach |
| `JUMP_IAM_ROLE_ATTACHED_POLICY_ARN` | ARN of a managed policy used by `jump-iam-role` tests |
| `ORIGIN_IAM_ROLE_ARN` | ARN of an IAM role used as the trust origin in `jump-iam-role` tests |

GitHub organization / repository IDs are fixed fixtures inside the tests (IAM
and DynamoDB never validate the sub-claim contents against GitHub), so no
additional environment variables are needed for the immutable-claims support.

Then run:

```bash
cd catalogs/iam-role
npm ci

# Build once (some tests rely on the compiled output)
npm run build

# Run the entire suite
npm test

# Or run a specific file
npx vitest run src/handlers/gitHubIamRoleResource.test.ts
```

The integration tests create and tear down real AWS resources (IAM roles,
DynamoDB items). Make sure the AWS account is dedicated to testing and that
the configured role-name / policy-name prefixes do not collide with anything
in use.

**Serial execution is required and enforced by `vitest.config.ts`**
(`fileParallelism: false`). Several integration tests across files share
the same IAM role names (e.g. `<roleNamePrefix>-github-<org>-<repo>`) to
exercise realistic create/delete/audit flows; running test files in
parallel would race on those AWS resources and produce intermittent
`EntityAlreadyExists` / `NoSuchEntity` failures. The same config also
bumps `hookTimeout` to 120s because `beforeAll` / `afterAll` perform
multiple sequential AWS calls.

If a previous test run was killed mid-flight you may also have orphaned
IAM roles (matching `<roleNamePrefix>-github-*` and
`<roleNamePrefix>-jump-*`). Delete them manually once before re-running
the suite.

### Configuration

The catalog is configured via `createIamRoleCatalog(config)`.

#### GitHub Organizations (multi-org support)

A `github-iam-role` resource is always associated with a single GitHub
Organization. To prevent typos from creating an IAM role whose trust policy
trusts an unintended organization, this catalog **does not** accept free-form
organization names from users. Instead, the catalog configuration declares an
allow-list of organizations, and at resource creation time the user must pick
one of them.

##### `gitHubOrgs`

Each allow-list entry pairs the organization name with its **immutable numeric
organization ID** (as a decimal string). The ID is embedded in the OIDC trust
policy (see below). Obtain it with:

```bash
curl -s https://api.github.com/orgs/my-org | jq .id
```

```ts
createIamRoleCatalog({
  // ...other fields...
  gitHubOrgs: [
    { name: "my-org", id: "1234567" },
    { name: "my-other-org", id: "7654321" },
  ],
});
```

When a user creates a `github-iam-role` resource they provide:

| param | required | description |
| --- | --- | --- |
| `gitHubOrgName` | ✓ | Must be one of the configured `gitHubOrgs` names. |
| `repositoryName` | ✓ | Bare repository name (without org prefix). |
| `repositoryId` | ✓ | Immutable numeric repository ID: `curl -s https://api.github.com/repos/{owner}/{repo} \| jq .id` |
| `roleSuffix` | – | 1-32 chars (`[a-zA-Z0-9-]`, must start/end alphanumeric). Distinguishes multiple IAM roles for the same repository. |
| `subjectType` | – | Scope of the OIDC sub condition: `repository` (default), `branch`, `environment`, `tag`, or `pull_request`. |
| `subjectValue` | – | Branch / environment / tag name. Required for `branch` / `environment` / `tag`, must be empty otherwise. Max 256 chars; wildcard characters (`*`, `?`) are rejected because the condition uses `StringLike`. |

#### Subject scoping rules

| `subjectType` | trust policy sub condition | typical use |
| --- | --- | --- |
| `repository` (default) | `repo:ORG@ORG_ID/REPO@REPO_ID:*` | any workflow in the repository |
| `branch` | `repo:ORG@ORG_ID/REPO@REPO_ID:ref:refs/heads/<subjectValue>` | push/deploy from a specific branch |
| `tag` | `repo:ORG@ORG_ID/REPO@REPO_ID:ref:refs/tags/<subjectValue>` | release workflows triggered by a tag |
| `environment` | `repo:ORG@ORG_ID/REPO@REPO_ID:environment:<subjectValue>` | jobs bound to a GitHub environment (recommended for production deploys) |
| `pull_request` | `repo:ORG@ORG_ID/REPO@REPO_ID:pull_request` | pull-request-triggered workflows |

Combine `subjectType` with `roleSuffix` to give one repository multiple roles
with different scopes (e.g. a repo-wide read role and an
environment-restricted deploy role).

#### Immutable OIDC subject claims

GitHub [changed the OIDC token `sub` claim](https://github.blog/changelog/2026-04-23-immutable-subject-claims-for-github-actions-oidc-tokens/)
to embed immutable numeric IDs: `repo:ORG@ORG_ID/REPO@REPO_ID:ref:...`.
Since **2026-07-15**, all newly created, renamed, or transferred repositories
on github.com emit this format unconditionally; pre-existing repositories keep
the legacy `repo:ORG/REPO:...` format unless opted in.

This catalog writes trust policies that match **only the new format**:

```json
"Condition": {
  "StringLike": {
    "token.actions.githubusercontent.com:sub": "repo:my-org@1234567/my-repo@9876543:*"
  }
}
```

Consequences:

- **Tokens from repositories still on the legacy format will NOT match roles
  created by this catalog.** The repository must be opted in to immutable
  subject claims (or be newly created / renamed after 2026-07-15).
- **Roles created before this feature keep their legacy-format trust policy
  and are not migrated.** A trust policy is written once at role creation and
  never updated (`updateResource` is not implemented). To migrate an existing
  role, delete the resource and recreate it with `repositoryId`. If you omit
  `roleSuffix`, the recreated IAM role has the **same role name and ARN**, so
  GitHub workflow definitions referencing the ARN do not need to change.
- **A wrong `repositoryId` fails closed**: the catalog does not call the
  GitHub API to verify the ID, so a typo produces a role that can never be
  assumed (no token will carry that org/repo/ID combination). Delete and
  recreate with the correct ID.

#### Multiple roles per repository (`roleSuffix`)

Passing `roleSuffix` creates an additional, independent IAM role for a
repository:

- IAM role name: `${roleNamePrefix}-github-${org}-${repo}-${roleSuffix}`
- resourceId / display name: `${org}/${repo}/${roleSuffix}`

Omitting `roleSuffix` keeps the original single-role naming, which preserves
role names/ARNs across delete-and-recreate migrations.

### Behavior notes

- IAM role name format remains `${roleNamePrefix}-github-${gitHubOrgName}-${repositoryName}`
  (with `-${roleSuffix}` appended when given). The 64-character IAM role name
  limit still applies and the suffix counts toward it; pick shorter
  `roleNamePrefix` / repo names / suffixes when on-boarding orgs with long names.
- New resources use a compound `resourceId` of the form
  `${gitHubOrgName}/${repositoryName}` (or `${gitHubOrgName}/${repositoryName}/${roleSuffix}`)
  so that the same repository name can be on-boarded under different orgs and
  multiple roles can exist per repository. Resources created before
  multi-org support keep their bare `${repositoryName}` resourceId; all forms are
  resolved correctly by `getResource` / `deleteResource` / promote requests.
- DynamoDB schema (`cf-db-template.yaml`) is unchanged. New attributes
  (`gitHubRepositoryName`, `gitHubOrgName`, `gitHubRepositoryId`, `gitHubOrgId`,
  `roleSuffix`, `subjectType`, `subjectValue`, `subject`) are written to newly created records;
  legacy records without those attributes are still readable. The persisted
  `subject` records the exact sub condition written to the trust policy for
  auditability. Record creation now uses a conditional put
  (`attribute_not_exists`) so a concurrent duplicate create fails instead of
  silently overwriting.
  Note that legacy records expose `gitHubOrgName` as `undefined` (the org cannot
  be safely inferred — a silent fallback could mislead operators), so consumers
  must handle the missing value. The bare `repositoryName` for legacy records is
  derived exactly from the DynamoDB primary key.
- List/search by name prefix matches against both the legacy bare
  `repositoryName` and the new `gitHubRepositoryName` attribute, so typing a
  repository name finds resources regardless of whether they were created
  before or after the multi-org migration.
- The user-visible `name` of a multi-org resource is `${gitHubOrgName}/${repositoryName}`
  so identically named repositories under different orgs remain
  distinguishable in selectors. Legacy single-org records keep their bare
  repository name as the display name.

### Caveats

- The current `ResourceCreateParam` schema in `@stamp-lib/stamp-types` only
  supports primitive types (no `enum`), so the web UI still presents
  `gitHubOrgName` / `subjectType` as free-text inputs. The catalog handler
  validates the values server-side (org against `gitHubOrgs`, `repositoryId`
  as a numeric string, `roleSuffix` charset, `subjectType` enum) and rejects
  anything invalid — but UX could be improved by promoting
  `ResourceCreateParam` to support enum selection (out of scope for
  this catalog).
- Because new resourceIds contain a `/`, anywhere the resourceId is
  embedded in a URL must URL-encode it (`encodeURIComponent`). The Stamp
  web-ui does this already, but custom integrations should be aware.



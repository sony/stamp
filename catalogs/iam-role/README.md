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

##### `gitHubOrgNames`

```ts
createIamRoleCatalog({
  // ...other fields...
  gitHubOrgNames: ["my-org", "my-other-org"],
});
```

When a user creates a `github-iam-role` resource they choose `gitHubOrgName`
(required) and `repositoryName`. The handler rejects any value not in
`gitHubOrgNames`.

### Behavior notes

- IAM role name format remains `${roleNamePrefix}-github-${gitHubOrgName}-${repositoryName}`
  (the org name is taken from the per-resource choice, not from a single
  config field). The 64-character IAM role name limit still applies; pick
  shorter `roleNamePrefix` / repo names when on-boarding orgs with long names.
- New resources created under multi-org support use a compound `resourceId` of
  the form `${gitHubOrgName}/${repositoryName}` so that the same repository
  name can be on-boarded under different orgs. Resources created before
  multi-org support keep their bare `${repositoryName}` resourceId; both are
  resolved correctly by `getResource` / `deleteResource` / promote requests.
- DynamoDB schema (`cf-db-template.yaml`) is unchanged. New attributes
  (`gitHubRepositoryName`, `gitHubOrgName`) are written to records created with
  multi-org support; legacy records without those attributes are still readable.
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
  `gitHubOrgName` as a free-text input. The catalog handler validates the
  value against `gitHubOrgNames` server-side and rejects anything not on the
  allow-list, so the allow-list is enforced — but UX could be improved by
  promoting `ResourceCreateParam` to support enum selection (out of scope for
  this catalog).
- Because new resourceIds contain a `/`, anywhere the resourceId is
  embedded in a URL must URL-encode it (`encodeURIComponent`). The Stamp
  web-ui does this already, but custom integrations should be aware.



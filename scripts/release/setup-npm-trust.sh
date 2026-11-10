#!/usr/bin/env bash
# Configures npm trusted publishing for every publishable @stamp-lib package:
#   GitHub Actions, sony/stamp, .github/workflows/npm-stage-publish.yml, `npm stage publish` only.
#
# Run locally as an npm maintainer of the packages with 2FA enabled. The repository's
# devEngines already requires npm 12. The first call asks for 2FA; choose "skip two-factor
# authentication for the next 5 minutes" on the npm website so the rest go through.
#
# A new trusted publisher configuration expires if it is not used for a successful
# publish within 2 days, so run the "npm stage publish" workflow right after this.
#
# Usage: scripts/release/setup-npm-trust.sh [--dry-run]
set -euo pipefail

cd "$(dirname "$0")/../.."

failed=()
while IFS= read -r name; do
  echo "==> ${name}"
  if ! npm trust github "${name}" --repo sony/stamp --file npm-stage-publish.yml --allow-stage-publish --yes "$@"; then
    failed+=("${name}")
    npm trust list "${name}" >&2 || true
  fi
  sleep 2 # avoid registry rate limiting, as recommended by `npm help trust`
done < <(node --input-type=module -e '
  import { publishablePackages } from "./scripts/release/packages.mjs";
  for (const p of publishablePackages()) console.log(p.name);
')

if ((${#failed[@]} > 0)); then
  echo "Failed for: ${failed[*]}" >&2
  echo "A package can have only one trusted publisher; remove an old one with 'npm trust revoke <package> --id <id>' and re-run." >&2
  exit 1
fi

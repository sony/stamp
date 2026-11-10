#!/usr/bin/env bash
# Configures npm trusted publishing for every publishable @stamp-lib package:
#   GitHub Actions, sony/stamp, .github/workflows/npm-stage-publish.yml, `npm stage publish` only.
#
# Run locally as an npm maintainer of the packages (npm >= 11.15.0, 2FA enabled).
# The first call asks for 2FA; choose "skip two-factor authentication for the next 5 minutes"
# on the npm website so the remaining packages go through without a prompt each.
#
# A new trusted publisher configuration expires if it is not used for a successful
# publish within 2 days, so run the "npm stage publish" workflow right after this.
#
# Usage: scripts/release/setup-npm-trust.sh [--dry-run]
set -euo pipefail

cd "$(dirname "$0")/../.."

extra_args=()
if [[ "${1:-}" == "--dry-run" ]]; then
  extra_args+=(--dry-run)
fi

npm_major_minor=$(npm --version | awk -F. '{ printf "%d%03d", $1, $2 }')
if (( npm_major_minor < 11015 )); then
  echo "npm >= 11.15.0 is required (found $(npm --version))." >&2
  exit 1
fi

failed=()
while IFS= read -r name; do
  echo "==> ${name}"
  if npm trust github "${name}" \
    --repo sony/stamp \
    --file npm-stage-publish.yml \
    --allow-stage-publish \
    --yes ${extra_args[@]+"${extra_args[@]}"}; then
    :
  else
    failed+=("${name}")
    echo "    Failed. Current configuration:" >&2
    npm trust list "${name}" >&2 || true
  fi
  sleep 2
done < <(node --input-type=module -e '
  import { publishablePackages } from "./scripts/release/packages.mjs";
  for (const p of publishablePackages()) console.log(p.name);
')

if (( ${#failed[@]} > 0 )); then
  echo >&2
  echo "Failed for: ${failed[*]}" >&2
  echo "A package can only have one trusted publisher. If an old one exists, remove it with" >&2
  echo "  npm trust list <package> && npm trust revoke <package> --id <id>" >&2
  echo "and run this script again." >&2
  exit 1
fi

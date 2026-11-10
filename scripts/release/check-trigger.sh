#!/usr/bin/env bash
# Guards the release workflows: they must run on main, triggered by a login listed in
# the repository variable NPM_RELEASE_ACTORS (comma-separated). Repository variables
# cannot be changed with plain write access, so this limits who can start a release.
#
# Expects: GITHUB_REF, ACTOR (github.triggering_actor), ALLOWED_ACTORS (vars.NPM_RELEASE_ACTORS)
set -euo pipefail

if [[ "${GITHUB_REF}" != "refs/heads/main" ]]; then
  echo "::error::Run this workflow on main (got ${GITHUB_REF})."
  exit 1
fi

if [[ -z "${ALLOWED_ACTORS:-}" ]]; then
  echo "::error::Set the repository variable NPM_RELEASE_ACTORS (comma-separated GitHub logins allowed to release)."
  exit 1
fi

IFS=',' read -ra allowed <<< "${ALLOWED_ACTORS}"
for login in "${allowed[@]}"; do
  login="${login//[[:space:]]/}"
  if [[ -n "${login}" && "${login}" == "${ACTOR}" ]]; then
    exit 0
  fi
done

echo "::error::${ACTOR} is not listed in NPM_RELEASE_ACTORS."
exit 1

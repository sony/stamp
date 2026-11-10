#!/usr/bin/env bash
# Installs a pinned npm CLI for the release jobs, verified against a pinned tarball
# integrity, so a tampered registry response cannot replace the CLI that publishes.
#
# npm >= 11.15.0 is needed for `npm stage publish`, >= 11.17.0 for min-release-age-exclude.
# To update: pick a version older than the 7-day min-release-age, then
#   npm view npm@<version> dist.integrity
set -euo pipefail

NPM_VERSION="11.21.1"
NPM_INTEGRITY="sha512-YTzL6QBEJXyHcTu0JiUc7RKMp+mzlJtl7rGLmERaXUQeFHIMc9atdr6G9M9C8vDWbv40epoTQAzNL2/PtZVDhQ=="

workdir="$(mktemp -d)"
trap 'rm -rf "${workdir}"' EXIT

tarball="${workdir}/npm-${NPM_VERSION}.tgz"
curl --fail --silent --show-error --location --proto '=https' \
  --output "${tarball}" "https://registry.npmjs.org/npm/-/npm-${NPM_VERSION}.tgz"

actual="sha512-$(openssl dgst -sha512 -binary "${tarball}" | openssl base64 -A)"
if [[ "${actual}" != "${NPM_INTEGRITY}" ]]; then
  echo "::error::npm ${NPM_VERSION} tarball integrity mismatch (got ${actual})."
  exit 1
fi

npm install --global --ignore-scripts "${tarball}"
echo "npm $(npm --version)"

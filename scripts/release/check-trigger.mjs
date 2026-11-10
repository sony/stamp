// Guards every release job: it must run on main, triggered by a login listed in the
// repository variable NPM_RELEASE_ACTORS (comma-separated). Repository variables cannot be
// changed with plain write access, so this limits who can start (or re-run) a release.
//
// Env: GITHUB_REF, ACTOR (github.triggering_actor), ALLOWED_ACTORS (vars.NPM_RELEASE_ACTORS)
import { fail } from "./lib.mjs";

const { GITHUB_REF, ACTOR, ALLOWED_ACTORS = "" } = process.env;
const allowed = ALLOWED_ACTORS.split(",")
  .map((login) => login.trim())
  .filter(Boolean);

if (GITHUB_REF !== "refs/heads/main") fail(`Run this workflow on main (got ${GITHUB_REF}).`);
if (allowed.length === 0) fail("Set the repository variable NPM_RELEASE_ACTORS (comma-separated GitHub logins allowed to release).");
if (!allowed.includes(ACTOR)) fail(`${ACTOR} is not listed in NPM_RELEASE_ACTORS.`);

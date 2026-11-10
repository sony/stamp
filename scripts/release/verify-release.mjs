// CLI for verifyRelease(): prints the release version, or fails with the reasons it is not releasable.
import { verifyRelease } from "./packages.mjs";

console.log(verifyRelease().version);

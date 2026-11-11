// Build-job half of npm-stage-publish.yml (runs WITHOUT id-token permission).
// Verifies the packages are ready to release, packs them, and writes
// <out-dir>/manifest.json listing the packages in dependency order for stage.mjs.
//
// Usage: node scripts/release/pack.mjs <out-dir>
import { $, argv, fs, path } from "zx";
import { fail, verifyRelease } from "./lib.mjs";

const outDir = path.resolve(argv._[0] ?? fail("Usage: pack.mjs <out-dir>"));
const { version, distTag } = await verifyRelease();

// Dependency order (dependencies first), which is also the order to approve them in.
const ordered = JSON.parse((await $`npx --no-install lerna list --toposort --json --loglevel silent`).stdout);
const workspaces = ordered.flatMap((p) => ["--workspace", p.name]);

await fs.ensureDir(outDir);
const packed = JSON.parse((await $`npm pack --json --pack-destination ${outDir} ${workspaces}`).stdout);

const packages = ordered.map(({ name }) => ({ name, file: packed[name].filename }));
await fs.writeJson(path.join(outDir, "manifest.json"), { version, distTag, packages }, { spaces: 2 });
console.log(packages.map((p) => p.file).join("\n"));

import { execSync } from "child_process";

// Define package names with their corresponding paths
const packages: { [pkgName: string]: string } = {
  "@stamp-lib/stamp-config": "../../packages/config",
  "@stamp-lib/stamp-ephemeral-db-plugin": "../../plugins/ephemeral-db",
  "@stamp-lib/stamp-ephemeral-identity-plugin": "../../plugins/ephemeral-identity",
  "@stamp-lib/stamp-example-catalog": "../../catalogs/example",
  "@stamp-lib/stamp-hub": "../../packages/hub",
  "@stamp-lib/stamp-iam-idc-catalog": "../../catalogs/iam-idc",
  "@stamp-lib/stamp-iam-role-catalog": "../../catalogs/iam-role",
  "@stamp-lib/stamp-logger": "../../packages/logger",
  "@stamp-lib/stamp-plugin-router": "../../packages/plugin-router",
  "@stamp-lib/stamp-slack-plugin": "../../plugins/slack",
  "@stamp-lib/stamp-types": "../../packages/types",
};

// Link local packages
Object.entries(packages).forEach(([pkgName, pkgPath]) => {
  try {
    console.log(`Linking ${pkgName} from ${pkgPath}`);
    execSync(`cd ${pkgPath} && npm link`, { stdio: "inherit" });
    execSync(`npm link ${pkgName}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to link package ${pkgName} from ${pkgPath}:`, error);
    process.exit(1);
  }
});

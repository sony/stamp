import { execSync } from "child_process";

// Define package names with their corresponding paths
const packages: { [pkgName: string]: string } = {
  "@stamp-lib/stamp-config": "../../packages/config",
  "@stamp-lib/stamp-ephemeral-db-plugin": "../../plugins/ephemeral-db",
  "@stamp-lib/stamp-ephemeral-identity-plugin": "../../plugins/ephemeral-identity",
  "@stamp-lib/stamp-dynamodb-db-plugin": "../../plugins/dynamodb-db",
  "@stamp-lib/stamp-dynamodb-identity-plugin": "../../plugins/dynamodb-identity",
  "@stamp-lib/stamp-example-catalog": "../../catalogs/example",
  "@stamp-lib/stamp-hub": "../../packages/hub",
  "@stamp-lib/stamp-iam-idc-catalog": "../../catalogs/iam-idc",
  "@stamp-lib/stamp-iam-role-catalog": "../../catalogs/iam-role",
  "@stamp-lib/stamp-logger": "../../packages/logger",
  "@stamp-lib/stamp-plugin-router": "../../packages/plugin-router",
  "@stamp-lib/stamp-slack-plugin": "../../plugins/slack",
  "@stamp-lib/stamp-types": "../../packages/types",
};

// Link local packages individually
Object.entries(packages).forEach(([pkgName, pkgPath]) => {
  try {
    console.log(`Linking ${pkgName} from ${pkgPath}`);
    execSync(`cd ${pkgPath} && npm link`, { stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to link package ${pkgName} from ${pkgPath}:`, error);
    process.exit(1);
  }
});

// Link all packages at once to the current project
try {
  const allPackageNames = Object.keys(packages).join(" ");
  console.log(`Linking all packages to current project: ${allPackageNames}`);
  execSync(`npm link ${allPackageNames}`, { stdio: "inherit" });
} catch (error) {
  console.error("Failed to link all packages to current project:", error);
  process.exit(1);
}

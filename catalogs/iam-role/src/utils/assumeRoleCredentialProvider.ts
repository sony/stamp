import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
export const assumeRoleCredentialProvider = (roleArn: string, region: string) => {
  return fromTemporaryCredentials({
    params: {
      RoleArn: roleArn,
      RoleSessionName: "stamp-iam-role",
      DurationSeconds: 3600,
    },
    clientConfig: {
      region,
    },
  });
};

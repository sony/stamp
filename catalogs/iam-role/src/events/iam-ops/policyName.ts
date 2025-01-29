export function generatePolicyName(prefixPolicyName: string, targetAWSAccountId: string, targetRoleName: string): string {
  // IAM Role Name maximum length is 64 and PolicyName maximum length of 128. So policyName is not over maximum length.
  const policyName = `${prefixPolicyName}-StampAssumeRolePolicy-${targetAWSAccountId}-${targetRoleName}`;
  return policyName;
}

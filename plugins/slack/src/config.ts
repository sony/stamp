import z from "zod";
export const SlackPluginConfig = z.object({
  slackSigningSecret: z.string(),
  slackBotToken: z.string(),
  slackVerificationToken: z.string(),
  slackClientId: z.string(),
  slackClientSecret: z.string(),
  hostDomain: z.string(),
  basePath: z.string(),
  stampHubUrl: z.string(),
  logLevel: z.enum(["FATAL", "ERROR", "WARN", "INFO", "DEBUG"]).default("INFO"),
  dynamoDBTableNamePrefix: z.string(),
  dynamoDBTableCategoryName: z.string().default("slack"),
  region: z.string(),
  workSpaceId: z.string().optional(), // for multi-workspace support. If you want to use the multiple workspaces, you need to set the workSpaceID
  workSpaceName: z.string().optional(), // for multi-workspace support. If you want to use the multiple workspaces, you need to set the workSpaceName
});
export type SlackPluginConfigInput = z.input<typeof SlackPluginConfig>;
export type SlackPluginConfig = z.output<typeof SlackPluginConfig>;

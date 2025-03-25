## plugins - slack

### How to setup

1. Replace `<Stamp domain>` with your Stamp domain in [manifest](./manifest.yml).
2. Create a Slack App using the [manifest](./manifest.yml) and install it to your workspace: [Slack Manifest Documentation](https://api.slack.com/reference/manifests)
3. Deploy [cf-template.yaml (slack)](./cf-template.yaml) to CloudFormation

### How to use multiple workspaces

If you want to use multiple workspaces, you can create multiple instances of the Slack plugin.

- Each instance should have a different `basePath`, `workspaceId` and `workspaceName` in the configuration.
- `dynamoDBTableNamePrefix` should be the same for all instances.
- You need create a Slack App for each workspace and set the `slackSigningSecret`, `slackBotToken`, `slackVerificationToken`, `slackClientId`, `slackClientSecret` for each workspace.

```ts
const slackPluginForWorkspaceA = await createSlackPlugin({
  slackSigningSecret: "XXXXX",
  slackBotToken: "XXXXX",
  slackVerificationToken: "XXXXX",
  slackClientId: "XXXXX",
  slackClientSecret: "XXXXX",
  hostDomain: "example.com",
  stampHubUrl: "http://localhost:4000",
  dynamoDBTableNamePrefix: "XXXXX",
  region: "us-west-2",
  logLevel: "INFO",
  basePath: "/plugin/slack-workspace-a", // Set For each workspace. Format is `/plugin/slack-<workspaceId>`.
  workspaceId: "workspace-a", // Set For each workspace
  workspaceName: "Workspace A", // Set For each workspace
});

const slackPluginForWorkspaceB = await createSlackPlugin({
  slackSigningSecret: "XXXXX",
  slackBotToken: "XXXXX",
  slackVerificationToken: "XXXXX",
  slackClientId: "XXXXX",
  slackClientSecret: "XXXXX",
  hostDomain: "example.com",
  stampHubUrl: "http://localhost:4000",
  dynamoDBTableNamePrefix: "XXXXX",
  region: "us-west-2",
  logLevel: "INFO",
  basePath: "/plugin/slack-workspace-b", // Set For each workspace. Format is `/plugin/slack-<workspaceId>`
  workspaceId: "workspace-b", // Set For each workspace
  workspaceName: "Workspace B", // Set For each workspace
});

const config = await createConfigProvider({
  catalogs: [
    // Add your catalog config here
  ],
  notificationPlugins: [slackPluginForWorkspaceA.notificationPluginConfig
      , slackPluginForWorkspaceB.notificationPluginConfig],
  ],
});

const pluginRouter = createPluginRouter({
  basePath: "/plugin",
  plugins: {
    // For each workspace, the plugin key should be `slack-<workspaceId>`
    "slack-workspace-a": slackPluginForWorkspaceA.router,
    "slack-workspace-b": slackPluginForWorkspaceB.router,
    // Add other plugins here
  },
});
```

### How to execute test

1. Set environment variables

   ```bash
   export SLACK_BOT_TOKEN=<Slack bot token>
   export SLACK_CHANNEL_ID=<Slack channel ID>
   export TABLE_NAME_PREFIX=<TableNamePrefix you specified in CloudFormation template>
   ```

2. Execute command

   ```bash
   plugins/slack % npm run test
   ```

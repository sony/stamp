## plugins - slack

### How to setup

1. Replace `<Stamp domain>` with your Stamp domain in [manifest](./manifest.yml).
2. Create a Slack App using the [manifest](./manifest.yml) and install it to your workspace: [Slack Manifest Documentation](https://api.slack.com/reference/manifests)
3. Deploy [cf-template.yaml (slack)](./cf-template.yaml) to CloudFormation

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

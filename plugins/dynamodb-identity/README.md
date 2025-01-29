## stamp-dynamodb-identity-plugin

### How to setup

Deploy [cf-template.yaml (dynamodb-identity)](./cf-template.yaml) to CloudFormation

### How to execute test

1. Set environment variables

```
$ export DYNAMO_TABLE_PREFIX=<TableNamePrefix you specified>
```

2. Run tests (at plugins/dynamodb-identity directory)

```
$ npm run test
```

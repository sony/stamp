## stamp-dynamodb-db-plugin

### How to setup

Deploy [cf-template.yaml (dynamodb-db)](./../../plugins/dynamodb-db/cf-template.yaml) to CloudFormation

### How to execute test

1. Set environment variables

```
$ export DYNAMO_TABLE_PREFIX=<TableNamePrefix you specified>
```

2. Run tests (at plugins/dynamodb-db directory)

```
$ npm run test
```

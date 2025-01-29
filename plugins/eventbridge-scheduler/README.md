# Stamp EventBridge Scheduler

This plugin implements Stamp scheduler Plugin using EventBridge scheduler.

## How to run unit test

Deploy CloudFormation template

- cf-template.yaml

Set environment variable

```
export TABLE_NAME_PREFIX=<tableName deployed with cf-template.yaml>
export SCHEDULER_GROUP_NAME=<eventBridge scheduler Group deployed with cf-template.yaml>
export SCHEDULER_SNS_TOPIC_ARN=<topic deployed with cf-template.yaml>
export SCHEDULER_ROLE_ARN=<role deployed with cf-template.yaml>
```

# Stamp web ui

## How to development

### Local develop (temporary data)

#### Setup

1. Deploy cognito_sample.yaml to CloudFormation

   Go to Cognito Management console, and do the following

   - Get User Pool Id
   - Get Application Client ID
   - Get Application Client Secret
   - Create User

2. Generate Auth secret

   ```
   openssl rand -base64 32
   ```

#### start application

1. Set environment variable

   ```
   export HOST_URL=http://localhost:3000

   export NEXTAUTH_SECRET=<Auth secret>

   export COGNITO_CLIENT_ID=<Application Client ID>
   export COGNITO_CLIENT_SECRET=<Application Client Secret>
   export COGNITO_ISSUER=https://cognito-idp.<reagion>.amazonaws.com/<User Pool Id>
   ```

   COGNITO_ISSUER example is `https://cognito-idp.us-west-2.amazonaws.com/us-west-2_CvWvVEIV2`.

2. Execute command

   ```
   web-ui % npm run dev
   ```

### Local develop (persistent data)

#### Setup

1. Deploy [cf-template-for-test.yaml (dynamodb-identity)](./../../plugins/dynamodb-identity/cf-template-for-test.yaml) to CloudFormation

2. Deploy [cf-template.yaml (dynamodb-db)](./../../plugins/dynamodb-db/cf-template.yaml) to CloudFormation

3. Deploy cognito_sample.yaml to CloudFormation

   Go to Cognito Management console, and do the following

   - Get User Pool Id
   - Get Application Client ID
   - Get Application Client Secret
   - Create User

4. Generate Auth secret

   ```
   openssl rand -base64 32
   ```

#### start application

1. Set environment variable

   ```
   export HOST_URL=http://localhost:3000

   export DYNAMO_TABLE_PREFIX=<table prefix>
   export NEXTAUTH_SECRET=<Auth secret>

   export COGNITO_CLIENT_ID=<Application Client ID>
   export COGNITO_CLIENT_SECRET=<Application Client Secret>
   export COGNITO_ISSUER=https://cognito-idp.<reagion>.amazonaws.com/<User Pool Id>
   ```

   COGNITO_ISSUER example is `https://cognito-idp.us-west-2.amazonaws.com/us-west-2_CvWvVEIV2`.

2. Execute command

   ```
   web-ui % npm run dev-dynamodb
   ```

   After executing the above command and logging in, do to the following (To enable Catalog operation)

   1. Create a group (e.g. `Unicorn catalog owner` ) on the Stamp web application
   2. Go to DynamoDB management console, and add a record with the following content to the `Catalog` table
      - id : unicorn-rental-catalog
      - ownerGroupId : groupId of the group generated in step `1` (see `Group` table )

import { createStampHubHTTPServerClient } from "@stamp-lib/stamp-hub";
import { Logger } from "@stamp-lib/stamp-logger";
import { Context, Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";
import { html } from "hono/html";
import { OpenIDConnectTokenResponse, SlackAPIClient } from "slack-web-api-client";
import { SlackPluginConfig } from "../config";
import { deleteOauthState, getOauthState, setOauthState } from "../database/oauthState";
import { unwrapOr } from "../utils/stampHubClient";

const STATE_EXPIRED_TIME = 1000 * 60 * 5; // 5 minutes

export function createAccountLinkRouter(logger: Logger, config: SlackPluginConfig, pluginId: string) {
  const router = new Hono();

  router.get("/", async (c) => {
    const sessionKey = getCookie(c, "stampAccountLinkSessionKey");

    if (sessionKey) {
      return startOauth(logger, c, config, pluginId, sessionKey);
    } else {
      return new Response("Bad request", { status: 400 });
    }
  });

  router.get("/oatuh_redirect", async (c) => {
    const response = await oauthCallback(logger, c, config, pluginId);
    if (response) {
      return response;
    }
    deleteCookie(c, "stampAccountLinkSessionKey", { sameSite: "Lax", httpOnly: true, path: "/", secure: true });
    return c.html(html`
      <!DOCTYPE html>
      <html>
        <body>
          You have successfully linked your Slack account to Stamp. You can close this window now.
        </body>
      </html>
    `);
  });

  return router;
}

async function startOauth(logger: Logger, c: Context, config: SlackPluginConfig, pluginId: string, sessionKey: string): Promise<Response> {
  const stampHubHTTPServerClient = await createStampHubHTTPServerClient(config.stampHubUrl);
  const accountLinkSession = await unwrapOr(stampHubHTTPServerClient.systemRequest.accountLinkSession.get.query({ sessionKey }), undefined);
  const dynamodbDBTableBaseName = `${config.dynamoDBTableNamePrefix}-${config.dynamoDBTableCategoryName}`;
  // accountProviderName is the same as the notificationPluginConfig ID.
  const accountProviderName = pluginId;
  if (accountLinkSession?.accountProviderName !== accountProviderName) {
    return new Response("Bad request", { status: 400 });
  }

  await stampHubHTTPServerClient.systemRequest.accountLinkSession.delete.mutate({ sessionKey });

  const state = globalThis.crypto.randomUUID();
  const expirationTime = new Date(new Date().getTime() + STATE_EXPIRED_TIME).getTime() / 1000; // Use epoch time in seconds for DynamoDB TTL.

  const setStateResult = await setOauthState(logger, `${dynamodbDBTableBaseName}-OauthState`, { region: config.region })({
    state,
    sessionKey,
    stampUserId: accountLinkSession.userId,
    expirationTime,
    pluginId,
  });
  if (setStateResult.isErr()) {
    logger.error(setStateResult.error);
    return new Response("Unexpected Error", { status: 500 });
  }

  return c.redirect(generateAuthorizeUrl(config, state));
}

function generateAuthorizeUrl(config: SlackPluginConfig, state: string) {
  let url = "https://slack.com/openid/connect/authorize?response_type=code";
  url += `&client_id=${config.slackClientId}`;
  url += `&scope=openid%20profile%20email`;
  url += `&state=${state}`;
  url += `&redirect_uri=${generateRedirectUrl(config)}`;
  return url;
}

function generateRedirectUrl(config: SlackPluginConfig) {
  return `https://${config.hostDomain}${config.basePath}/account-link/oatuh_redirect`;
}

async function oauthCallback(logger: Logger, c: Context, config: SlackPluginConfig, pluginId: string) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const sessionKey = getCookie(c, "stampAccountLinkSessionKey");
  const dynamodbDBTableBaseName = `${config.dynamoDBTableNamePrefix}-${config.dynamoDBTableCategoryName}`;
  // accountProviderName is the same as the notificationPluginConfig ID.
  const accountProviderName = pluginId;

  if (!sessionKey || !code || !state) {
    return new Response("Bad request", { status: 400 });
  }

  const getOauthStateResult = await getOauthState(logger, `${dynamodbDBTableBaseName}-OauthState`, { region: config.region })({ state });
  if (getOauthStateResult.isErr()) {
    return new Response("Unexpected Error", { status: 500 });
  }

  // Check if the sessionKey is valid.
  if (
    getOauthStateResult.value.isNone() ||
    getOauthStateResult.value.value.sessionKey !== sessionKey ||
    getOauthStateResult.value.value.pluginId !== pluginId ||
    !isTimestampValid(getOauthStateResult.value.value.expirationTime)
  ) {
    return new Response("Bad request", { status: 400 });
  }

  const tokenReqClient = new SlackAPIClient(undefined, {
    logLevel: "INFO",
  });
  const token: OpenIDConnectTokenResponse = await tokenReqClient.openid.connect.token({
    client_id: config.slackClientId,
    client_secret: config.slackClientSecret,
    redirect_uri: generateRedirectUrl(config),
    code,
  });

  const accessClient = new SlackAPIClient(token.access_token, {
    logLevel: "INFO",
  });
  const userInfo = await accessClient.openid.connect.userInfo();
  const slackUserId = userInfo["https://slack.com/user_id"];
  if (!slackUserId) {
    return new Response("Bad request", { status: 400 });
  }

  logger.info(state);
  const deleteResult = await deleteOauthState(logger, `${dynamodbDBTableBaseName}-OauthState`, { region: config.region })({ state });
  if (deleteResult.isErr()) {
    logger.error(deleteResult.error);
    return new Response("Unexpected Error", { status: 500 });
  }
  const stampHubHTTPServerClient = await createStampHubHTTPServerClient(config.stampHubUrl);
  // Link Slack userId and stampHub userId.
  await stampHubHTTPServerClient.systemRequest.accountLink.set.mutate({
    userId: getOauthStateResult.value.value.stampUserId,
    accountProviderName,
    accountId: slackUserId,
  });
}

function isTimestampValid(expirationTime: number): boolean {
  return expirationTime > new Date().getTime() / 1000;
}

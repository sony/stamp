import { NextAuthOptions } from "next-auth";
import CognitoProvider from "next-auth/providers/cognito";
import CredentialsProvider from "next-auth/providers/credentials";
import { stampHubClient } from "@/utils/stampHubClient";
import { isStampHubClientError, StampHubRouterOutput } from "@stamp-lib/stamp-hub";

const providers: NextAuthOptions["providers"] = [];
if (process.env.COGNITO_CLIENT_ID) {
  providers.push(
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: process.env.COGNITO_ISSUER!,
      checks: "nonce", // Necessary to fix a bug with Cognito's third-party providers. See the following issue and PR. Issue: https://github.com/nextauthjs/next-auth/discussions/3551 PR: https://github.com/nextauthjs/next-auth/pull/4100
    })
  );
}
if (process.env.NEXTAUTH_CREDENTIALS_ENABLE === "true" && process.env.NODE_ENV !== "production") {
  providers.push(
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Only for development/testing: accept any non-empty credentials
        if (credentials?.username && credentials?.password) {
          return {
            id: credentials.username,
            name: credentials.username,
            email: `${credentials.username}@example.com`,
          };
        }
        return null;
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 12 * 60 * 60, // 12 hours
  },
  providers,
  callbacks: {
    jwt: async ({ token, trigger }) => {
      if (trigger === "signIn") {
        const sub = token.sub;
        const userName = token.name;
        const email = token.email;
        if (!sub || !userName || !email) {
          throw new Error("sub or userName or email is not found");
        }
        const stampUser: StampHubRouterOutput["systemRequest"]["user"]["get"] = await (async () => {
          try {
            const accountLink = await stampHubClient.systemRequest.accountLink.get.query({ accountProviderName: "web-app", accountId: sub });
            const user = await stampHubClient.systemRequest.user.get.query({ userId: accountLink.userId });
            return user;
          } catch (Error) {
            if (isStampHubClientError(Error)) {
              if (Error.data?.code === "NOT_FOUND") {
                const user = await stampHubClient.systemRequest.user.create.mutate({ userName, email });
                await stampHubClient.systemRequest.accountLink.set.mutate({ accountProviderName: "web-app", accountId: sub, userId: user.userId });
                return user;
              }
            }
            throw Error;
          }
        })();
        return { name: stampUser.userName, email: stampUser.email, stampUserId: stampUser.userId };
      } else {
        return token;
      }
    },
    session: async ({ session, token }) => {
      const user = { ...session.user, stampUserId: token.stampUserId as string };
      return { ...session, user };
    },
  },
};

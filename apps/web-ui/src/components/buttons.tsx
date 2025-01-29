"use client";

import { signIn, signOut, SessionProvider } from "next-auth/react";

export const LoginButton = () => {
  // Specifying Cognito in the sign-in component to redirect directly to the Cognito login page.
  return (
    <SessionProvider basePath="/auth">
      <button style={{ marginRight: 10 }} onClick={() => signIn("cognito")}></button>
    </SessionProvider>
  );
};

export const LogoutButton = () => {
  return (
    <SessionProvider basePath="/auth">
      <button style={{ marginRight: 10 }} onClick={() => signOut()}>
        Sign Out
      </button>
    </SessionProvider>
  );
};

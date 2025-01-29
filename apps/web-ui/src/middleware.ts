import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/((?!api/auth|login).*)"], // negation with !?. protect routes that are not /auth or /login.
};

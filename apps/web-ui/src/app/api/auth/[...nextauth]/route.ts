import NextAuth from "next-auth";
import { authOptions } from "@/options";

// This is NextAuth's API route. It is used for authentication.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/options";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (user) {
    const name = user.name;
    const email = user.email;
    // stampUserId was set in jwt callback in src/options.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stampUserId = (user as any).stampUserId;
    if (typeof name === "string" && typeof email === "string" && typeof stampUserId === "string") {
      return {
        name: name,
        email: email,
        stampUserId: stampUserId,
      };
    }
    throw new Error("User session is invalid");
  }
  throw new Error("User session is invalid");
}

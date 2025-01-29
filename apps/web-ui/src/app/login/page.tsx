export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/options";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user; // The user object will be undefined if no user is logged in

  const callbackUrl = searchParams?.callbackUrl;
  if (user && typeof callbackUrl === "string") {
    redirect(callbackUrl);
  }
  if (user) {
    redirect("/");
  }

  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "70vh",
      }}
    >
      <div>{user ? <div>SignIn</div> : <div>Not SignIn</div>}</div>
    </main>
  );
}

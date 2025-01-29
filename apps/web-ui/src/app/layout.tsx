import type { Metadata } from "next";
import "./globals.css";
import "@radix-ui/themes/styles.css";

import { Theme, Box } from "@radix-ui/themes";
import NavBar from "@/components/navBar";
import { getSessionUserOrUndefned } from "@/utils/sessionUser";

export const metadata: Metadata = {
  title: "Stamp",
  description: "Stamp",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUserOrUndefned();

  return (
    // suppressHydrationWarning is for radix theme
    <html lang="en-US" suppressHydrationWarning>
      <body className="m-0 p-0" id="tw">
        <Theme appearance="light" accentColor="brown" grayColor="olive">
          <NavBar sessionUser={sessionUser} />
          <Box position="relative">{children}</Box>
        </Theme>
      </body>
    </html>
  );
}

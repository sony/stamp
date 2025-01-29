"use client";
import { DropdownMenu, Flex, Grid, Heading, Box, Text, Separator, Button, Link } from "@radix-ui/themes";
import { CaretDownIcon, PersonIcon } from "@radix-ui/react-icons";
import { SessionUser } from "@/utils/sessionUser";
import { signIn, signOut } from "next-auth/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

function AccountMenu({ sessionUser }: { sessionUser?: SessionUser }) {
  const router = useRouter();
  if (sessionUser) {
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <button aria-label="account menu">
            <Flex align="center" gap="2">
              <PersonIcon width="20" height="20" />
              <Text size="3">{sessionUser.name}</Text>
              <CaretDownIcon width="20" height="20" />
            </Flex>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <Box px="2">
            <Text size="2"> {sessionUser.email}</Text>
          </Box>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={() => {
              router.push("/account/profile");
            }}
          >
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={() => {
              router.push(`/user/${sessionUser.stampUserId}/approval-requests`);
            }}
          >
            My approval requests
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={() => {
              router.push("/account/settings");
            }}
          >
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={() => {
              signOut();
            }}
          >
            sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    );
  } else {
    return (
      <Button
        size="2"
        variant="soft"
        onClick={() => {
          signIn("cognito");
        }}
      >
        signIn
      </Button>
    );
  }
}

export default function NavBar({ sessionUser }: { sessionUser?: SessionUser }) {
  return (
    <div style={{ height: "40px" }}>
      <header className="fixed w-full bg-gray-1 shadow-1 z-50">
        <Box py="2">
          <Grid columns="2" gap="3" width="auto">
            <Flex justify="start" mx="5">
              <Heading size="5">
                <NextLink href="/" style={{ textDecoration: "none", color: "inherit" }}>
                  Stamp
                </NextLink>
              </Heading>
            </Flex>
            <Flex justify="end" mx="5" align="center" gap="1">
              <Separator orientation="vertical" />
              <AccountMenu sessionUser={sessionUser} />
            </Flex>
          </Grid>
        </Box>
      </header>
    </div>
  );
}

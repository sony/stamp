import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, Table, TextField, TextArea, Select, Strong } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { stampHubClient, cacheStampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";

import { getSessionUser } from "@/utils/sessionUser";

async function getUser() {
  const userSession = await getSessionUser();
  const res = await cacheStampHubClient.systemRequest.user.get.query({ userId: userSession.stampUserId });
  return res;
}
export default async function Page({ params }: { params: { groupId: string } }) {
  return (
    <Flex direction="column" gap="4">
      <Box pt="4" pb="6" px="6" className="bg-gray-2">
        <Container size="4">
          <Flex direction="column" gap="4">
            <Text size="8">Account Profile</Text>
          </Flex>
        </Container>
      </Box>
      <Overview />
      <AccountLink />
    </Flex>
  );
}

async function Overview() {
  const user = await getUser();
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Overview</Heading>
          </Grid>
          <Grid columns="2" gap="3" width="auto">
            <Box>
              <Flex direction="column" gap="2">
                <Heading size="3">User ID</Heading>
                <Text size="2">{user.userId}</Text>
              </Flex>
            </Box>
            <Flex gap="4">
              <Separator orientation="vertical" size="4" />
              <Flex direction="column" gap="2" px="4">
                <Flex direction="column" gap="2">
                  <Heading size="3">Name</Heading>
                  <Text size="3">{user.userName}</Text>
                </Flex>
                <Flex direction="column" gap="2">
                  <Heading size="3">Email</Heading>
                  <Text size="3">{user.email}</Text>
                </Flex>
              </Flex>
            </Flex>
          </Grid>
        </Flex>
      </Card>
    </Container>
  );
}

async function AccountLink() {
  const sessionUser = await getSessionUser();
  const accountLinkSession = await stampHubClient.systemRequest.accountLink.listByUserId.query({ userId: sessionUser.stampUserId });

  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Account Link</Heading>
          </Grid>

          {accountLinkSession.map((accountLink) => {
            return (
              <Box key={accountLink.accountProviderName}>
                <Flex direction="column" gap="1">
                  <Heading size="3">{accountLink.accountProviderName}</Heading>
                  <Container px="2">
                    <Text size="2">
                      <Strong>accountId</Strong>: {accountLink.accountId}
                    </Text>
                  </Container>
                </Flex>
              </Box>
            );
          })}
        </Flex>
      </Card>
    </Container>
  );
}

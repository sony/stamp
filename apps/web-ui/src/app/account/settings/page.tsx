import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, Table, TextField, TextArea, Select, Strong } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { stampHubClient, cacheStampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";

import { getSessionUser } from "@/utils/sessionUser";

export default async function Page({ params }: { params: { groupId: string } }) {
  return (
    <Flex direction="column" gap="4">
      <Box pt="4" pb="6" px="6" className="bg-gray-2">
        <Container size="4">
          <Flex direction="column" gap="4">
            <Text size="8">Account Settings</Text>
          </Flex>
        </Container>
      </Box>
      <AccountLink />
    </Flex>
  );
}

async function AccountLink() {
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Account Link</Heading>
          </Grid>
          <Box>
            <Flex direction="column" gap="1">
              <Heading size="3">Slack</Heading>
              <Container px="2">
                <Text size="2">
                  <Link href="/account-link/start/slack"> Start Account Link</Link>
                </Text>
              </Container>
            </Flex>
          </Box>
        </Flex>
      </Card>
    </Container>
  );
}

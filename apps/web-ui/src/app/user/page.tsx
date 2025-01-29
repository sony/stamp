export const dynamic = "force-dynamic";
import { StampUser } from "@/type";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { stampHubClient } from "@/utils/stampHubClient";
import { Box, Card, Container, Flex, Grid, Heading, Link, Table, Text } from "@radix-ui/themes";
import { UserDotsMenu } from "./components/dotsMenu";

async function listUsers(limit?: number, paginationToken?: string): Promise<Array<StampUser>> {
  const res = await stampHubClient.systemRequest.user.list.query({
    paginationToken: paginationToken,
  });
  if ((limit === undefined || res.users.length < limit) && res.nextPaginationToken) {
    const nextUsers = await listUsers(limit, res.nextPaginationToken);
    return res.users.concat(nextUsers).slice(0, limit);
  }
  return res.users.slice(0, limit);
}

export default async function Page() {
  return (
    <main>
      <Flex direction="column" gap="4">
        <Box pt="4" pb="6" px="6" className="bg-gray-2">
          <Container size="4">
            <Flex direction="column" gap="4">
              <Flex direction="row" gap="2" align="center">
                <Link href="/">Home</Link>
                <ChevronRightIcon />
                <Text>User</Text>
              </Flex>

              <Text size="8">User</Text>
            </Flex>
          </Container>
        </Box>
        <UserTable />
      </Flex>
    </main>
  );
}

async function UserTable() {
  // Review the UI when the specified number of groups is exceeded
  const users = await listUsers(200);

  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">User list</Heading>
          </Grid>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>UserId</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users.map((user) => {
                return (
                  <Table.Row key={user.userId} aria-label="stampUser">
                    <Table.Cell>{user.userName}</Table.Cell>
                    <Table.Cell>{user.email}</Table.Cell>
                    <Table.Cell>{user.userId}</Table.Cell>
                    <Table.Cell>
                      <UserDotsMenu userId={user.userId} userName={user.userName} />
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>
    </Container>
  );
}

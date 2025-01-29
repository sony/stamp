export const dynamic = "force-dynamic";
import { CreateGroup } from "@/components/group/createGroup";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { getSessionUser } from "@/utils/session";
import { stampHubClient } from "@/utils/stampHubClient";
import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { Box, Card, Container, Flex, Grid, Heading, Link, Text } from "@radix-ui/themes";
import { columns } from "@/components/group/columns";
import { DataTable } from "@/components/table/dataTable";

async function listGroups(requestUserId: string, limit?: number, paginationToken?: string): Promise<Array<Group>> {
  const res = await stampHubClient.userRequest.group.list.query({
    requestUserId: requestUserId,
    paginationToken: paginationToken,
  });
  if ((limit === undefined || res.items.length < limit) && res.nextPaginationToken) {
    const nextGroups = await listGroups(requestUserId, limit, res.nextPaginationToken);
    return res.items.concat(nextGroups).slice(0, limit);
  }
  return res.items.slice(0, limit);
}

export default async function Page() {
  const sessionUser = await getSessionUser();

  return (
    <main>
      <Flex direction="column" gap="4">
        <Box pt="4" pb="6" px="6" className="bg-gray-2">
          <Container size="4">
            <Flex direction="column" gap="4">
              <Flex direction="row" gap="2" align="center">
                <Link href="/">Home</Link>
                <ChevronRightIcon />
                <Text>Group</Text>
              </Flex>

              <Text size="8">Group</Text>
            </Flex>
          </Container>
        </Box>
        <GroupTable requestUserId={sessionUser.stampUserId} />
      </Flex>
    </main>
  );
}

async function GroupTable({ requestUserId }: { requestUserId: string }) {
  // Review the UI when the specified number of groups is exceeded
  const groups = await listGroups(requestUserId, 200);

  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Group list</Heading>
            <Flex justify="end">
              <CreateGroup />
            </Flex>
          </Grid>
          <DataTable columns={columns} data={groups} />
        </Flex>
      </Card>
    </Container>
  );
}

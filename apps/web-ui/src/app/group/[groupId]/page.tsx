import { cacheStampHubClient, stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Box, Card, Container, Flex, Grid, Heading, Link, Separator, Table, Text } from "@radix-ui/themes";
import { notFound } from "next/navigation";

import { AddMemberDialog } from "@/components/group/addMemberDialog";
import { DeleteGroupDialog } from "@/components/group/deleteGroupDialog";
import { EditGroupDialog } from "@/components/group/editGroupDialog";
import { GroupMemberDotsMenu } from "@/components/group/groupMemberDotsMenu";
import { GroupMemberNotificationSettingModal } from "@/components/group/groupMemberNotificationDialog";
import { ApprovalRequestNotificationSettingModal } from "@/components/group/approvalRequestNotificationDialog";
import { GroupMembership } from "@/type";
import { getSessionUser } from "@/utils/sessionUser";
import { Group, GroupMemberShip } from "@stamp-lib/stamp-types/pluginInterface/identity";

async function listGroupMember(groupId: string, limit?: number, paginationToken?: string): Promise<Array<GroupMemberShip>> {
  const userSession = await getSessionUser();

  const res = await stampHubClient.userRequest.group.listGroupMemberShipByGroup.query({
    requestUserId: userSession.stampUserId,
    groupId: groupId,
    pagenationToken: paginationToken,
  });
  if ((limit === undefined || res.items.length < limit) && res.nextPaginationToken) {
    const nextGroups = await listGroupMember(groupId, limit, res.nextPaginationToken);
    return res.items.concat(nextGroups).slice(0, limit);
  }
  return res.items.slice(0, limit);
}

async function getUser(userId: string) {
  const res = await cacheStampHubClient.systemRequest.user.get.query({ userId });
  return res;
}

export default async function Page({ params }: { params: { groupId: string } }) {
  const userSession = await getSessionUser();
  const group = await unwrapOr(stampHubClient.userRequest.group.get.query({ groupId: params.groupId, requestUserId: userSession.stampUserId }), undefined);
  if (!group) return notFound();

  return (
    <Flex direction="column" gap="4">
      <Box pt="4" pb="6" px="6" className="bg-gray-2">
        <Container size="4">
          <Flex direction="column" gap="4">
            <Flex direction="row" gap="2" align="center">
              <Link href="/">Home</Link>
              <ChevronRightIcon />
              <Link href="/group">Group</Link>
              <ChevronRightIcon />
              <Text>{group.groupName}</Text>
            </Flex>
            <Text size="8">{group.groupName}</Text>
          </Flex>
        </Container>
      </Box>
      <Overview group={group} />
      <GroupMemberTable group={group} />
      <NotificationSetting group={group} />
      <DangerSetting group={group} />
    </Flex>
  );
}

async function Overview({ group }: { group: Group }) {
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Overview</Heading>

            <Flex justify="end">
              <EditGroupDialog group={group} />
            </Flex>
          </Grid>
          <Grid columns="3" gap="3" width="auto">
            <Box>
              <Flex direction="column" gap="2">
                <Heading size="3">Group ID</Heading>
                <Text size="2">{group.groupId}</Text>
              </Flex>
            </Box>
            <Flex gap="4">
              <Separator orientation="vertical" size="4" />
              <Flex direction="column" gap="2">
                <Heading size="3">Description</Heading>
                <Text size="3">{group.description}</Text>
              </Flex>
            </Flex>
            <Flex gap="4">
              <Separator orientation="vertical" size="4" />
              <Flex direction="column" gap="2">
                <Flex direction="column" gap="2">
                  <Heading size="3">Create Date</Heading>
                  <Text size="3">{group.createdAt}</Text>
                </Flex>
                <Flex direction="column" gap="2">
                  <Heading size="3">Update Date</Heading>
                  <Text size="3">{group.updatedAt}</Text>
                </Flex>
              </Flex>
            </Flex>
          </Grid>
        </Flex>
      </Card>
    </Container>
  );
}

async function GroupMemberTable({ group }: { group: Group }) {
  // Review the UI when the specified number of groups is exceeded
  const groupMembers = await listGroupMember(group.groupId, 200);

  const groupMemberRows = [] as JSX.Element[];
  for (const groupMember of groupMembers) {
    groupMemberRows.push(<GroupMemberTableRow key={groupMember.userId} group={group} groupMember={groupMember} />);
  }

  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Member list</Heading>
            <Flex justify="end">
              <AddMemberDialog group={group} />
            </Flex>
          </Grid>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>{groupMemberRows}</Table.Body>
          </Table.Root>
        </Flex>
      </Card>
    </Container>
  );
}

async function GroupMemberTableRow({ group, groupMember }: { group: Group; groupMember: GroupMembership }) {
  const user = await getUser(groupMember.userId);
  return (
    <Table.Row>
      <Table.Cell>{user.userName}</Table.Cell>
      <Table.Cell>{user.email}</Table.Cell>
      <Table.Cell>{groupMember.role}</Table.Cell>
      <Table.Cell>
        <Flex justify="end">
          <GroupMemberDotsMenu groupMembership={groupMember} group={group} userName={user.userName} />
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
}

async function NotificationSetting({ group }: { group: Group }) {
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Heading as="h2">Notification Setting</Heading>
          <Flex justify="end">
            <ApprovalRequestNotificationSettingModal group={group} />
          </Flex>
          <Flex justify="end">
            <GroupMemberNotificationSettingModal group={group} />
          </Flex>
        </Flex>
      </Card>
    </Container>
  );
}

async function DangerSetting({ group }: { group: Group }) {
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Heading as="h2">Danger Setting</Heading>
          <Flex justify="end">
            <DeleteGroupDialog group={group} />
          </Flex>
        </Flex>
      </Card>
    </Container>
  );
}

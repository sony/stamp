import { Flex, Text, Box, Card, Container, Link, Heading, Table } from "@radix-ui/themes";
import { ChevronRightIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { stampHubClient, cacheStampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { ApprovalRequest } from "@/type";
import React from "react";
import { createServerLogger } from "@/logger";
import { parseStatusType, parseInputParams, parseInputResources } from "@/server-lib/hub-clients/approvalRequests/filterApprovalRequests";
import { getParamAsString } from "@/utils/searchParams";
import { listApprovalRequestsByUser } from "@/server-lib/hub-clients/approvalRequests/user";
import { filterApprovalRequests } from "@/server-lib/hub-clients/approvalRequests//filterApprovalRequests";

import { ApprovalRequestFilter } from "./components/approvalRequestFilter";
import { listGroups } from "@/server-lib/hub-clients/group/group";

const MAX_DISPLAY_ITEMS = 200;

export default async function Page({ params, searchParams }: { params: { userId: string }; searchParams: { [key: string]: string | string[] | undefined } }) {
  const logger = createServerLogger();
  logger.info("params", params);
  const user = await getUser(params.userId);
  const start = typeof searchParams["start"] === "string" ? searchParams["start"] : new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(); // default 14 days ago
  const end = typeof searchParams["end"] === "string" ? searchParams["end"] : new Date(Date.now()).toISOString();

  const status = getParamAsString(searchParams, "status");
  const approverId = getParamAsString(searchParams, "approverId");
  const requestUserId = getParamAsString(searchParams, "requestUserId");
  const catalogId = getParamAsString(searchParams, "catalogId");
  const approvalFlowId = getParamAsString(searchParams, "approvalFlowId");
  const approvalRequests = await listApprovalRequestsByUser(
    stampHubClient.userRequest.approvalRequest.listByRequestUserId,
    params.userId,
    { start, end },
    MAX_DISPLAY_ITEMS,
    filterApprovalRequests({
      status: parseStatusType(status),
      inputParams: parseInputParams(searchParams),
      inputResources: parseInputResources(searchParams),
      approverId: approverId,
      requestUserId: requestUserId,
      catalogId: catalogId,
      approvalFlowId: approvalFlowId,
    })
  );

  const groups = await listGroups(stampHubClient.userRequest.group.list, user.userId, 200);
  const catalogs = await getCatalogs();

  return (
    <Flex direction="column" gap="4">
      <Box pt="4" pb="6" px="6" className="bg-gray-2">
        <Container size="4">
          <Flex direction="column" gap="4">
            <Flex direction="row" gap="2" align="center">
              <Link href="/">Home</Link>
              <ChevronRightIcon />
              <Link href="/catalog">User</Link>
              <ChevronRightIcon />
              <Text aria-label="userName">{user.userName}</Text>
              <ChevronRightIcon />
              <Text>Approval requests</Text>
            </Flex>
            <Text size="8"> Approval requests</Text>
            <Text size="2"> Request History</Text>
          </Flex>
        </Container>
      </Box>
      <Container size="4" px="8">
        <Flex direction="column" gap="4">
          <Card>
            <Flex direction="column" gap="4">
              <Flex align="center" gap="2">
                <Heading as="h2">Query Requests</Heading>
              </Flex>
              <Flex align="center" gap="2">
                <Container>
                  <Flex align="start" px="2">
                    <ApprovalRequestFilter
                      userId={params.userId}
                      dateRange={{ from: new Date(start), to: new Date(end) }}
                      groups={groups}
                      catalogs={catalogs}
                    />
                  </Flex>
                </Container>
              </Flex>
            </Flex>
          </Card>
          <Card>
            <Flex direction="column" gap="4">
              <Flex align="center" gap="2">
                <Heading as="h2">Requests</Heading>
              </Flex>
              <ApprovalRequestsTable approvalRequests={approvalRequests} />
            </Flex>
          </Card>
        </Flex>
      </Container>
    </Flex>
  );
}

const getUser = async (userId: string) => {
  const user = await cacheStampHubClient.systemRequest.user.get.query({ userId });
  return user;
};

const getCatalogs = async () => {
  const res = await stampHubClient.userRequest.catalog.list.query();
  return res;
};

function ApprovalRequestsTable({ approvalRequests }: { approvalRequests: ApprovalRequest[] }) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>RequestId</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Catalog</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Approval Flow</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Request Date</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {(() => {
          const rows = approvalRequests.map((approvalRequest) => <TableRow approvalRequest={approvalRequest} key={approvalRequest.requestId} />);
          if (approvalRequests.length === MAX_DISPLAY_ITEMS) {
            rows.push(
              <tr key="approvalRequestsLengthOver">
                <td colSpan={100} style={{ textAlign: "center", color: "#888", fontStyle: "italic", padding: "20px" }}>
                  Display of further items has been skipped. Please narrow the date range to display all items.
                </td>
              </tr>
            );
          }

          return rows;
        })()}
      </Table.Body>
    </Table.Root>
  );
}

async function TableRow({ approvalRequest }: { approvalRequest: ApprovalRequest }) {
  const catalog = await unwrapOr(cacheStampHubClient.userRequest.catalog.get.query(approvalRequest.catalogId), undefined);
  const approvalFlow = await unwrapOr(
    cacheStampHubClient.userRequest.approvalFlow.get.query({ catalogId: approvalRequest.catalogId, approvalFlowId: approvalRequest.approvalFlowId }),
    undefined
  );
  return (
    <Table.Row key={approvalRequest.requestId} align="center" aria-label="userRequest">
      <Table.Cell>
        <Link
          href={`/catalog/${encodeURIComponent(approvalRequest.catalogId)}/approval-flow/${encodeURIComponent(approvalRequest.approvalFlowId)}/request/${
            approvalRequest.requestId
          }`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Flex direction="row" gap="1" align="center">
            <Text size="2"> {approvalRequest.requestId}</Text>
            <ExternalLinkIcon />
          </Flex>
        </Link>
      </Table.Cell>
      <Table.Cell>{catalog?.name ?? approvalRequest.catalogId}</Table.Cell>
      <Table.Cell>{approvalFlow?.name ?? approvalRequest.approvalFlowId}</Table.Cell>
      <Table.Cell>{approvalRequest.status}</Table.Cell>
      <Table.Cell>{approvalRequest.requestDate}</Table.Cell>
    </Table.Row>
  );
}

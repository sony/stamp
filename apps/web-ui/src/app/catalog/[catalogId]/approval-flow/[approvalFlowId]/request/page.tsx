import { Flex, Text, Grid, Box, Card, Container, Link, Heading, Separator, Table } from "@radix-ui/themes";
import { ChevronRightIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { stampHubClient, unwrapOr, cacheStampHubClient } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";
import { ApprovalRequest } from "@/type";
import { getSessionUser } from "@/utils/sessionUser";
import { GroupLink } from "@/server-components/group/groupLink";
import React from "react";
import { getParamAsString } from "@/utils/searchParams";
import { listApprovalRequestsByCatalog } from "@/server-lib/hub-clients/approvalRequests/catalog";
import { filterApprovalRequests } from "@/server-lib/hub-clients/approvalRequests//filterApprovalRequests";
import { parseStatusType, parseInputParams, parseInputResources } from "@/server-lib/hub-clients/approvalRequests/filterApprovalRequests";

import { ApprovalRequestFilter } from "./components/approvalRequestFilter";
import { InputResourceSelectorItems } from "@/components/approval-flow/inputResource";
import { listGroups } from "@/server-lib/hub-clients/group/group";
import { StatusBadge } from "@/components/approval-request/statusBadge";

export default async function Page({
  params,
  searchParams,
}: {
  params: { approvalFlowId: string; catalogId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const catalogId = decodeURIComponent(params.catalogId);
  const approvalFlowId = decodeURIComponent(params.approvalFlowId);
  const catalog = await unwrapOr(stampHubClient.userRequest.catalog.get.query(catalogId), undefined);
  if (!catalog) return notFound();
  const approvalFlow = await unwrapOr(stampHubClient.userRequest.approvalFlow.get.query({ catalogId, approvalFlowId }), undefined);
  if (!approvalFlow) return notFound();

  const start = typeof searchParams["start"] === "string" ? searchParams["start"] : new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(); // default 14 days ago
  const end = typeof searchParams["end"] === "string" ? searchParams["end"] : new Date(Date.now()).toISOString();

  const userSession = await getSessionUser();

  const status = getParamAsString(searchParams, "status");
  const approverId = getParamAsString(searchParams, "approverId");
  const requestUserId = getParamAsString(searchParams, "requestUserId");
  const approvalRequests = await listApprovalRequestsByCatalog(
    stampHubClient.userRequest.approvalRequest.listByApprovalFlowId,
    userSession.stampUserId,
    approvalFlowId,
    catalogId,
    { start, end },
    filterApprovalRequests({
      status: parseStatusType(status),
      inputParams: parseInputParams(searchParams),
      inputResources: parseInputResources(searchParams),
      approverId: approverId,
      requestUserId: requestUserId,
    })
  );

  const sessionUser = await getSessionUser();
  const groups = await listGroups(stampHubClient.userRequest.group.list, sessionUser.stampUserId, 200);

  const inputResourceSelectorItems: InputResourceSelectorItems = [];
  for (const inputResource of approvalFlow.inputResources ? approvalFlow.inputResources : []) {
    const resourceType = await unwrapOr(
      stampHubClient.userRequest.resourceType.get.query({
        catalogId: catalog.id,
        resourceTypeId: inputResource.resourceTypeId,
        requestUserId: userSession.stampUserId,
      }),
      undefined
    );
    if (!resourceType) {
      throw new Error(`Resource Type ${inputResource} is not found in catalog ${catalogId}`);
    }
    inputResourceSelectorItems.push({
      ...inputResource,
      resourceName: resourceType.name,
    });
  }

  return (
    <Flex direction="column" gap="4">
      <Box pt="4" pb="6" px="6" className="bg-gray-2">
        <Container size="4">
          <Flex direction="column" gap="4">
            <Flex direction="row" gap="2" align="center">
              <Link href="/">Home</Link>
              <ChevronRightIcon />
              <Link href="/catalog">Catalog</Link>
              <ChevronRightIcon />
              <Link href={`/catalog/${encodeURIComponent(catalog.id)}`}> {catalog.name} </Link>
              <ChevronRightIcon />
              Approval Flow
              <ChevronRightIcon />
              {approvalFlow.name}
              <ChevronRightIcon />
              Requests
            </Flex>
            <Text size="8">{approvalFlow.name} History</Text>
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
                      catalogId={catalogId}
                      dateRange={{ from: new Date(start), to: new Date(end) }}
                      groups={groups}
                      inputParams={approvalFlow.inputParams}
                      inputResourceSelectorItems={inputResourceSelectorItems}
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

async function getUserName({ userId }: { userId: string }) {
  const user = await unwrapOr(cacheStampHubClient.systemRequest.user.get.query({ userId: userId }), undefined);
  return user?.userName ?? userId;
}

async function ApprovalRequestsTable({ approvalRequests }: { approvalRequests: ApprovalRequest[] }) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>RequestId</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Requester</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Approver</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Request Date</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {(() => {
          return approvalRequests.map((approvalRequest) => {
            return <TableRow approvalRequest={approvalRequest} key={approvalRequest.requestId} />;
          });
        })()}
      </Table.Body>
    </Table.Root>
  );
}

async function TableRow({ approvalRequest }: { approvalRequest: ApprovalRequest }) {
  const requestUserName = await getUserName({ userId: approvalRequest.requestUserId });
  return (
    <Table.Row key={approvalRequest.requestId} align="center">
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
      <Table.Cell>{requestUserName}</Table.Cell>
      <Table.Cell>
        <GroupLink groupId={approvalRequest.approverId} />
      </Table.Cell>
      <Table.Cell>
        <StatusBadge status={approvalRequest.status} />
      </Table.Cell>
      <Table.Cell>{approvalRequest.requestDate}</Table.Cell>
    </Table.Row>
  );
}

import { Flex, Text, Box, Card, Container, Link, Heading, Table } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";
import { ResourceAuditItems } from "@/type";
import { getSessionUser } from "@/utils/sessionUser";
import React from "react";
import { createServerLogger } from "@/logger";

export default async function Page({ params }: { params: { catalogId: string; resourceTypeId: string; resourceId: string } }) {
  const logger = createServerLogger();
  logger.info("params", params);
  const catalogId = decodeURIComponent(params.catalogId);
  const resourceTypeId = decodeURIComponent(params.resourceTypeId);
  const catalog = await unwrapOr(stampHubClient.userRequest.catalog.get.query(catalogId), undefined);
  if (!catalog) return notFound();
  const userSession = await getSessionUser();

  const resourceType = await unwrapOr(stampHubClient.userRequest.resourceType.get.query({ catalogId, resourceTypeId, requestUserId: userSession.stampUserId }), undefined);
  if (!resourceType) return notFound();

  const resourceId = decodeURIComponent(params.resourceId);

  const resourceItem = await unwrapOr(
    stampHubClient.userRequest.resource.get.query({
      catalogId: catalog.id,
      resourceTypeId: resourceType.id,
      resourceId: resourceId,
      requestUserId: userSession.stampUserId,
    }),
    undefined
  );
  if (!resourceItem) return notFound();

  const auditItems = await listAuditItems(catalogId, resourceTypeId, resourceId, userSession.stampUserId);
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
              <Text>Resource type</Text>
              <ChevronRightIcon />
              <Link href={`/catalog/${encodeURIComponent(catalog.id)}/resource-type/${encodeURIComponent(resourceType.id)}`}> {resourceType.name} </Link>
              <ChevronRightIcon />
              <Text>{resourceItem.name}</Text>
              <ChevronRightIcon />
              <Text>Audit</Text>
            </Flex>
            <Text size="8"> Audit</Text>
            <Text size="2">List of audit items</Text>
          </Flex>
        </Container>
      </Box>
      <Container size="4" px="8">
        <Card>
          <Flex direction="column" gap="4">
            <Flex align="center" gap="2">
              <Heading as="h2">permission</Heading>
            </Flex>

            <AuditItemsTable auditItems={auditItems} />
          </Flex>
        </Card>
      </Container>
    </Flex>
  );
}

const listAuditItems = async (catalogId: string, resourceTypeId: string, resourceId: string, requestUserId: string) => {
  const auditItems = await stampHubClient.userRequest.resource.listAuditItem.query({
    catalogId: catalogId,
    resourceTypeId: resourceTypeId,
    resourceId: resourceId,
    requestUserId: requestUserId,
  });
  return auditItems.auditItems;
};

function AuditItemsTable({ auditItems }: { auditItems: ResourceAuditItems[] }) {
  return (
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Values</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {(() => {
          return auditItems.map((auditItem) => {
            return <TableRow auditItem={auditItem} key={auditItem.name} />;
          });
        })()}
      </Table.Body>
    </Table.Root>
  );
}

async function TableRow({ auditItem }: { auditItem: ResourceAuditItems }) {
  return (
    <Table.Row key={auditItem.name} align="center">
      <Table.Cell>{auditItem.name}</Table.Cell>
      <Table.Cell>
        {auditItem.values.map((item, index) => (
          <React.Fragment key={index}>
            {item}
            <br />
          </React.Fragment>
        ))}
      </Table.Cell>
    </Table.Row>
  );
}

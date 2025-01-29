import { Flex, Text, Grid, Box, Card, Container, Link, Heading, Separator, Table } from "@radix-ui/themes";
import { ChevronRightIcon, ExternalLinkIcon, Link2Icon } from "@radix-ui/react-icons";
import { stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";
import { ResourceType } from "@/type";
import { CreateResourceForm } from "@/components/resource/createResourceForm";
import { getSessionUser } from "@/utils/sessionUser";
import React from "react";
import { columns } from "@/components/resource/columns";
import { DataTableWithFilters } from "@/components/table/dataTableWithFilters";
import { listResources } from "@/server-lib/hub-clients/resource/resource";

export default async function Page({ params }: { params: { resourceTypeId: string; catalogId: string } }) {
  const userSession = await getSessionUser();
  const catalogId = decodeURIComponent(params.catalogId);
  const resourceTypeId = decodeURIComponent(params.resourceTypeId);
  const catalog = await unwrapOr(stampHubClient.userRequest.catalog.get.query(catalogId), undefined);
  if (!catalog) return notFound();
  const resourceType = await unwrapOr(stampHubClient.userRequest.resourceType.get.query({ catalogId, resourceTypeId, requestUserId: userSession.stampUserId }), undefined);
  if (!resourceType) return notFound();

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
              Resource type
              <ChevronRightIcon />
              {resourceType.name}
            </Flex>
            <Text size="8">{resourceType.name}</Text>
            <Text size="2">{resourceType.description}</Text>
          </Flex>
        </Container>
      </Box>
      <Overview resourceType={resourceType} />
      <ResourceTable resourceType={resourceType} catalogId={catalog.id} />
    </Flex>
  );
}

async function Overview({ resourceType }: { resourceType: ResourceType }) {
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Heading as="h2">Overview</Heading>

          <Grid columns="2" gap="3" width="auto" style={{ height: "100px" }}>
            <Box>
              <Flex direction="column" gap="2">
                <Heading size="3">Resource Type ID</Heading>
                <Text size="3">{resourceType.id}</Text>
              </Flex>
            </Box>
            <Flex gap="4">
              <Separator orientation="vertical" size="4" />
              <Flex direction="column" gap="2">
                <Heading size="3">Parent Resource Type</Heading>
                <Text size="3">{resourceType.parentResourceTypeId ? <ParentResourceLink resourceType={resourceType} /> : "No parent"}</Text>
              </Flex>
            </Flex>
          </Grid>
        </Flex>
      </Card>
    </Container>
  );
}

async function ParentResourceLink({ resourceType }: { resourceType: ResourceType }) {
  const userSession = await getSessionUser();
  if (!resourceType.parentResourceTypeId) {
    return <React.Fragment />;
  }
  const parentResourceType = await unwrapOr(
    stampHubClient.userRequest.resourceType.get.query({
      catalogId: resourceType.catalogId,
      resourceTypeId: resourceType.parentResourceTypeId,
      requestUserId: userSession.stampUserId,
    }),
    undefined
  );
  if (!parentResourceType) {
    // Fall back to just showing the id
    return (
      <Link
        href={`/catalog/${encodeURIComponent(resourceType.catalogId)}/resource-type/${encodeURIComponent(resourceType.parentResourceTypeId)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Flex direction="row" gap="1" align="center">
          <Text size="2">{resourceType.parentResourceTypeId}</Text>
          <ExternalLinkIcon />
        </Flex>
      </Link>
    );
  } else {
    return (
      <Link
        href={`/catalog/${encodeURIComponent(resourceType.catalogId)}/resource-type/${encodeURIComponent(resourceType.parentResourceTypeId)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {" "}
        <Flex direction="row" gap="1" align="center">
          <Text size="2">{parentResourceType.name}</Text>
          <ExternalLinkIcon />
        </Flex>
      </Link>
    );
  }
}

async function ResourceTable({ resourceType, catalogId }: { resourceType: ResourceType; catalogId: string }) {
  const sessionUser = await getSessionUser();
  const resources = await listResources(stampHubClient.userRequest.resource.listOutlines, resourceType, catalogId, sessionUser.stampUserId);
  const filterableColumnDisplayNameMap = new Map([
    ["name", "Name"],
    ["parentResourceId", "Parent ResourceID"],
  ]);
  if (resourceType.parentResourceTypeId === undefined) {
    filterableColumnDisplayNameMap.delete("parentResourceId");
  }

  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Resource list</Heading>
            <Flex justify="end">{resourceType.isCreatable && <CreateResourceForm resourceType={resourceType} />}</Flex>
          </Grid>
          <DataTableWithFilters
            columns={columns}
            data={resources}
            columnVisibility={{
              parentResourceId: resourceType.parentResourceTypeId === undefined ? false : true,
            }}
            filterableColumnDisplayNameMap={filterableColumnDisplayNameMap}
          />
        </Flex>
      </Card>
    </Container>
  );
}

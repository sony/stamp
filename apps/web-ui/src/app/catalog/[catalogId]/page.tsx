import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, Table, useThemeContext, Tooltip, HoverCard } from "@radix-ui/themes";
import { ChevronRightIcon, InfoCircledIcon, Link2Icon } from "@radix-ui/react-icons";
import { stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";
import { Catalog } from "@/type";
import React from "react";
import { getSessionUser } from "@/utils/sessionUser";
import { GroupLink } from "@/server-components/group/groupLink";
import { DotsMenu } from "./components/dotsMenu";
export default async function Page({ params }: { params: { catalogId: string } }) {
  const catalogId = decodeURIComponent(params.catalogId);
  const catalog = await unwrapOr(stampHubClient.userRequest.catalog.get.query(catalogId), undefined);

  if (!catalog) return notFound();
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
              <Text> {catalog.name} </Text>
            </Flex>

            <Text size="8">{catalog.name}</Text>
            <Text size="2">{catalog.description}</Text>
          </Flex>
        </Container>
      </Box>
      <Overview catalog={catalog} />
      <ApprovalFlowsTable catalog={catalog} />
      <ResourceTypeTable catalog={catalog} />
    </Flex>
  );
}

async function Overview({ catalog }: { catalog: Catalog }) {
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="2">
            <Heading as="h2">Overview</Heading>
            {/* <Flex justify="end">
              <Button>Edit</Button>
            </Flex> */}
          </Grid>
          <Grid columns="3" gap="3" width="auto" style={{ height: "100px" }}>
            <Box>
              <Flex direction="column" gap="2">
                <Heading size="3">Catalog ID</Heading>
                <Text size="3">{catalog.id}</Text>
              </Flex>
            </Box>
            <Flex gap="4">
              <Separator orientation="vertical" size="4" />
              <Flex direction="column" gap="2">
                <Heading size="3">Catalog ownerGroup</Heading>
                <Text size="3">{catalog.ownerGroupId ? <GroupLink groupId={catalog.ownerGroupId} /> : "No Setting"}</Text>
              </Flex>
            </Flex>
            <Flex gap="4">
              <Separator orientation="vertical" size="4" />
              <Flex direction="column" gap="2">
                <Heading size="3">Number of approval flow</Heading>
                <Text size="3">{catalog.approvalFlowIds.length}</Text>
              </Flex>
            </Flex>
          </Grid>
        </Flex>
      </Card>
    </Container>
  );
}

async function ApprovalFlowsTable({ catalog }: { catalog: Catalog }) {
  const approvalFlows = await unwrapOr(stampHubClient.userRequest.approvalFlow.list.query(catalog.id), undefined);
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Heading as="h2">Approval Flows</Heading>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Flow Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Submit</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Request history</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(() => {
                if (approvalFlows) {
                  return approvalFlows.map((approvalFlow) => {
                    return (
                      <Table.Row key={approvalFlow.id}>
                        <Table.Cell>
                          <Flex direction="row" gap="1" align="center">
                            {approvalFlow.name}
                            <HoverCard.Root>
                              <HoverCard.Trigger>
                                <Text className="text-accent-9">
                                  <InfoCircledIcon />
                                </Text>
                              </HoverCard.Trigger>
                              <HoverCard.Content maxWidth="300px">
                                <Text size="2">{approvalFlow.description}</Text>
                              </HoverCard.Content>
                            </HoverCard.Root>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Link href={`/catalog/${encodeURIComponent(catalog.id)}/approval-flow/${encodeURIComponent(approvalFlow.id)}/submit`}>
                            <Flex direction="row" gap="1" align="center">
                              Submit <Link2Icon />
                            </Flex>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>
                          <Link href={`/catalog/${encodeURIComponent(catalog.id)}/approval-flow/${encodeURIComponent(approvalFlow.id)}/request`}>
                            <Flex direction="row" gap="1" align="center">
                              Request <Link2Icon />
                            </Flex>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>
                          <DotsMenu catalog={catalog} approvalFlow={approvalFlow} />
                        </Table.Cell>
                      </Table.Row>
                    );
                  });
                }
              })()}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>
    </Container>
  );
}

async function ResourceTypeTable({ catalog }: { catalog: Catalog }) {
  const userSession = await getSessionUser();

  const resourceTypes = await unwrapOr(stampHubClient.userRequest.resourceType.list.query({ catalogId: catalog.id, requestUserId: userSession.stampUserId }), undefined);
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Heading as="h2">Resource Types</Heading>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(() => {
                if (resourceTypes) {
                  return resourceTypes.map((resourceType) => {
                    return (
                      <Table.Row key={resourceType.id}>
                        <Table.Cell>
                          <Link href={`/catalog/${encodeURIComponent(catalog.id)}/resource-type/${encodeURIComponent(resourceType.id)}`}>
                            <Flex direction="row" gap="1" align="center">
                              {resourceType.name} <Link2Icon />
                            </Flex>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>{resourceType.description}</Table.Cell>
                      </Table.Row>
                    );
                  });
                }
              })()}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>
    </Container>
  );
}

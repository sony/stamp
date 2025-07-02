export const dynamic = "force-dynamic";

import { Flex, Text, Grid, Box, Card, Container, Link, Heading, Separator, Table } from "@radix-ui/themes";
import { Link2Icon, ChevronRightIcon } from "@radix-ui/react-icons";
import { stampHubClient } from "../../utils/stampHubClient";
import { DotsMenu } from "@/components/catalog/dotsMenu";
import React from "react";

async function getCatalogs() {
  const res = await stampHubClient.userRequest.catalog.list.query();
  return res;
}

export default async function Page() {
  return (
    <Flex direction="column" gap="4">
      <Box pt="4" pb="6" px="6" className="bg-gray-2">
        <Container size="4">
          <Flex direction="column" gap="4">
            <Flex direction="row" gap="2" align="center">
              <Link href="/">Home</Link>
              <ChevronRightIcon />
              <Text>Catalog</Text>
            </Flex>
            <Text size="8">Stamp catalogs</Text>
            <Text size="2">All Stamp catalogs</Text>
          </Flex>
        </Container>
      </Box>
      <CatalogTable />
    </Flex>
  );
}

async function CatalogTable() {
  const catalogs = await getCatalogs();

  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="4">
          <Heading as="h2">Catalog list</Heading>

          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(() => {
                return catalogs
                  .filter((catalog) => catalog.id !== "stamp-system") // Exclude system catalog
                  .map((catalog) => {
                    return (
                      <Table.Row key={catalog.id} align="center">
                        <Table.Cell>
                          <Link href={`/catalog/${encodeURIComponent(catalog.id)}`}>
                            <Flex direction="row" gap="1" align="center">
                              {catalog.name}
                              <Link2Icon />
                            </Flex>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex justify="end">
                            <DotsMenu catalog={catalog} />
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    );
                  });
              })()}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>
    </Container>
  );
}

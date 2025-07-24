import { Flex, Text, Box, Container, Link } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";
import { stampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";
import { RequestForm } from "@/components/approval-flow/requestForm";
import { InputResourceSelectorItems } from "@/components/approval-flow/inputResource";
import { getSessionUser } from "@/utils/sessionUser";
import { ResourceType } from "@/type";
import { createServerLogger } from "@/logger";

export default async function Page({ params }: { params: { approvalFlowId: string; catalogId: string } }) {
  const logger = createServerLogger();
  const userSession = await getSessionUser();
  const catalogId = decodeURIComponent(params.catalogId);
  const approvalFlowId = decodeURIComponent(params.approvalFlowId);
  const catalog = await unwrapOr(stampHubClient.userRequest.catalog.get.query(catalogId), undefined);
  if (!catalog) return notFound();
  const approvalFlow = await unwrapOr(stampHubClient.userRequest.approvalFlow.get.query({ catalogId, approvalFlowId }), undefined);
  if (!approvalFlow) return notFound();
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
      logger.error(`Resource Type ${inputResource} is not found in catalog ${catalogId}`);
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
              <Text>Approval flow</Text>
              <ChevronRightIcon />
              <Text> {approvalFlow.name} </Text>
            </Flex>
            <Text size="8">{approvalFlow.name}</Text>
            <Text size="2">{approvalFlow.description}</Text>
          </Flex>
        </Container>
      </Box>
      <RequestForm catalogId={catalog.id} approvalFlow={approvalFlow} inputResourceSelectorItems={inputResourceSelectorItems} />
    </Flex>
  );
}

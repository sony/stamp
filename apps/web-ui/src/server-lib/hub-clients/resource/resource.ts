import { StampHubRouterClient } from "@stamp-lib/stamp-hub";
import { ResourceType } from "@/type";
import { Resource } from "@/components/resource/columns";

export async function listResources(
  listOutlines: StampHubRouterClient["userRequest"]["resource"]["listOutlines"],
  resourceType: ResourceType,
  catalogId: string,
  requestUserId: string,
  limit: number = Infinity,
  paginationToken?: string
): Promise<Array<Resource>> {
  const resourceOutlines = await listOutlines.query({
    resourceTypeId: resourceType.id,
    catalogId,
    requestUserId: requestUserId,
    paginationToken: paginationToken,
  });
  const resources: Resource[] = resourceOutlines.items.map((resourceOutline) => ({
    resourceType,
    resourceOutline,
  }));
  if (resources.length < limit && resourceOutlines.paginationToken) {
    const nextResources = await listResources(listOutlines, resourceType, catalogId, requestUserId, limit, resourceOutlines.paginationToken);
    return resources.concat(nextResources).slice(0, limit);
  }

  return resources.slice(0, limit);
}

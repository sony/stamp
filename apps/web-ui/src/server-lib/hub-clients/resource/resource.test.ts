import { describe, expect, it, vi } from "vitest";
import { ResourceType } from "@/type";
import { Resource } from "@/components/resource/columns";
import { listResources } from "./resource";

describe("listResources", () => {
  it("should return all resources without pagination", async () => {
    const catalogId = "testCatalogId";
    const requestUserId = "testUserId";
    const resourceType: ResourceType = {
      id: "resourceTypeId",
      name: "testName",
      description: "testDescription",
      createParams: [],
      infoParams: [],
      catalogId: catalogId,
      isCreatable: false,
      isUpdatable: false,
      isDeletable: false,
      ownerManagement: true,
      approverManagement: true,
      anyoneCanCreate: true,
    };
    const mockListOutlines = {
      items: [
        {
          id: "id1",
          name: "Resource 1",
          catalogId: "Description of Resource 1",
          resourceTypeId: "Resource Type 1",
          params: {},
        },
        {
          id: "id2",
          name: "Resource 2",
          catalogId: "Description of Resource 2",
          resourceTypeId: "Resource Type 2",
          params: {},
        },
      ],
    };

    const listOutlines = {
      query: vi.fn().mockResolvedValueOnce(mockListOutlines),
    };

    const expected: Resource[] = [
      {
        resourceType: resourceType,
        resourceOutline: mockListOutlines.items[0],
      },
      {
        resourceType: resourceType,
        resourceOutline: mockListOutlines.items[1],
      },
    ];

    const result = await listResources(listOutlines, resourceType, catalogId, requestUserId);
    expect(result).toEqual(expected);
  });

  it("should handle empty resource list", async () => {
    const catalogId = "testCatalogId";
    const requestUserId = "testUserId";
    const resourceType: ResourceType = {
      id: "resourceTypeId",
      name: "testName",
      description: "testDescription",
      createParams: [],
      infoParams: [],
      catalogId: catalogId,
      isCreatable: false,
      isUpdatable: false,
      isDeletable: false,
      ownerManagement: true,
      approverManagement: true,
      anyoneCanCreate: true,
    };
    const mockListOutlines = {
      items: [],
    };

    const listOutlines = {
      query: vi.fn().mockResolvedValueOnce(mockListOutlines),
    };

    const expected: Resource[] = [];

    const result = await listResources(listOutlines, resourceType, catalogId, requestUserId);
    expect(result).toEqual(expected);
  });

  it("should return paginated resources for the user when pagination is used", async () => {
    const catalogId = "testCatalogId";
    const requestUserId = "testUserId";
    const resourceType: ResourceType = {
      id: "resourceTypeId",
      name: "testName",
      description: "testDescription",
      createParams: [],
      infoParams: [],
      catalogId: catalogId,
      isCreatable: false,
      isUpdatable: false,
      isDeletable: false,
      ownerManagement: true,
      approverManagement: true,
      anyoneCanCreate: true,
    };
    const paginationToken = "testPaginationToken";
    const mockListOutlines1 = {
      items: [
        {
          id: "id1",
          name: "Resource 1",
          catalogId: "Description of Resource 1",
          resourceTypeId: "Resource Type 1",
          params: {},
        },
        {
          id: "id2",
          name: "Resource 2",
          catalogId: "Description of Resource 2",
          resourceTypeId: "Resource Type 2",
          params: {},
        },
      ],
      paginationToken: paginationToken,
    };
    const mockListOutlines2 = {
      items: [
        {
          id: "id3",
          name: "Resource 3",
          catalogId: "Description of Resource 3",
          resourceTypeId: "Resource Type 3",
          params: {},
        },
      ],
      paginationToken: null,
    };

    const expected: Resource[] = [
      {
        resourceType: resourceType,
        resourceOutline: mockListOutlines1.items[0],
      },
      {
        resourceType: resourceType,
        resourceOutline: mockListOutlines1.items[1],
      },
      {
        resourceType: resourceType,
        resourceOutline: mockListOutlines2.items[0],
      },
    ];
    const listOutlines = {
      query: vi.fn().mockResolvedValueOnce(mockListOutlines1).mockResolvedValueOnce(mockListOutlines2),
    };

    const result = await listResources(listOutlines, resourceType, catalogId, requestUserId);
    expect(result).toEqual(expected);
    expect(listOutlines.query.mock.calls.length).toBe(2);
    expect(listOutlines.query.mock.calls[0][0]).toStrictEqual({
      resourceTypeId: resourceType.id,
      catalogId: catalogId,
      requestUserId: requestUserId,
      paginationToken: undefined,
    });
    expect(listOutlines.query.mock.calls[1][0]).toStrictEqual({
      resourceTypeId: resourceType.id,
      catalogId: catalogId,
      requestUserId: requestUserId,
      paginationToken: paginationToken,
    });
  });
});

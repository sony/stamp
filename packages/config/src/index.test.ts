import { describe, expect, it, vi } from "vitest";

import { createConfigProvider, CreateConfigInput } from "./index";

describe("createConfigProvider", () => {
  it("should initialize config provider with valid input", () => {
    const input: CreateConfigInput = {
      catalogs: [
        {
          id: "catalog1",
          name: "catalog1",
          description: "catalog1",
          approvalFlows: [],
          resourceTypes: [],
        },
      ],
      notificationPlugins: [
        {
          id: "notificationPlugin1" /* other properties */,
          name: "notificationPlugin1",
          description: "notificationPlugin1",
          handlers: {
            sendNotification: vi.fn(),
            setChannel: vi.fn(),
            unsetChannel: vi.fn(),
          },
          channelConfigProperties: [],
        },
      ],
    };
    const configProvider = createConfigProvider(input);
    expect(configProvider.catalogConfig).toBeDefined();
    expect(configProvider.notificationPlugin).toBeDefined();
  });

  it("should handle optional notificationPlugins", () => {
    const input: CreateConfigInput = {
      catalogs: [
        {
          id: "catalog1",
          name: "catalog1",
          description: "catalog1",
          approvalFlows: [],
          resourceTypes: [],
        },
      ],
    };
    const configProvider = createConfigProvider(input);
    expect(configProvider.notificationPlugin).toBeDefined();
  });
});

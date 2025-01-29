import { describe, expect, it, vi } from "vitest";

import { NotificationPluginConfig, NotificationProvider } from "@stamp-lib/stamp-types/pluginInterface/notification";

import { some } from "@stamp-lib/stamp-option";
import { createNotificationPluginConfigProvider } from "./notification";

const notificationProvider: NotificationProvider = {
  sendNotification: vi.fn(),
  setChannel: vi.fn(),
  unsetChannel: vi.fn(),
};

describe("getNotificationPluginConfig", () => {
  it("should return some notification plugin config when config exists", async () => {
    const notificationPluginConfigMap = new Map<string, Readonly<NotificationPluginConfig>>([
      [
        "1",
        {
          id: "1",
          name: "NotificationPlugin1",
          handlers: notificationProvider,
          channelConfigProperties: [
            {
              id: "test",
              description: "test",
              name: "test",
              type: "string",
              required: true,
            },
          ],
          description: "test",
        },
      ],
    ]);

    const notificationPluginConfigProvider = createNotificationPluginConfigProvider(notificationPluginConfigMap);
    const result = await notificationPluginConfigProvider.get("1");

    expect(result._unsafeUnwrap().isSome()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(
      some({
        id: "1",
        name: "NotificationPlugin1",
        handlers: notificationProvider,
        channelConfigProperties: [
          {
            id: "test",
            description: "test",
            name: "test",
            type: "string",
            required: true,
          },
        ],
        description: "test",
      })
    );
  });

  it("should return none when config does not provided", async () => {
    const notificationPluginConfigMap = new Map<string, Readonly<NotificationPluginConfig>>();

    const notificationPluginConfigProvider = createNotificationPluginConfigProvider(notificationPluginConfigMap);
    const result = await notificationPluginConfigProvider.get("1");

    expect(result._unsafeUnwrap().isNone()).toBe(true);
  });

  it("should return none when config does not exist", async () => {
    const notificationPluginConfigMap = new Map<string, Readonly<NotificationPluginConfig>>([
      [
        "1",
        {
          id: "1",
          name: "NotificationPlugin1",
          handlers: notificationProvider,
          channelConfigProperties: [
            {
              id: "test",
              description: "test",
              name: "test",
              type: "string",
              required: true,
            },
          ],
          description: "test",
        },
      ],
    ]);

    const notificationPluginConfigProvider = createNotificationPluginConfigProvider(notificationPluginConfigMap);
    const result = await notificationPluginConfigProvider.get("non-existent");

    expect(result._unsafeUnwrap().isNone()).toBe(true);
  });
});

describe("listNotificationPluginConfig", () => {
  it("should return all notification plugin configs", async () => {
    const notificationPluginConfigMap = new Map<string, Readonly<NotificationPluginConfig>>([
      [
        "1",
        {
          id: "1",
          name: "NotificationPlugin1",
          handlers: notificationProvider,
          channelConfigProperties: [
            {
              id: "test",
              description: "test",
              name: "test",
              type: "string",
              required: true,
            },
          ],
          description: "test",
        },
      ],
      [
        "2",
        {
          id: "2",
          name: "NotificationPlugin2",
          handlers: notificationProvider,
          channelConfigProperties: [
            {
              id: "test",
              description: "test",
              name: "test",
              type: "string",
              required: true,
            },
          ],
          description: "test",
        },
      ],
    ]);

    const notificationPluginConfigProvider = createNotificationPluginConfigProvider(notificationPluginConfigMap);
    const result = await notificationPluginConfigProvider.list();

    expect(result._unsafeUnwrap()).toEqual([
      {
        id: "1",
        name: "NotificationPlugin1",
        handlers: notificationProvider,
        channelConfigProperties: [
          {
            id: "test",
            description: "test",
            name: "test",
            type: "string",
            required: true,
          },
        ],
        description: "test",
      },
      {
        id: "2",
        name: "NotificationPlugin2",
        handlers: notificationProvider,
        channelConfigProperties: [
          {
            id: "test",
            description: "test",
            name: "test",
            type: "string",
            required: true,
          },
        ],
        description: "test",
      },
    ]);
  });

  it("should return empty array when no notification plugin config provided", async () => {
    const notificationPluginConfigMap = new Map<string, Readonly<NotificationPluginConfig>>();

    const notificationPluginConfigProvider = createNotificationPluginConfigProvider(notificationPluginConfigMap);
    const result = await notificationPluginConfigProvider.list();

    expect(result._unsafeUnwrap()).toEqual([]);
  });
});

describe("createNotificationPluginConfigProvider", () => {
  it("should return create notification plugin config provider", () => {
    const notificationPluginConfigMap = new Map<string, Readonly<NotificationPluginConfig>>([
      [
        "1",
        {
          id: "1",
          name: "NotificationPlugin1",
          handlers: notificationProvider,
          channelConfigProperties: [
            {
              id: "test",
              description: "test",
              name: "test",
              type: "string",
              required: true,
            },
          ],
          description: "test",
        },
      ],
    ]);

    const configProvider = createNotificationPluginConfigProvider(notificationPluginConfigMap);

    expect(configProvider.get).toBeDefined();
    expect(configProvider.list).toBeDefined();
  });
});

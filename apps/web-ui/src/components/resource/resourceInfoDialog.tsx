"use client";
import { Flex, Text, Button, Box, Link, Heading, Dialog, Strong, Spinner, DataList } from "@radix-ui/themes";
import { ResourceType, ResourceOutline } from "@/type";
import React, { useEffect, useState } from "react";
import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";

import { GroupLink } from "@/components/group/clientGroupLink";
export function ResourceInfoDialog({ resourceType, resourceOutline }: { resourceType: ResourceType; resourceOutline: ResourceOutline }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Link href="#">{resourceOutline.name}</Link>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title> {resourceOutline.name} Info</Dialog.Title>
        <Box px="2">
          <Flex direction="column" gap="4">
            <InfoParams resourceType={resourceType} resourceOutline={resourceOutline} />
            <Overview resourceType={resourceType} resourceOutline={resourceOutline} />
          </Flex>
        </Box>
        <Flex gap="3" mt="2" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function InfoParams({ resourceType, resourceOutline }: { resourceType: ResourceType; resourceOutline: ResourceOutline }) {
  const InfoParamsComp = [];
  for (const infoParam of resourceType.infoParams) {
    const infoParamFromId = `infoParam_${infoParam.id}`;
    InfoParamsComp.push(
      <Flex direction="row" gap="2" key={infoParamFromId}>
        <Text size="2">
          <Strong>{infoParam.name}</Strong>
        </Text>
        <Text size="2">{resourceOutline.params[infoParam.id]}</Text>
      </Flex>
    );
  }
  return (
    <Box>
      <Heading size="3"> Info Params</Heading>
      <Box px="1">{InfoParamsComp}</Box>
    </Box>
  );
}

async function getResource(resourceId: string, catalogId: string, resourceTypeId: string) {
  const result = await fetch(
    `/api/resource/get?catalogId=${encodeURIComponent(catalogId)}&resourceTypeId=${encodeURIComponent(resourceTypeId)}&resourceId=${encodeURIComponent(
      resourceId
    )}`
  );
  return (await result.json()) as StampHubRouterOutput["userRequest"]["resource"]["get"];
}

function Overview({ resourceType, resourceOutline }: { resourceType: ResourceType; resourceOutline: ResourceOutline }) {
  const [resource, setResource] = useState<StampHubRouterOutput["userRequest"]["resource"]["get"] | undefined>(undefined);
  useEffect(() => {
    getResource(resourceOutline.id, resourceOutline.catalogId, resourceOutline.resourceTypeId).then((r) => {
      setResource(r);
    });
  }, [resourceOutline]);
  if (!resource) return <Spinner />;

  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="1">
        <Heading size="3">Resource ID</Heading>
        <Flex p="1">
          <Text size="2">{resource.id}</Text>
        </Flex>
      </Flex>

      {resourceType?.parentResourceTypeId && (
        <Flex direction="column" gap="1">
          <Heading size="3">Parent Resource Id</Heading>
          <Flex p="1">{resource.parentResourceId ? <Text size="2">{resource.parentResourceId}</Text> : <Text size="2">No parent</Text>}</Flex>
        </Flex>
      )}

      {resourceType?.ownerManagement && (
        <Flex direction="column" gap="1">
          <Heading size="3">Owner Group</Heading>
          <Flex p="1">{resource.ownerGroupId ? <GroupLink groupId={resource.ownerGroupId} /> : <Text size="2">No setting</Text>}</Flex>
        </Flex>
      )}

      {resourceType?.approverManagement && (
        <Flex direction="column" gap="1">
          <Heading size="3">Approver Group</Heading>
          <Flex p="1">{resource.approverGroupId ? <GroupLink groupId={resource.approverGroupId} /> : <Text size="2">No setting</Text>}</Flex>
        </Flex>
      )}

      <Flex direction="column" gap="1">
        <Heading size="3">Audit Notification</Heading>
        {resource.auditNotifications ? (
          resource.auditNotifications?.map((notification) => (
            <Flex direction="column" gap="4" p="1" key={notification.notificationChannel.typeId + notification.notificationChannel.id}>
              <DataList.Root key={notification.notificationChannel.typeId + notification.notificationChannel.id}>
                <DataList.Item align="center">
                  <DataList.Label minWidth="88px">Notification Type</DataList.Label>
                  <DataList.Value>{notification.notificationChannel.typeId}</DataList.Value>
                </DataList.Item>
                <DataList.Item align="center">
                  <DataList.Label minWidth="88px">Notification ID</DataList.Label>
                  <DataList.Value>{notification.notificationChannel.id}</DataList.Value>
                </DataList.Item>
                {Object.entries(notification.notificationChannel.properties).map(([name, value]) => (
                  <DataList.Item key={name}>
                    <DataList.Label minWidth="88px">{name}</DataList.Label>
                    <DataList.Value>{value}</DataList.Value>
                  </DataList.Item>
                ))}
              </DataList.Root>
            </Flex>
          ))
        ) : (
          <Text size="2">No setting</Text>
        )}
      </Flex>
    </Flex>
  );
}

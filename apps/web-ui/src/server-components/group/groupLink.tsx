"use server";
import { Flex, Text, Link } from "@radix-ui/themes";

import React from "react";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { cacheStampHubClient, unwrapOr } from "@/utils/stampHubClient";
import { getSessionUser } from "@/utils/session";
async function getGroup(groupId: string) {
  const userSession = await getSessionUser();
  return await unwrapOr(cacheStampHubClient.userRequest.group.get.query({ groupId, requestUserId: userSession.stampUserId }), undefined);
}

export async function GroupLink({ groupId }: { groupId: string }) {
  const group = await getGroup(groupId);
  return (
    <Link href={`/group/${groupId}`} target="_blank" rel="noopener noreferrer">
      <Flex direction="row" gap="1" align="center">
        <Text size="2">{group ? group.groupName : groupId}</Text>
        <ExternalLinkIcon />
      </Flex>
    </Link>
  );
}

"use client";
import { Flex, Text, Link } from "@radix-ui/themes";

import React, { useEffect, useState } from "react";
import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
async function getGroup(groupId: string) {
  const result = await fetch(`/api/group/get?groupId=${groupId}`);
  return (await result.json()) as StampHubRouterOutput["userRequest"]["group"]["get"];
}

export function GroupLink({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<StampHubRouterOutput["userRequest"]["group"]["get"] | undefined>(undefined);
  useEffect(() => {
    getGroup(groupId).then((r) => {
      setGroup(r);
    });
  }, [groupId]);
  return (
    <Link href={`/group/${groupId}`} target="_blank" rel="noopener noreferrer">
      {group?.groupName && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <Text size="2">{group.groupName}</Text>
          <ExternalLinkIcon style={{ width: "12px", height: "12px" }} />
        </span>
      )}
    </Link>
  );
}

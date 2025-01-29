"use client";

import { StampUser } from "@/type";
import { StampHubRouterOutput } from "@stamp-lib/stamp-hub";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Button, Flex, Popover, Text } from "@radix-ui/themes";
import React, { useState } from "react";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../combobox/command";

type UserItem = StampUser & {
  userNameEmail: string; // format: userName (email)
};

async function getUserList({ limit, paginationToken }: { limit: number; paginationToken?: string }): Promise<Array<StampUser>> {
  let url = `/api/user/list?limit=${limit}`;
  if (paginationToken) {
    url += `&paginationToken=${paginationToken}`;
  }
  const result = await fetch(url);
  if (!result.ok) throw new Error(`Failed to fetch resources: ${result.statusText}`);
  const response = (await result.json()) as StampHubRouterOutput["systemRequest"]["user"]["list"];
  if (response.nextPaginationToken) {
    const nextItems = await getUserList({ limit, paginationToken: response.nextPaginationToken });
    return response.users.concat(nextItems);
  }
  return response.users;
}

export function ListUser() {
  const [userItems, setUserItems] = useState<Array<UserItem> | undefined>(undefined);
  const [openPopover, setOpenPopover] = React.useState(false);
  const [selectedUserId, setSlectedUserId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    (async () => {
      const userList = await getUserList({ limit: 100 });
      const items = userList.map((user) =>
        // Add a field that combines userName and email
        ({ ...user, userNameEmail: `${user.userName.trim()} (${user.email.trim()})` })
      );
      setUserItems(items);
    })();
  }, []);

  if (!userItems) {
    return (
      <label>
        <Text as="div" size="2" mb="1">
          Loading...
        </Text>
      </label>
    );
  }

  const selectItems = userItems.map((user) => {
    return (
      <CommandItem
        key={user.userId}
        value={user.userNameEmail}
        onSelect={(selectedNameEmail: string) => {
          console.log(`selectedNameEmail: "${selectedNameEmail}"`);
          // selectedNameEmail is the selected 'userName (email)' value in userItems, so find the id and set it
          const selectedId = userItems.find((user) => user.userNameEmail === selectedNameEmail)?.userId;
          if (selectedId) {
            setSlectedUserId(selectedId);
          }
          setOpenPopover(false);
        }}
      >
        <Flex align="center" px="1">
          <CheckIcon className={selectedUserId === user.userId ? "opacity-100" : "opacity-0"} />
        </Flex>
        {user.userNameEmail}
      </CommandItem>
    );
  });

  return (
    <div>
      <label htmlFor="userId">
        <Text as="div" size="2" mb="1" weight="bold">
          Member
        </Text>
      </label>
      <input type="hidden" name="userId" value={selectedUserId || ""} />
      <Popover.Root open={openPopover} onOpenChange={setOpenPopover}>
        <Popover.Trigger disabled={0 < userItems.length ? false : true} id="userId">
          <Button color="gray" variant="surface">
            {selectedUserId ? userItems.find((user) => user.userId === selectedUserId)?.userNameEmail : ""}
            <CaretSortIcon />
          </Button>
        </Popover.Trigger>
        <Popover.Content size="1">
          <Command>
            <CommandInput placeholder={`Search the member…`} />
            <CommandList>
              <CommandGroup>{selectItems}</CommandGroup>
            </CommandList>
          </Command>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}

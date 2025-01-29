"use server";
import { getSessionUserOrUndefned } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";
import { redirect } from "next/navigation";
import { createServerLogger } from "@/logger";

export type CreateGroupState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function createGroupSubmit(prevState: CreateGroupState | undefined, formData: FormData) {
  const logger = createServerLogger();
  const sessionUser = await getSessionUserOrUndefned();
  logger.info("createGroupSubmit:sessionUser", sessionUser);
  logger.info("createGroupSubmit:name", formData.get("name"));
  logger.info("createGroupSubmit:description", formData.get("description"));

  const name = formData.get("name");
  const description = formData.get("description");

  if (name === null || description === null || sessionUser === undefined) {
    return { message: "Lack of FormData params", isSuccess: false };
  }
  let createdGroup;
  try {
    createdGroup = await stampHubClient.userRequest.group.create.mutate({
      groupName: name.toString(),
      description: description.toString(),
      requestUserId: sessionUser.stampUserId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }

  redirect(`/group/${createdGroup.groupId}`);
}

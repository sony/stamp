"use server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";

export type EditGroupState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function editGroupSubmit(prevState: EditGroupState | undefined, formData: FormData) {
  const sessionUser = await getSessionUser();

  const groupId = formData.get("groupId");
  const groupName = formData.get("groupName");
  const description = formData.get("description");
  if (groupId === null || groupName === null || description === null) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.group.update.mutate({
      description: description.toString(),
      requestUserId: sessionUser.stampUserId,
      groupId: groupId.toString(),
      groupName: groupName.toString(),
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}

"use server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";
import { redirect } from "next/navigation";

export type RemoveMemberState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function removeMemberSubmit(prevState: RemoveMemberState | undefined, formData: FormData) {
  const sessionUser = await getSessionUser();

  const groupId = formData.get("groupId");
  const userId = formData.get("userId");

  if (groupId === null || userId === null) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.group.removeUserFromGroup.mutate({
      groupId: groupId.toString(),
      targetUserId: userId.toString(),
      requestUserId: sessionUser.stampUserId,
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}

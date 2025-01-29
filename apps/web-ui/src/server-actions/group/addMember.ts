"use server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";
import { redirect } from "next/navigation";

export type AddMemberState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function addMemberSubmit(prevState: AddMemberState | undefined, formData: FormData) {
  const sessionUser = await getSessionUser();

  const groupId = formData.get("groupId");
  const userId = formData.get("userId");
  const role = formData.get("role");

  if (groupId === null || userId === null || role === null) {
    return { message: "Lack of FormData params", isSuccess: false };
  }
  const roleType = role.toString();
  if (roleType !== "owner" && roleType !== "member") {
    return { message: "role must be owner or member", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.group.addUserToGroup.mutate({
      groupId: groupId.toString(),
      targetUserId: userId.toString(),
      requestUserId: sessionUser.stampUserId,
      role: roleType,
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}

"use server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";
import { redirect } from "next/navigation";

export type DeleteGroupState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function deleteGroupSubmit(prevState: DeleteGroupState | undefined, formData: FormData) {
  const sessionUser = await getSessionUser();

  const groupId = formData.get("groupId");

  if (groupId === null) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.group.delete.mutate({
      groupId: groupId.toString(),
      requestUserId: sessionUser.stampUserId,
    });
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }

  redirect(`/group`);
}

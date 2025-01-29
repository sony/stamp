"use server";
import { getSessionUser } from "@/utils/sessionUser";
import { stampHubClient } from "@/utils/stampHubClient";
import { redirect } from "next/navigation";

export type DeleteUserState = {
  errors?: Record<string, string[]>;
  message: string | null;
  isSuccess: boolean | null;
};

export async function DeleteUserSubmit(prevState: DeleteUserState | undefined, formData: FormData) {
  const sessionUser = await getSessionUser();

  const userId = formData.get("userId")?.toString();

  if (userId === undefined) {
    return { message: "Lack of FormData params", isSuccess: false };
  }

  try {
    await stampHubClient.userRequest.user.delete.mutate({
      userId: userId,
      requestUserId: sessionUser.stampUserId,
    });
    return { isSuccess: true, message: "success" };
  } catch (e) {
    return { message: (e as Error).message, isSuccess: false };
  }
}

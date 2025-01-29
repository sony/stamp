"use client";
import { revokeSubmit } from "@/server-actions/approval-request/revoke";
import { ApprovalRequest } from "@/type";
import { Button, Card, Container, Flex, Heading, Text, TextArea } from "@radix-ui/themes";
import { useFormState, useFormStatus } from "react-dom";

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export function RevokeForm({ approvalRequest, enableRevoke }: { approvalRequest: ApprovalRequest; enableRevoke: boolean }) {
  const router = useRouter();
  const [revokeSubmitState, revokeSubmitFormAction] = useFormState(revokeSubmit, undefined);

  useEffect(() => {
    if (revokeSubmitState?.isSuccess === true) {
      router.refresh();
    }
  }, [router, revokeSubmitState]);

  if (
    (approvalRequest.status !== "approved" && approvalRequest.status !== "approvedActionSucceeded") ||
    revokeSubmitState?.isSuccess === true ||
    enableRevoke === false
  ) {
    return <React.Fragment></React.Fragment>;
  }
  return (
    <Container size="3" px="8">
      <Card>
        <form action={revokeSubmitFormAction}>
          <Flex direction="column" gap="4">
            <input type="hidden" name="approvalRequestId" value={approvalRequest.requestId} />
            <Heading size="4">Revoke</Heading>
            <CommentField />
            {revokeSubmitState?.isSuccess === false && revokeSubmitState?.message && (
              <Flex gap="3" mt="4" justify="end">
                <Text size="2" color="red">
                  {revokeSubmitState.message}
                </Text>
              </Flex>
            )}
            <Flex justify="end">
              <RevokeButton />
            </Flex>
          </Flex>
        </form>
      </Card>
    </Container>
  );
}

export function CommentField() {
  return <TextArea name="comment" placeholder="Comments revoke message" />;
}

function RevokeButton() {
  const { pending } = useFormStatus();
  return (
    <Flex gap="3">
      <Button type="submit" disabled={pending}>
        {pending ? "Requesting..." : "Revoke"}
      </Button>
    </Flex>
  );
}

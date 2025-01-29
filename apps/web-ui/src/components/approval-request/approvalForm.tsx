"use client";
import { approveSubmit } from "@/server-actions/approval-request/approve";
import { rejectSubmit } from "@/server-actions/approval-request/reject";
import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, Table, TextField, TextArea, Select } from "@radix-ui/themes";
import { useFormState, useFormStatus } from "react-dom";
import { ApprovalRequest } from "@/type";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ApprovalForm({ approvalRequest }: { approvalRequest: ApprovalRequest }) {
  const router = useRouter();
  const [approveSubmitState, approveSubmitFormAction] = useFormState(approveSubmit, undefined);
  const [rejectSubmitState, rejectSubmitFormAction] = useFormState(rejectSubmit, undefined);

  useEffect(() => {
    if (rejectSubmitState?.isSuccess === true || approveSubmitState?.isSuccess === true) {
      router.refresh();
    }
  }, [router, approveSubmitState, rejectSubmitState]);

  if (approvalRequest.status !== "pending" || rejectSubmitState?.isSuccess === true || approveSubmitState?.isSuccess === true) {
    return <React.Fragment></React.Fragment>;
  }
  return (
    <Container size="3" px="8">
      <Card>
        <form action="?">
          <Flex direction="column" gap="4">
            <input type="hidden" name="approvalRequestId" value={approvalRequest.requestId} />
            <Heading size="4">Approve</Heading>
            <CommentField />
            {
              //TODO: Implement error handling
              approveSubmitState?.isSuccess === false && approveSubmitState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {approveSubmitState.message}
                  </Text>
                </Flex>
              )
            }
            {
              //TODO: Implement error handling
              rejectSubmitState?.isSuccess === false && rejectSubmitState?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {rejectSubmitState.message}
                  </Text>
                </Flex>
              )
            }
            <Flex justify="end">
              <RequestButton approveSubmitFormAction={approveSubmitFormAction} rejectSubmitFormAction={rejectSubmitFormAction} />
            </Flex>
          </Flex>
        </form>
      </Card>
    </Container>
  );
}

export function CommentField() {
  return <TextArea name="comment" placeholder="Comments to requester…" />;
}

function RequestButton({
  approveSubmitFormAction,
  rejectSubmitFormAction,
}: {
  approveSubmitFormAction: (payload: FormData) => void;
  rejectSubmitFormAction: (payload: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <Flex gap="3">
      <Button type="submit" disabled={pending} formAction={approveSubmitFormAction}>
        {pending ? "Requesting..." : "Approve"}
      </Button>
      <Button type="submit" disabled={pending} formAction={rejectSubmitFormAction}>
        {pending ? "Requesting..." : "Reject"}
      </Button>
    </Flex>
  );
}

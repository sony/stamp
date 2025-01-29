"use client";
import { approvalRequestSubmit } from "@/server-actions/approval-flow/approvalRequestSubmit";
import { Flex, Text, Button, Grid, Box, Card, Container, Link, Heading, Separator, Table, TextField, TextArea, Select } from "@radix-ui/themes";
import { useFormState, useFormStatus } from "react-dom";
import { ApprovalFlow } from "@/type";
import { InputParamsFormInput } from "./inputParam";
import { InputResources, SelectInputResources } from "./inputResource";
import React from "react";

export function RequestForm({
  catalogId,
  approvalFlow,
  selectInputResources,
}: {
  catalogId: string;
  approvalFlow: ApprovalFlow;
  selectInputResources: SelectInputResources;
}) {
  console.log(approvalFlow);
  const [state, formAction] = useFormState(approvalRequestSubmit, undefined);

  const formInputs = [];
  for (const inputParam of approvalFlow.inputParams) {
    const inputParamFromId = `inputParam_${inputParam.id}`;
    console.log(inputParamFromId);
    formInputs.push(<InputParamsFormInput inputParam={inputParam} key={inputParamFromId} />);
  }

  return (
    <Container size="2" px="8">
      <Card>
        <form action={formAction}>
          <Flex direction="column" gap="4">
            <input type="hidden" name="catalogId" value={catalogId} />
            <input type="hidden" name="approvalFlowId" value={approvalFlow.id} />
            <Heading as="h2">Request form</Heading>
            <Flex direction="column" gap="3">
              {formInputs}
            </Flex>
            {approvalFlow.inputResources && (
              <React.Fragment>
                <InputResources selectInputResources={selectInputResources} catalogId={catalogId} />
              </React.Fragment>
            )}
            <Heading size="4">Comment</Heading>
            <CommentField />
            {
              //TODO: Implement error handling
              state?.isSuccess === false && state?.message && (
                <Flex gap="3" mt="4" justify="end">
                  <Text size="2" color="red">
                    {state.message}
                  </Text>
                </Flex>
              )
            }
            <Flex justify="end">
              <RequestButton />
            </Flex>
          </Flex>
        </form>
      </Card>
    </Container>
  );
}

export function CommentField() {
  return <TextArea name="comment" placeholder="Comments to approvers…" />;
}

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Requesting..." : "Request"}
    </Button>
  );
}

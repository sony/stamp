"use client";
import { approvalRequestSubmit } from "@/server-actions/approval-flow/approvalRequestSubmit";
import {
  Flex,
  Text,
  Button,
  Grid,
  Box,
  Card,
  Container,
  Link,
  Heading,
  Separator,
  Table,
  TextField,
  TextArea,
  Select,
  Badge,
  Checkbox,
} from "@radix-ui/themes";
import { useFormState, useFormStatus } from "react-dom";
import { ApprovalFlow } from "@/type";
import { InputParamsFormInput } from "./inputParam";
import { InputResources, SelectInputResources } from "./inputResource";
import React, { useState, useEffect, useMemo } from "react";

// Helper to parse ISO 8601 duration
const parseDuration = (duration: string): { days: number; hours: number } | null => {
  const regex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/;
  const match = duration.match(regex);

  if (!match) return null;

  return {
    days: match[1] ? parseInt(match[1]) : 0,
    hours: match[2] ? parseInt(match[2]) : 0,
  };
};

// Helper to format days and hours into ISO 8601 duration
const formatDuration = (days: number, hours: number): string | undefined => {
  if (days === 0 && hours === 0) return undefined;
  if (days === 0) return `PT${hours}H`;
  if (hours === 0) return `P${days}D`;
  return `P${days}DT${hours}H`;
};

function AutoRevokeDurationInput({
  autoRevoke,
}: {
  autoRevoke: {
    enabled: boolean;
    required: boolean;
    maxDuration?: string;
  };
}) {
  const [days, setDays] = useState<number>(0);
  const [hours, setHours] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [enableAutoRevoke, setEnableAutoRevoke] = useState<boolean>(autoRevoke.required);

  // Use useMemo to prevent recalculation on every render
  const maxDuration = useMemo(() => {
    return autoRevoke?.maxDuration ? parseDuration(autoRevoke.maxDuration) : { days: 30, hours: 24 };
  }, [autoRevoke?.maxDuration]);

  // Validate and update the hidden input value when days or hours change
  useEffect(() => {
    const validateDuration = () => {
      if (!enableAutoRevoke) {
        setError(null);
        return true;
      }

      if (days === 0 && hours === 0) {
        if (autoRevoke?.required) {
          setError("Duration is required");
          return false;
        }
      }

      if (maxDuration) {
        if (days > maxDuration.days) {
          setError(`Days cannot exceed ${maxDuration.days}`);
          return false;
        }

        if (hours > maxDuration.hours) {
          setError(`Hours cannot exceed ${maxDuration.hours}`);
          return false;
        }
      }

      setError(null);
      return true;
    };

    validateDuration();
  }, [days, hours, autoRevoke, maxDuration, enableAutoRevoke]);

  if (!autoRevoke?.enabled) return null;

  // Only set the duration value if auto-revoke is enabled
  const durationValue = enableAutoRevoke ? formatDuration(days, hours) : undefined;

  return (
    <Flex direction="column" gap="2">
      <Flex align="center" gap="2">
        <Heading size="3">Auto Revoke</Heading>
        <Badge color="amber" size="1">
          Preview
        </Badge>
      </Flex>

      {!autoRevoke.required && (
        <Flex gap="2" align="center">
          <Checkbox id="enable-auto-revoke" checked={enableAutoRevoke} onCheckedChange={(checked) => setEnableAutoRevoke(checked === true)} />
          <Text as="label" size="2" htmlFor="enable-auto-revoke">
            Enable automatic revocation after specified duration
          </Text>
        </Flex>
      )}

      {(autoRevoke.required || enableAutoRevoke) && (
        <>
          <Text size="2" color="gray">
            Specify how long this access should be granted (maximum: {maxDuration?.days} days and {maxDuration?.hours} hours)
          </Text>
          <Flex gap="2" align="center">
            <TextField.Root
              type="number"
              min="0"
              max={maxDuration?.days.toString()}
              value={days.toString()}
              onChange={(e) => setDays(parseInt(e.target.value) || 0)}
              placeholder="Days"
              aria-label="Days"
              style={{ width: "80px" }}
            />
            <Text>days</Text>
            <TextField.Root
              type="number"
              min="0"
              max={maxDuration?.hours.toString()}
              value={hours.toString()}
              onChange={(e) => setHours(parseInt(e.target.value) || 0)}
              placeholder="Hours"
              aria-label="Hours"
              style={{ width: "80px" }}
            />
            <Text>hours</Text>
          </Flex>
          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}
        </>
      )}

      {/* Only include the hidden input when auto-revoke is enabled */}
      {durationValue !== undefined && enableAutoRevoke && (
        <input type="hidden" name="autoRevokeDuration" value={durationValue} required={autoRevoke?.required} />
      )}
    </Flex>
  );
}

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
            {approvalFlow.enableRevoke && approvalFlow.autoRevoke && (
              <AutoRevokeDurationInput
                autoRevoke={{
                  enabled: approvalFlow.autoRevoke.enabled,
                  required: approvalFlow.autoRevoke.defaultSettings.required,
                  maxDuration: approvalFlow.autoRevoke.defaultSettings.maxDuration,
                }}
              />
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

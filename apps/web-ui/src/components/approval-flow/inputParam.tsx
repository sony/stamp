"use client";
import { Text, TextField, RadioGroup, Flex, useThemeContext } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import React from "react";
import { ApprovalFlowInputParam } from "@stamp-lib/stamp-types/models";

export function InputParamsFormInput({ inputParam }: { inputParam: ApprovalFlowInputParam }) {
  if (inputParam.type === "boolean") {
    return <BooleanInput inputParam={inputParam} />;
  } else if (inputParam.type === "string") {
    return <StringInput inputParam={inputParam} />;
  } else if (inputParam.type === "number") {
    return <NumberInput inputParam={inputParam} />;
  }
}

export function BooleanInput({ inputParam }: { inputParam: ApprovalFlowInputParam }) {
  const inputParamFromId = `inputParam_${inputParam.id}`;

  return (
    <label key={inputParamFromId}>
      <Text as="div" size="2" mb="1" weight="bold">
        {inputParam.name}
      </Text>
      <Flex gap="2">
        <RadioGroup.Root defaultValue="false" name={inputParamFromId}>
          <Flex gap="2" direction="column">
            <Text size="2">
              <Flex gap="2">
                <RadioGroup.Item value="true" /> true
              </Flex>
            </Text>
            <Text size="2">
              <Flex gap="2">
                <RadioGroup.Item value="false" /> false
              </Flex>
            </Text>
          </Flex>
        </RadioGroup.Root>
      </Flex>
    </label>
  );
}

export function StringInput({ inputParam }: { inputParam: ApprovalFlowInputParam }) {
  const inputParamFromId = `inputParam_${inputParam.id}`;
  const currentAccentColor = useThemeContext().accentColor;

  return (
    <label key={inputParamFromId}>
      <Text as="div" size="3" mb="1" weight="bold">
        {inputParam.name}
      </Text>
      {inputParam.description ? (
        <Flex p="1" align="center" gap="1">
          <Text size="2" color={currentAccentColor}>
            <InfoCircledIcon />
          </Text>
          <Text size="2" color={currentAccentColor}>
            {inputParam.description}
          </Text>
        </Flex>
      ) : null}
      <TextField.Root name={inputParamFromId} />
    </label>
  );
}

export function NumberInput({ inputParam }: { inputParam: ApprovalFlowInputParam }) {
  const inputParamFromId = `inputParam_${inputParam.id}`;

  return (
    <label key={inputParamFromId}>
      <Text as="div" size="2" mb="1" weight="bold">
        {inputParam.name}
      </Text>
      <TextField.Root name={inputParamFromId} type="number" />
    </label>
  );
}

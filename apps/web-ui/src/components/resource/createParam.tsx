"use client";
import { Text, TextField, RadioGroup, Flex, Tooltip, IconButton } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import React from "react";
import { ResourceCreateParam } from "@stamp-lib/stamp-types/models";

export function CreateParamFormInput({ createParam }: { createParam: ResourceCreateParam }) {
  if (createParam.type === "boolean") {
    return <BooleanInput createParam={createParam} />;
  } else if (createParam.type === "string") {
    return <StringInput createParam={createParam} />;
  } else if (createParam.type === "number") {
    return <NumberInput createParam={createParam} />;
  } else if (createParam.type === "string[]") {
    return <StringArrayInput createParam={createParam} />;
  }
}

export function BooleanInput({ createParam }: { createParam: ResourceCreateParam }) {
  const createParamFormId = `createParam_${createParam.id}`;

  return (
    <label key={createParamFormId} htmlFor={createParamFormId}>
      <Text size="2" mb="1" weight="bold">
        {createParam.name}
      </Text>
      <Flex gap="2">
        <RadioGroup.Root defaultValue="false" name={createParamFormId} id={createParamFormId}>
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

export function StringInput({ createParam }: { createParam: ResourceCreateParam }) {
  const createParamFormId = `createParam_${createParam.id}`;

  return (
    <label key={createParamFormId} htmlFor={createParamFormId}>
      <Text size="2" mb="1" weight="bold">
        {createParam.name}
      </Text>
      <TextField.Root name={createParamFormId} id={createParamFormId} />
    </label>
  );
}

export function NumberInput({ createParam }: { createParam: ResourceCreateParam }) {
  const createParamFormId = `createParam_${createParam.id}`;

  return (
    <label key={createParamFormId} htmlFor={createParamFormId}>
      <Text size="2" mb="1" weight="bold">
        {createParam.name}
      </Text>
      <TextField.Root name={createParamFormId} type="number" id={createParamFormId} />
    </label>
  );
}

export function StringArrayInput({ createParam }: { createParam: ResourceCreateParam }) {
  const createParamFormId = `createParam_${createParam.id}`;
  const [textFields, SetTextFields] = React.useState([
    <TextField.Root name={createParamFormId} key={`${createParamFormId}_0`} aria-label={createParam.name} />,
  ]);

  return (
    <label key={createParamFormId}>
      <Flex gap="1" direction="column">
        <Text size="2" mb="1" weight="bold">
          {createParam.name}
        </Text>
        {textFields}
        <Flex justify="end" gap="2">
          <Tooltip content="Add input form">
            <IconButton
              radius="full"
              type="button"
              aria-label={`Add ${createParam.name} input form`}
              onClick={() => {
                SetTextFields((preTextFields) => {
                  return [
                    ...preTextFields,
                    <TextField.Root name={createParamFormId} key={`${createParamFormId}_${preTextFields.length}`} aria-label={createParam.name} />,
                  ];
                });
              }}
            >
              <PlusIcon />
            </IconButton>
          </Tooltip>
        </Flex>
      </Flex>
    </label>
  );
}

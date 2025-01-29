import React from "react";
import { Box, Flex, Text, TextField } from "@radix-ui/themes";
import { ApprovalFlowInputParam } from "@stamp-lib/stamp-types/models";

export const InputParameters = ({
  inputParams,
  inputValuesMap,
  onParameterInput,
}: {
  inputParams: Array<ApprovalFlowInputParam>;
  inputValuesMap: Map<string, string>;
  onParameterInput: (paramId: string, value: string) => void;
}) => {
  return (
    <>
      {inputParams.length > 0 && (
        <Flex direction="column" gap="3" width="100%">
          {inputParams.map((param) => {
            const initialValue = inputValuesMap.get(param.id) ?? "";
            return (
              <InputResource key={param.id} resourceId={param.id} initialValue={initialValue} resourceName={param.name} onParameterInput={onParameterInput} />
            );
          })}
        </Flex>
      )}
    </>
  );
};

interface InputResourceProps {
  resourceId: string;
  resourceName: string;
  initialValue: string;
  onParameterInput: (paramId: string, value: string) => void;
}

const InputResource = ({ resourceId, resourceName, initialValue, onParameterInput }: InputResourceProps) => {
  const [inputValue, setInputValue] = React.useState<string>("");
  React.useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  const handleInputChange = React.useCallback(
    (paramId: string, value: string) => {
      onParameterInput(paramId, value);
      setInputValue(value);
    },
    [onParameterInput]
  );

  return (
    <Flex direction="column" gap="2" key={resourceId}>
      <Text as="div" size="2" mt="1">
        {`${resourceName}`}
      </Text>
      <Box flexGrow="1">
        <TextField.Root
          value={inputValue}
          placeholder={`Enter a filter for ${resourceName}`}
          onChange={(event) => handleInputChange(resourceId, event.target.value)}
        />
      </Box>
    </Flex>
  );
};

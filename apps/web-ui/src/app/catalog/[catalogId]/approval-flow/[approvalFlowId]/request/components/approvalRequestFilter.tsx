"use client";
import React from "react";
import { Flex, Text, Separator, Button } from "@radix-ui/themes";
import { TriangleRightIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { DateRange } from "react-day-picker";
import { useRouter, usePathname } from "next/navigation";
import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { ApprovalFlowInputParam } from "@stamp-lib/stamp-types/models";
import { SelectInputResources } from "@/components/approval-flow/inputResource";
import { SelectApprover } from "@/components/approval-request/selector/selectApprover";
import { SelectStatus } from "@/components/approval-request/selector/selectStatus";
import { InputParameters } from "@/components/approval-request/inputParameters";
import { SelectCalendarDate } from "@/components/approval-request/selector/selectCalendarDate";
import { SelectResources } from "@/components/approval-request/selector/selectResources";

export const ApprovalRequestFilter = ({
  catalogId,
  dateRange,
  groups,
  inputParams,
  inputResources,
}: {
  catalogId: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  groups: Array<Group>;
  inputParams: Array<ApprovalFlowInputParam>;
  inputResources?: SelectInputResources;
}) => {
  const [calenderDate, setCalenderDate] = React.useState<DateRange | undefined>(dateRange);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedStatus, setFilterStatus] = React.useState("");
  const [selectedApproverId, setFilterApproverId] = React.useState("");

  // A Map where the key is a string representing the filter identifier.
  // The value is a string representing the input or selected value.
  const [inputValuesMap, setInputValuesMap] = React.useState<Map<string, string>>(new Map());
  const [selectResourcesMap, setSelectResourcesMap] = React.useState<Map<string, string>>(new Map());

  const onSelectResourceInCatalog = (resourceTypeId: string, parentResourceTypeId: string | undefined, selectedResourceId: string): void => {
    const newMap = new Map(selectResourcesMap);
    newMap.set(resourceTypeId, selectedResourceId);

    // Deselect child resources when the selection of parent resources changes
    inputResources?.forEach((resource) => {
      if (parentResourceTypeId === undefined && resource.parentResourceTypeId === resourceTypeId) {
        newMap.delete(resource.resourceTypeId);
      }
    });

    setSelectResourcesMap(newMap);
  };

  const onParameterInput = (paramId: string, value: string) => {
    const newMap = new Map(inputValuesMap);
    if (value === "") {
      newMap.delete(paramId);
    } else {
      newMap.set(paramId, value);
    }
    setInputValuesMap(newMap);
  };

  const router = useRouter();
  const path = usePathname();

  const onSearch = () => {
    const params = new URLSearchParams();
    const start = calenderDate?.from;
    const end = calenderDate?.to;
    if (!start || !end) {
      return;
    }

    params.set("start", start.toISOString());
    params.set("end", end.toISOString());

    selectedStatus && params.set("status", selectedStatus);
    selectedApproverId && params.set("approverId", selectedApproverId);

    inputValuesMap.forEach((value: string, key: string) => {
      const prefix = "inputParams_";
      const prefixedKey = `${prefix}${key}`;
      params.set(prefixedKey, value);
    });

    selectResourcesMap.forEach((value: string, key: string) => {
      const prefix = "inputResources_";
      const prefixedKey = `${prefix}${key}`;
      params.set(prefixedKey, value);
    });

    router.replace(`${path}?${params.toString()}`);
  };

  const onSearchFiltersReset = () => {
    setCalenderDate(dateRange);
    setFilterStatus("");
    setFilterApproverId("");
    setInputValuesMap(new Map());
    setSelectResourcesMap(new Map());
  };

  return (
    <Flex direction="column" align="start" gap="4" width="100%">
      <Text size="3" mb="-1" weight="light">
        Query by date
      </Text>
      <Flex direction="row" gap="1">
        <SelectCalendarDate dateRange={dateRange} calenderDate={calenderDate} setCalenderDate={setCalenderDate} onSearch={onSearch} />
      </Flex>
      <Separator my="-1" size="4" />
      <Button variant="ghost" onClick={() => setIsFilterOpen(!isFilterOpen)}>
        {isFilterOpen ? <TriangleDownIcon width="16" height="16" /> : <TriangleRightIcon width="16" height="16" />}
        Filters
      </Button>

      {/* filters */}
      {isFilterOpen && (
        <>
          <Flex direction="column" align="start" gap="4" width="100%">
            <SelectApprover groups={groups} selectedApproverId={selectedApproverId} onSelect={setFilterApproverId} />
            <SelectStatus selectedStatus={selectedStatus} onSelect={setFilterStatus} />
            <InputParameters inputParams={inputParams} inputValuesMap={inputValuesMap} onParameterInput={onParameterInput} />
            <SelectResources
              catalogId={catalogId}
              inputResources={inputResources}
              selectResourcesMap={selectResourcesMap}
              onSelect={onSelectResourceInCatalog}
            />
          </Flex>
          <Flex direction="row" align="start" gap="4">
            <Button type="submit" onClick={onSearch}>
              Search
            </Button>
            <Button
              type="submit"
              onClick={() => {
                onSearchFiltersReset();
              }}
            >
              Reset
            </Button>
          </Flex>
          <Separator my="-1" size="4" />
        </>
      )}
    </Flex>
  );
};

"use client";
import React from "react";
import { Flex, Text, Separator, Button } from "@radix-ui/themes";
import { TriangleRightIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { DateRange } from "react-day-picker";
import { useRouter, usePathname } from "next/navigation";
import { Group } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { CatalogInfo } from "@stamp-lib/stamp-types/models";
import { ApprovalFlowInputParam } from "@stamp-lib/stamp-types/models";
import { InputResourceSelectorItems } from "@/components/approval-flow/inputResource";
import { getApprovalFlow } from "@/client-lib/api-clients/approvalFlow";
import { getResourceType } from "@/client-lib/api-clients/resourceType";
import { SelectApprover } from "@/components/approval-request/selector/selectApprover";
import { SelectStatus } from "@/components/approval-request/selector/selectStatus";
import { SelectCatalog } from "./selectCatalog";
import { SelectApprovalFlow } from "./selectApprovalFlow";
import { InputParameters } from "@/components/approval-request/inputParameters";
import { SelectCalendarDate } from "@/components/approval-request/selector/selectCalendarDate";
import { ApprovalFlow } from "@/type";
import { SelectResources } from "@/components/approval-request/selector/selectResources";

export const ApprovalRequestFilter = ({
  dateRange,
  userId,
  groups,
  catalogs,
}: {
  dateRange: {
    from: Date;
    to: Date;
  };
  userId: string;
  groups: Array<Group>;
  catalogs: Array<CatalogInfo>;
}) => {
  const [calenderDate, setCalenderDate] = React.useState<DateRange | undefined>(dateRange);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [selectedApproverId, setSelectedApproverId] = React.useState("");
  const [selectedCatalogId, setSelectedCatalogId] = React.useState<string | undefined>(undefined);

  const [approvalFlows, setApprovalFlows] = React.useState<ApprovalFlow[]>([]);
  const [selectedApprovalFlowId, setSelectedApprovalFlowId] = React.useState<string | undefined>(undefined);

  // Input Parameters and Input Resources for the selected approval flow
  const [inputParams, setInputParams] = React.useState<Array<ApprovalFlowInputParam>>([]);
  const [inputResourceSelectorItems, setInputResourceSelectorItems] = React.useState<InputResourceSelectorItems | undefined>(undefined);

  // A Map where the key is a string representing the filter identifier.
  // The value is a string representing the input or selected value.
  const [inputValuesMap, setInputValuesMap] = React.useState<Map<string, string>>(new Map());
  const [selectResourcesMap, setSelectResourcesMap] = React.useState<Map<string, string>>(new Map());

  const onSelectCatalog = async (catalogId: string) => {
    setSelectedCatalogId(catalogId);
    setSelectedApprovalFlowId(undefined);
    setInputValuesMap(new Map());
    setSelectResourcesMap(new Map());
    setInputParams([]);
    setInputResourceSelectorItems(undefined);
    const approvalFlowsInCatalog = await fetchApprovalFlows(catalogId, catalogs);
    setApprovalFlows(approvalFlowsInCatalog);
  };

  const onSelectApprovalFlow = async (selectApprovalFlowId: string) => {
    setSelectedApprovalFlowId(selectApprovalFlowId);

    const selectedCatalog = catalogs.find((catalog) => catalog.id === selectedCatalogId);
    if (!selectedCatalog) return;

    const approvalFlowInputConfig = await fetchApprovalFlowInputConfig(selectedCatalogId, selectApprovalFlowId, approvalFlows, userId);
    if (!approvalFlowInputConfig) return;

    setInputParams(approvalFlowInputConfig.inputParams);
    setInputResourceSelectorItems(approvalFlowInputConfig.inputResourceSelectorItems);
  };

  const onSelectResourceInCatalog = (resourceTypeId: string, parentResourceTypeId: string | undefined, selectedResourceId: string) => {
    const newMap = new Map(selectResourcesMap);
    newMap.set(resourceTypeId, selectedResourceId);

    // Deselect child resources when the selection of parent resources changes
    inputResourceSelectorItems?.forEach((resource) => {
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
    selectedCatalogId && params.set("catalogId", selectedCatalogId);
    selectedApprovalFlowId && params.set("approvalFlowId", selectedApprovalFlowId);

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
    setSelectedStatus("");
    setSelectedApproverId("");
    setSelectedCatalogId(undefined);
    setSelectedApprovalFlowId(undefined);
    setApprovalFlows([]);
    setInputParams([]);
    setInputResourceSelectorItems(undefined);
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
            <SelectApprover groups={groups} selectedApproverId={selectedApproverId} onSelect={setSelectedApproverId} />
            <SelectStatus selectedStatus={selectedStatus} onSelect={setSelectedStatus} />
            <SelectCatalog catalogs={catalogs} selectedCatalogId={selectedCatalogId} onSelect={onSelectCatalog} />
            <SelectApprovalFlow approvalFlows={approvalFlows} selectedApprovalFlowId={selectedApprovalFlowId} onSelect={onSelectApprovalFlow} />
            <InputParameters inputParams={inputParams} inputValuesMap={inputValuesMap} onParameterInput={onParameterInput} />
            <SelectResources
              catalogId={selectedCatalogId}
              inputResourceSelectorItems={inputResourceSelectorItems}
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

const fetchApprovalFlowInputConfig = async (
  selectedCatalogId: string | undefined,
  selectedApprovalFlowId: string | undefined,
  approvalFlows: ApprovalFlow[],
  userId: string
): Promise<{ inputParams: ApprovalFlowInputParam[]; inputResourceSelectorItems: InputResourceSelectorItems } | undefined> => {
  if (!selectedApprovalFlowId || !selectedCatalogId) {
    return;
  }

  const selectedApprovalFlow = approvalFlows.find((flow) => flow.id === selectedApprovalFlowId);
  if (!selectedApprovalFlow) {
    return;
  }

  const inputParams = [...selectedApprovalFlow.inputParams];
  const inputResources = await fetchInputResourceSelectorItems(selectedApprovalFlow, selectedCatalogId, userId);
  return { inputParams, inputResourceSelectorItems: inputResources };
};

const fetchInputResourceSelectorItems = async (
  { inputResources = [] }: ApprovalFlow,
  catalogId: string,
  requestUserId: string
): Promise<InputResourceSelectorItems> => {
  const resourceTypePromises = inputResources.map((inputResource) =>
    getResourceType({ catalogId, resourceTypeId: inputResource.resourceTypeId, requestUserId }).then((resourceType) => ({
      ...inputResource,
      resourceName: resourceType.name,
    }))
  );

  return Promise.all(resourceTypePromises);
};

const fetchApprovalFlows = async (selectedCatalogId: string, catalogsState: Array<CatalogInfo>): Promise<ApprovalFlow[]> => {
  const selectedCatalog = catalogsState.find((catalog) => catalog.id === selectedCatalogId);
  if (!selectedCatalog) return [];

  const approvalFlowsPromises = selectedCatalog.approvalFlowIds.map((approvalFlowId) => getApprovalFlow({ catalogId: selectedCatalogId, approvalFlowId }));
  const approvalFlows = await Promise.all(approvalFlowsPromises);
  return approvalFlows;
};

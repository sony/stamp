/**
 * Parses FormData to extract InfoParams for resource updates
 */
export function parseInfoParamsFromFormData(formData: FormData): Record<string, string | number | boolean | string[]> {
  const infoParams: Record<string, string | number | boolean | string[]> = {};
  const formDataEntries = Array.from(formData.entries());

  // Collect array type markers
  const arrayTypeParams = new Set<string>();
  for (const [key] of formDataEntries) {
    if (key.startsWith("arrayParam_")) {
      const paramId = key.replace("arrayParam_", "");
      arrayTypeParams.add(paramId);
    }
  }

  // Group form entries by parameter ID
  const groupedParams: Record<string, string[]> = {};
  for (const [key, value] of formDataEntries) {
    if (key.startsWith("infoParam_")) {
      const paramId = key.replace("infoParam_", "");
      if (!groupedParams[paramId]) {
        groupedParams[paramId] = [];
      }
      groupedParams[paramId].push(value.toString());
    }
  }

  // Process grouped parameters
  for (const [paramId, values] of Object.entries(groupedParams)) {
    if (arrayTypeParams.has(paramId)) {
      // This parameter is marked as array type, always treat as array
      infoParams[paramId] = values.filter((v) => v.trim() !== "");
    } else if (values.length === 1) {
      // Single value - could be string, number, boolean, or comma-separated string[]
      const singleValue = values[0];
      if (singleValue.includes(",")) {
        // Legacy comma-separated format
        infoParams[paramId] = singleValue
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v !== "");
      } else {
        infoParams[paramId] = singleValue;
      }
    } else {
      // Multiple values - this is a string[] with dynamic fields
      infoParams[paramId] = values.filter((v) => v.trim() !== "");
    }
  }

  return infoParams;
}

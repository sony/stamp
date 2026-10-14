import { RequesterGroupIds, ResourceVisibility } from "@stamp-lib/stamp-types/models";

/**
 * Dedupe requester group ids. An empty array is normalized to `undefined`
 * so that the DB attribute is removed instead of storing an empty list.
 */
export function normalizeRequesterGroupIds(requesterGroupIds: RequesterGroupIds | undefined): RequesterGroupIds | undefined {
  if (requesterGroupIds === undefined) {
    return undefined;
  }
  const unique = Array.from(new Set(requesterGroupIds));
  return unique.length === 0 ? undefined : unique;
}

/**
 * "all" is the default visibility and is stored as `undefined`.
 */
export function normalizeVisibility(visibility: ResourceVisibility | undefined): ResourceVisibility | undefined {
  return visibility === "restricted" ? "restricted" : undefined;
}

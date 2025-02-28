import { ApprovalFlowInfo, ApproverType, PendingRequest, SubmittedRequest, ValidationFailedRequest } from "@stamp-lib/stamp-types/models";
import { StampHubError, convertStampHubError } from "../../error";
import { ApprovalFlowDBProvider, ApprovalRequestDBProvider, ResourceDBProvider } from "@stamp-lib/stamp-types/pluginInterface/database";
import { GetNotificationPluginConfig } from "@stamp-lib/stamp-types/configInterface";
import { z } from "zod";
import { parseZodObjectAsync } from "../../utils/neverthrow";
import { ResultAsync, errAsync, okAsync } from "neverthrow";

import { CatalogConfigProvider } from "@stamp-lib/stamp-types/configInterface";
import { createGetCatalogConfig } from "../../events/catalog/catalogConfig";

import { createSubmitApprovalRequest } from "../../events/approval-request/actions/submit";
import { getApprovalFlowConfig } from "../../events/approval-flow/approvalFlowConfig";
import { createValidateApprovalRequest } from "../../events/approval-request/actions/validate";
import { GetGroup } from "@stamp-lib/stamp-types/pluginInterface/identity";
import { Logger } from "@stamp-lib/stamp-logger";
import { validateAutoRevokeDurationTime } from "../../events/approval-request/actions/autoRevoke";
import { CreateSchedulerEvent } from "@stamp-lib/stamp-types/pluginInterface/scheduler";

export const SubmitWorkflowInput = SubmittedRequest.omit({ requestId: true, status: true, requestDate: true, approverType: true, approverId: true });
export type SubmitWorkflowInput = z.infer<typeof SubmitWorkflowInput>;

export const submitWorkflow =
  (
    providers: {
      getCatalogConfigProvider: CatalogConfigProvider["get"];
      setApprovalRequestDBProvider: ApprovalRequestDBProvider["set"];
      getApprovalFlowById: ApprovalFlowDBProvider["getById"];
      getResourceById: ResourceDBProvider["getById"];
      getGroup: GetGroup;
      getNotificationPluginConfig: GetNotificationPluginConfig;
      createSchedulerEvent?: CreateSchedulerEvent;
    },
    logger: Logger
  ) =>
  (input: SubmitWorkflowInput): ResultAsync<PendingRequest | ValidationFailedRequest, StampHubError> => {
    const {
      getCatalogConfigProvider,
      setApprovalRequestDBProvider,
      getApprovalFlowById,
      getResourceById,
      getGroup,
      getNotificationPluginConfig,
      createSchedulerEvent,
    } = providers;

    const getCatalogConfig = createGetCatalogConfig(getCatalogConfigProvider);
    const submitApprovalRequest = createSubmitApprovalRequest(setApprovalRequestDBProvider);

    return parseZodObjectAsync(input, SubmitWorkflowInput)
      .andThen(getCatalogConfig)
      .andThen(getApprovalFlowConfig)
      .andThen((parsedInput) => {
        if (parsedInput.autoRevokeDuration) {
          // Check autoRevokeDuration is set but autoRevoke is not enabled
          if (parsedInput.approvalFlowConfig.autoRevoke === undefined) {
            return errAsync(
              new StampHubError(
                "autoRevokeDuration is set but autoRevoke is not enabled",
                "autoRevokeDuration is set but autoRevoke is not enabled",
                "BAD_REQUEST"
              )
            );
          }
          // Check autoRevokeDuration.enabled is true.
          if (!parsedInput.approvalFlowConfig.autoRevoke.enabled) {
            return errAsync(
              new StampHubError(
                "autoRevokeDuration is set but autoRevoke is not enabled",
                "autoRevokeDuration is set but autoRevoke is not enabled",
                "BAD_REQUEST"
              )
            );
          }

          // Check autoRevokeDuration is set but createSchedulerEvent is not enabled
          if (createSchedulerEvent === undefined) {
            return errAsync(
              new StampHubError(
                "AutoRevokeDuration is set but createSchedulerEvent is not enabled.",
                "AutoRevokeDuration is set but createSchedulerEvent is not enabled. Please contact stamp administrator.",
                "INTERNAL_SERVER_ERROR"
              )
            );
          }
          const maxDuration = parsedInput.approvalFlowConfig.autoRevoke.defaultSettings.maxDuration ?? "P30DT24H"; // Currently, maxDuration is 30 days and 24 hours.
          const validateResult = validateAutoRevokeDurationTime(logger)(parsedInput.autoRevokeDuration, maxDuration);
          if (validateResult.isErr()) {
            return errAsync(validateResult.error);
          }
          return okAsync(parsedInput);
        }
        // Check autoRevokeDuration is required but not set
        if (parsedInput.approvalFlowConfig.autoRevoke?.defaultSettings.required === true) {
          return errAsync(new StampHubError("autoRevokeDuration is required but not set", "autoRevokeDuration is required but not set", "BAD_REQUEST"));
        }

        return okAsync(parsedInput);
      })
      .andThen((parsedInput) => {
        // get approval flow info
        return getApprovalFlowById(parsedInput.catalogId, parsedInput.approvalFlowId).andThen((approvalFlow) => {
          if (approvalFlow.isNone()) {
            const approvalFlowInfo: ApprovalFlowInfo = { ...parsedInput.approvalFlowConfig, catalogId: parsedInput.catalogId };
            return okAsync({
              ...parsedInput,
              approvalFlowInfo,
            });
          } else {
            const approvalFlowInfo: ApprovalFlowInfo = { ...parsedInput.approvalFlowConfig, ...approvalFlow.value };
            return okAsync({ ...parsedInput, approvalFlowInfo });
          }
        });
      })
      .andThen((extendInput) => {
        // Set approverType and approverId
        // TODO : refactor this function to move to other file.
        const approvalFlowInfo = extendInput.approvalFlowInfo;
        const targetApprover = approvalFlowInfo.approver;

        if (targetApprover.approverType === "approvalFlow" && approvalFlowInfo.approverGroupId) {
          const approverType: ApproverType = "group";
          const approverId = approvalFlowInfo.approverGroupId;

          return okAsync({ ...extendInput, approverType, approverId });
        } else if (targetApprover.approverType === "resource") {
          const approverResourceTypeId = targetApprover.resourceTypeId;
          const targetResource = extendInput.inputResources.find((resource) => resource.resourceTypeId === approverResourceTypeId);
          if (targetResource === undefined) {
            return errAsync(new StampHubError("Target approverResourceTypeId not found", "Target approverResourceTypeId Not Found", "BAD_REQUEST"));
          }
          return getResourceById({ id: targetResource.resourceId, catalogId: extendInput.catalogId, resourceTypeId: targetResource.resourceTypeId }).andThen(
            (resource) => {
              if (resource.isNone()) {
                // resource is none means that approverGroupId is not set.
                return errAsync(new StampHubError("Resource approverGroupId is not set", "Resource approverGroupId is not set", "BAD_REQUEST"));
              } else if (resource.value.approverGroupId === undefined) {
                return errAsync(new StampHubError("Resource approverGroupId is not set", "Resource approverGroupId is not set", "BAD_REQUEST"));
              } else {
                const approverType: ApproverType = "group";
                const approverId = resource.value.approverGroupId;

                return okAsync({ ...extendInput, approverType, approverId });
              }
            }
          );
        } else {
          // Return Internal server error because nothing ApproverType is unexpected.
          return errAsync(new StampHubError("ApproverType is not set", "ApproverType is not set", "INTERNAL_SERVER_ERROR"));
        }
      })
      .andThen((extendInput) => {
        return submitApprovalRequest(extendInput).map((submittedApprovalRequest) => {
          return { ...extendInput, ...submittedApprovalRequest };
        });
      })
      .andThen((extendSubmittedApprovalRequest) => {
        const validateApprovalRequest = createValidateApprovalRequest(
          extendSubmittedApprovalRequest.approvalFlowConfig.handlers.approvalRequestValidation,
          setApprovalRequestDBProvider
        );
        return validateApprovalRequest(extendSubmittedApprovalRequest);
      })
      .andThen((validatedRequest) => {
        // If validation failed, not send notification.
        if (validatedRequest.status === "validationFailed") {
          return okAsync(validatedRequest);
        } else {
          return getGroup({ groupId: validatedRequest.approverId }).andThen((group) => {
            if (group.isNone()) {
              logger.error("Group not found", { groupId: validatedRequest.approverId });
              return okAsync(validatedRequest);
            }
            const notificationChannels = group.value.approvalRequestNotifications ?? [];
            const sendNotificationResults = [];
            for (const notificationChannel of notificationChannels) {
              sendNotificationResults.push(
                getNotificationPluginConfig(notificationChannel.notificationChannel.typeId).andThen((notificationConfig) => {
                  if (notificationConfig.isNone()) {
                    logger.error("NotificationConfig not found", { notificationChannel });
                    return okAsync(undefined);
                  }
                  return notificationConfig.value.handlers.sendNotification({
                    message: {
                      type: "ApprovalRequestEvent",
                      property: {
                        request: validatedRequest,
                      },
                    },
                    channel: notificationChannel.notificationChannel,
                  });
                })
              );
            }

            return ResultAsync.combine(sendNotificationResults).map(() => {
              return validatedRequest;
            });
          });
        }
      })
      .mapErr(convertStampHubError);
  };

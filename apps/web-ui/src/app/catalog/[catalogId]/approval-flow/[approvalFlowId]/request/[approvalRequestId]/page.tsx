import { Flex, Text, Grid, Box, Card, Container, Link, Heading, Separator, Badge, Popover, IconButton } from "@radix-ui/themes";
import { ChevronRightIcon, CheckCircledIcon, CrossCircledIcon, TriangleDownIcon, ChatBubbleIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { stampHubClient, unwrapOr, cacheStampHubClient } from "@/utils/stampHubClient";
import { notFound } from "next/navigation";
import { ApprovalRequest, ApprovalFlow } from "@/type";
import { getSessionUser } from "@/utils/sessionUser";
import { GroupLink } from "@/server-components/group/groupLink";
import { ApprovalForm } from "@/components/approval-request/approvalForm";
import { RevokeForm } from "@/components/approval-request/revokeForm";
import React from "react";
import { createServerLogger } from "@/logger";
import { StatusBadge } from "@/components/approval-request/statusBadge";
import { Logger } from "@stamp-lib/stamp-logger";

type ResourceInfos = { resourceId: string; resourceName: string; resourceTypeId: string; resourceTypeName: string }[];

export default async function Page({ params }: { params: { approvalFlowId: string; catalogId: string; approvalRequestId: string } }) {
  const userSession = await getSessionUser();
  const logger = createServerLogger();

  const catalogId = decodeURIComponent(params.catalogId);
  const approvalFlowId = decodeURIComponent(params.approvalFlowId);
  const catalog = await unwrapOr(stampHubClient.userRequest.catalog.get.query(catalogId), undefined);
  if (!catalog) return notFound();
  const approvalFlow = await unwrapOr(stampHubClient.userRequest.approvalFlow.get.query({ catalogId: catalogId, approvalFlowId: approvalFlowId }), undefined);
  if (!approvalFlow) return notFound();
  const approvalRequests = await unwrapOr(
    stampHubClient.userRequest.approvalRequest.get.query({ approvalRequestId: params.approvalRequestId, requestUserId: userSession.stampUserId }),
    undefined
  );
  if (!approvalRequests) return notFound();

  return (
    <Flex direction="column" gap="4" pb="6">
      <Box pt="4" pb="6" px="6" className="bg-gray-2">
        <Container size="4">
          <Flex direction="column" gap="4">
            <Flex direction="row" gap="2" align="center">
              <Link href="/">Home</Link>
              <ChevronRightIcon />
              <Link href="/catalog">Catalog</Link>
              <ChevronRightIcon />
              <Link href={`/catalog/${encodeURIComponent(catalog.id)}`}> {catalog.name} </Link>
              <ChevronRightIcon />
              Approval Flow
              <ChevronRightIcon />
              {approvalFlow.name}
              <ChevronRightIcon />
              <Link href={`/catalog/${encodeURIComponent(catalog.id)}/approval-flow/${encodeURIComponent(approvalFlowId)}/request`}> Requests </Link>
              <ChevronRightIcon />
              <Text>Request</Text>
            </Flex>
            <Text size="8">{approvalFlow.name} Request</Text>
          </Flex>
        </Container>
      </Box>
      <Overview approvalRequest={approvalRequests} approvalFlow={approvalFlow} logger={logger} />
      <Timeline approvalRequest={approvalRequests} />
      {approvalRequests.status === "pending" && <ApprovalForm approvalRequest={approvalRequests} />}
      {(approvalRequests.status === "approved" || approvalRequests.status == "approvedActionSucceeded") && (
        <RevokeForm approvalRequest={approvalRequests} enableRevoke={approvalFlow.enableRevoke ?? false} />
      )}
    </Flex>
  );
}

async function Overview({ approvalRequest, approvalFlow, logger }: { approvalRequest: ApprovalRequest; approvalFlow: ApprovalFlow; logger: Logger }) {
  return (
    <Container size="3" px="8">
      <Card variant="classic">
        <Flex direction="column" gap="4">
          <Heading as="h2">Overview</Heading>
          <Grid columns="3" gap="3" width="auto">
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="2">
                <Heading size="3">Status</Heading>
                <Flex>
                  <StatusBadge status={approvalRequest.status} />
                </Flex>
              </Flex>
              <Flex direction="column" gap="2">
                <Heading size="3">Requester</Heading>
                <UserName userId={approvalRequest.requestUserId} />
              </Flex>
              <Flex direction="column" gap="2">
                <Heading size="3">Approver</Heading>
                <GroupLink groupId={approvalRequest.approverId} />
              </Flex>

              {approvalRequest.autoRevokeDuration &&
                approvalRequest.status === "pending" && ( // Display auto revoke duration only when the request is pending for usability
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <Heading size="3">Duration Until Auto Revoke</Heading>
                      <Badge color="amber" size="1">
                        Preview
                      </Badge>
                    </Flex>
                    <Text size="3">{formatDurationToReadable(approvalRequest.autoRevokeDuration)}</Text>
                  </Flex>
                )}
              {approvalRequest.autoRevokeDuration &&
                approvalRequest.status === "approvedActionSucceeded" && ( // Display auto revoke duration only when the request is approved because the date is determined only after approval
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <Heading size="3">Scheduled Revoke Date</Heading>
                      <Badge color="amber" size="1">
                        Preview
                      </Badge>
                    </Flex>
                    <Text size="3">{calculateAutoRevokeDate(logger)(approvalRequest.approvedDate, approvalRequest.autoRevokeDuration)}</Text>
                  </Flex>
                )}
            </Flex>
            <Flex>
              <Flex>
                <Separator orientation="vertical" size="4" />
              </Flex>
              <Flex pl="4" direction="column" gap="4" width="100%">
                {(() => {
                  return approvalRequest.inputParams.map((inputParam) => {
                    return (
                      <Flex direction="column" gap="2" key={inputParam.id}>
                        <Heading size="3">{matchParamName(inputParam.id, approvalFlow)}</Heading>
                        <Text size="3">{convertInputParamValue(inputParam.value)}</Text>
                      </Flex>
                    );
                  });
                })()}
              </Flex>
            </Flex>
            <Flex>
              <Flex>
                <Separator orientation="vertical" size="4" />
              </Flex>
              <Flex pl="4" direction="column" gap="4" width="100%">
                {await (async () => {
                  const inputResourceInfos = await getInputResourceInfos(approvalRequest);
                  return inputResourceInfos.map((inputResourceInfo) => {
                    return (
                      <Flex direction="column" gap="2" key={`${inputResourceInfo.resourceId}_${inputResourceInfo.resourceTypeId}`}>
                        <Heading size="3">{inputResourceInfo.resourceTypeName}</Heading>
                        <Flex align="center" gap="2">
                          <Text size="3">{inputResourceInfo.resourceName}</Text>
                          <Popover.Root>
                            <Popover.Trigger>
                              <IconButton size="1" variant="ghost" radius="full">
                                <InfoCircledIcon />
                              </IconButton>
                            </Popover.Trigger>
                            <Popover.Content size="1">
                              <Text>ID : {inputResourceInfo.resourceId}</Text>
                            </Popover.Content>
                          </Popover.Root>
                        </Flex>
                      </Flex>
                    );
                  });
                })()}
              </Flex>
            </Flex>
          </Grid>
        </Flex>
      </Card>
    </Container>
  );
}

async function Timeline({ approvalRequest }: { approvalRequest: ApprovalRequest }) {
  return (
    <Container size="3" px="8">
      <Card>
        <Flex direction="column" gap="6">
          <Heading as="h3">Timeline</Heading>
          <Flex direction="column" gap="4" px="2">
            {(approvalRequest.status === "pending" ||
              approvalRequest.status === "validationFailed" ||
              approvalRequest.status === "approved" ||
              approvalRequest.status === "approvedActionSucceeded" ||
              approvalRequest.status === "approvedActionFailed" ||
              approvalRequest.status === "revoked" ||
              approvalRequest.status === "revokedActionSucceeded" ||
              approvalRequest.status === "revokedActionFailed" ||
              approvalRequest.status === "rejected") && (
              <TimelineContent
                timelineState="Request"
                isSuccess={approvalRequest.validationHandlerResult.isSuccess}
                message={approvalRequest.validationHandlerResult.message}
                userId={approvalRequest.requestUserId}
                date={approvalRequest.requestDate}
                comment={approvalRequest.requestComment}
              />
            )}

            {(approvalRequest.status === "approved" ||
              approvalRequest.status === "approvedActionSucceeded" ||
              approvalRequest.status === "approvedActionFailed" ||
              approvalRequest.status === "revoked" ||
              approvalRequest.status === "revokedActionSucceeded" ||
              approvalRequest.status === "revokedActionFailed") && (
              <TimelineContent
                timelineState="Approved"
                isSuccess={approvalRequest?.approvedHandlerResult?.isSuccess}
                message={approvalRequest?.approvedHandlerResult?.message}
                userId={approvalRequest.userIdWhoApproved}
                date={approvalRequest.approvedDate}
                comment={approvalRequest.approvedComment}
              />
            )}

            {approvalRequest.status === "rejected" && (
              <TimelineContent
                timelineState="Rejected"
                userId={approvalRequest.userIdWhoRejected}
                date={approvalRequest.rejectedDate}
                comment={approvalRequest.rejectComment}
              />
            )}

            {(approvalRequest.status === "revoked" ||
              approvalRequest.status === "revokedActionSucceeded" ||
              approvalRequest.status === "revokedActionFailed") && (
              <TimelineContent
                timelineState="Revoked"
                isSuccess={approvalRequest.revokedHandlerResult?.isSuccess}
                message={approvalRequest.revokedHandlerResult?.message}
                userId={approvalRequest.userIdWhoRevoked}
                date={approvalRequest.revokedDate}
                comment={approvalRequest.revokedComment}
              />
            )}
          </Flex>
        </Flex>
      </Card>
    </Container>
  );
}

function convertInputParamValue(value: string | number | boolean) {
  if (typeof value === "boolean") {
    return value.toString();
  }
  return value;
}

async function UserName({ userId }: { userId: string }) {
  const user = await unwrapOr(cacheStampHubClient.systemRequest.user.get.query({ userId: userId }), undefined);
  return <React.Fragment> {user?.userName ?? userId}</React.Fragment>;
}

function matchParamName(id: string, approvalFlow: ApprovalFlow) {
  const parameter = approvalFlow.inputParams.find((param) => param.id === id);
  return parameter?.name ?? id;
}

async function getInputResourceInfos(approvalRequest: ApprovalRequest) {
  const logger = createServerLogger();
  const inputResourceInfos: ResourceInfos = [];
  for (const inputResource of approvalRequest.inputResources) {
    const resourceType = await unwrapOr(
      stampHubClient.userRequest.resourceType.get.query({
        catalogId: approvalRequest.catalogId,
        resourceTypeId: inputResource.resourceTypeId,
        requestUserId: approvalRequest.requestUserId,
      }),
      undefined
    );
    if (!resourceType) {
      logger.error(`Resource Type ${inputResource} is not found in catalog ${approvalRequest.catalogId}`);
    }
    const resource = await unwrapOr(
      stampHubClient.userRequest.resource.get.query({
        resourceId: inputResource.resourceId,
        resourceTypeId: inputResource.resourceTypeId,
        requestUserId: approvalRequest.requestUserId,
        catalogId: approvalRequest.catalogId,
      }),
      undefined
    );
    if (!resource) {
      logger.error(`Resource ${inputResource} is not found in catalog ${approvalRequest.catalogId}`);
    }
    inputResourceInfos.push({
      resourceId: inputResource.resourceId,
      resourceName: resource ? resource.name : inputResource.resourceId,
      resourceTypeId: inputResource.resourceTypeId,
      resourceTypeName: resourceType ? resourceType.name : inputResource.resourceTypeId,
    });
  }
  return inputResourceInfos;
}

function TimelineContent(
  props:
    | {
        // For approvalRequest that status is "pending" or "validationFailed" or "approvedActionSucceeded" or "approvedActionFailed" or "revokedActionSucceeded" or "revokedActionFailed"
        timelineState: "Request" | "Approved" | "Revoked";
        isSuccess: boolean;
        message: string;
        userId: string;
        date: string;
        comment: string;
      }
    | {
        // For approvalRequest that status is "approved"  or "revoked"
        timelineState: "Approved" | "Revoked";
        isSuccess: boolean | undefined;
        message: string | undefined;
        userId: string;
        date: string;
        comment: string;
      }
    | {
        // For approvalRequest that status is "rejected"
        timelineState: "Rejected";
        userId: string;
        date: string;
        comment: string;
      }
) {
  return (
    <Flex direction="column" gap="2">
      {props.timelineState !== "Request" && (
        <Flex direction="row">
          <Flex justify="center" pl="5" style={{ width: "130px", minWidth: "100px" }}>
            <TriangleDownIcon width="30px" height="28px" />
          </Flex>
          <Flex gap="2" direction="column" pl="6" width="100%" style={{ minWidth: "450px" }}></Flex>
        </Flex>
      )}
      <Flex direction="row">
        <Flex justify="center" pl="5" style={{ width: "130px", minWidth: "100px" }}>
          <Text size="5" weight="medium">
            {props.timelineState}
          </Text>
        </Flex>
        <Flex gap="2" direction="column" pl="6" pr="9" width="100%" style={{ minWidth: "450px" }}>
          {props.timelineState !== "Rejected" && props.isSuccess !== undefined && props.message !== undefined && (
            <Flex direction="row">
              <Flex>
                {props.isSuccess ? <CheckCircledIcon width="30px" height="28px" color="green" /> : <CrossCircledIcon width="30px" height="28px" color="red" />}
              </Flex>
              <Flex pl="2" pt="1">
                <Text size="2">
                  {props.message.split(/\r?\n/).map((line: string, index: number) => (
                    <React.Fragment key={index}>
                      {line}
                      <br />
                    </React.Fragment>
                  ))}
                </Text>
              </Flex>
            </Flex>
          )}

          <Flex direction="column" gap="2">
            <Card>
              <Flex direction="column" gap="2">
                <Grid columns="2">
                  <Flex>
                    <UserName userId={props.userId} />
                  </Flex>
                  <Flex justify="end">
                    <Text>{props.date}</Text>
                  </Flex>
                </Grid>
                <Separator orientation="horizontal" size="4" />
                <Flex>
                  <Text color="brown" size="1">
                    <Flex direction="row" align="center" gap="1">
                      <ChatBubbleIcon />
                      Comment
                    </Flex>
                  </Text>
                </Flex>
                <Flex pl="2">
                  <Text size="2">
                    {props.comment.split(/\r?\n/).map((line: string, index: number) => (
                      <React.Fragment key={index}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </Text>
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}

// Function to convert ISO 8601 duration format to human-readable format
const formatDurationToReadable = (duration: string): string => {
  try {
    // Parse ISO 8601 duration format like "P7D" (7 days) or "PT12H" (12 hours) or "P3DT3H" (3 days and 3 hours)
    const durationMatch = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/);
    if (!durationMatch) return duration; // Return original if format doesn't match

    const days = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
    const hours = durationMatch[2] ? parseInt(durationMatch[2]) : 0;

    if (days === 0 && hours === 0) return "0 hours";
    if (days === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    if (hours === 0) return `${days} ${days === 1 ? "day" : "days"}`;
    return `${days} ${days === 1 ? "day" : "days"} and ${hours} ${hours === 1 ? "hour" : "hours"}`;
  } catch (error) {
    return duration; // Return original if parsing fails
  }
};

const calculateAutoRevokeDate = (logger: Logger) => (approvedDate: string, autoRevokeDuration: string) => {
  try {
    if (!approvedDate) return "Not available";

    const approvedDateObj = new Date(approvedDate);
    if (isNaN(approvedDateObj.getTime())) return "Not available";

    // Parse ISO 8601 duration format like "P7D" (7 days) or "PT12H" (12 hours)
    const durationMatch = autoRevokeDuration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/);
    if (!durationMatch) return "Not available";

    const days = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
    const hours = durationMatch[2] ? parseInt(durationMatch[2]) : 0;

    const revokeTime = new Date(approvedDateObj);
    revokeTime.setDate(revokeTime.getDate() + days);
    revokeTime.setHours(revokeTime.getHours() + hours);

    // Format the date for display
    return revokeTime.toLocaleString("en-US", { timeZoneName: "short" });
  } catch (error) {
    logger.error("Error calculating auto revoke date:", error);
    return "Not available";
  }
};

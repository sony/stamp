import { createServerLogger } from "@/logger";
import { Badge } from "@radix-ui/themes";

export function StatusBadge({ status }: { status: string }) {
  const logger = createServerLogger();
  switch (status) {
    case "validationFailed":
      return (
        <Badge color="red" variant="soft" radius="full" size="2">
          Validation Failed
        </Badge>
      );
    case "pending":
      return (
        <Badge color="orange" variant="soft" radius="full" size="2">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge color="green" variant="soft" radius="full" size="2">
          Approved
        </Badge>
      );
    case "approvedActionSucceeded":
      return (
        // For usability, we should show the same badge as "Approved"
        <Badge color="green" variant="soft" radius="full" size="2">
          Approved
        </Badge>
      );
    case "approvedActionFailed":
      return (
        <Badge color="red" variant="soft" radius="full" size="2">
          Approved Action Failed
        </Badge>
      );
    case "rejected":
      return (
        <Badge color="red" variant="soft" radius="full" size="2">
          Rejected
        </Badge>
      );
    case "revoked":
      return (
        <Badge color="gray" variant="soft" radius="full" size="2">
          Revoked
        </Badge>
      );
    case "revokedActionSucceeded":
      return (
        // For usability, we should show the same badge as "Revoked"
        <Badge color="gray" variant="soft" radius="full" size="2">
          Revoked
        </Badge>
      );
    case "revokedActionFailed":
      return (
        <Badge color="red" variant="soft" radius="full" size="2">
          Revoked Action Failed
        </Badge>
      );
    default:
      logger.error(`${status} is unknown status`);
      return (
        <Badge color="red" variant="soft" radius="full" size="2">
          {status}
        </Badge>
      );
  }
}

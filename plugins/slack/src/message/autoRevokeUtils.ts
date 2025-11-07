// Parse ISO 8601 duration format (e.g., "P7D" for 7 days, "PT12H" for 12 hours, "P1DT2H" for 1 day 2 hours)
export const parseAutoRevokeDuration = (duration: string): { days: number; hours: number } | null => {
  const durationMatch = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?)?$/);
  if (durationMatch) {
    const days = durationMatch[1] ? parseInt(durationMatch[1]) : 0;
    const hours = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
    return { days, hours };
  }
  return null;
};

// Format duration as human-readable text (e.g., "7 days", "12 hours", "1 day and 2 hours")
export const formatAutoRevokeDuration = (autoRevokeDuration: string): string | null => {
  const parsed = parseAutoRevokeDuration(autoRevokeDuration);
  if (!parsed) {
    return null;
  }

  const { days, hours } = parsed;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }

  return parts.length > 0 ? parts.join(" and ") : null;
};

// Calculate when access would be revoked if approved now
export const calculateAutoRevokeDate = (autoRevokeDuration: string): string | null => {
  const parsed = parseAutoRevokeDuration(autoRevokeDuration);
  if (!parsed) {
    return null;
  }

  const { days, hours } = parsed;
  const revokeTime = new Date();
  revokeTime.setDate(revokeTime.getDate() + days);
  revokeTime.setHours(revokeTime.getHours() + hours);

  // Format the date for display in Slack (include timezone for clarity)
  return revokeTime.toLocaleString("en-US", {
    timeZoneName: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

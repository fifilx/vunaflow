export const STATUS_ORDER = ["submitted", "under_review", "verification", "approved", "disbursed"];

export function statusColor(status: string): string {
  switch (status) {
    case "approved":
    case "disbursed":
      return "green";
    case "rejected":
      return "red";
    case "draft":
      return "slate";
    case "verification":
    case "under_review":
      return "amber";
    case "submitted":
      return "blue";
    default:
      return "slate";
  }
}

export function statusProgress(status: string): number {
  if (status === "rejected") return 100;
  const idx = STATUS_ORDER.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STATUS_ORDER.length) * 100);
}

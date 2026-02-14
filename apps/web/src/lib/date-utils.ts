import { format, formatDistanceToNow } from "date-fns";

export function safeDate(date: any): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

export function safeFormat(date: any, fmt: string, fallback = "N/A"): string {
  const parsed = safeDate(date);
  if (!parsed) return fallback;
  try {
    return format(parsed, fmt);
  } catch (e) {
    return fallback;
  }
}

export function safeFormatDistanceToNow(date: any, options?: { addSuffix?: boolean }, fallback = "recently"): string {
  const parsed = safeDate(date);
  if (!parsed) return fallback;
  try {
    return formatDistanceToNow(parsed, options);
  } catch (e) {
    return fallback;
  }
}

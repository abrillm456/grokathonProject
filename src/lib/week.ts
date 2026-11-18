import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { enUS } from "date-fns/locale";

export const TIME_ZONE = "America/New_York";

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Saturday, Nov 21, 2026, 6:00 PM America/New_York. The seeded week is already underway. */
export const DEMO_NOW = fromZonedTime("2026-11-21T18:00:00", TIME_ZONE);

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function weekStartISO(date: Date): string {
  const weekday = formatInTimeZone(date, TIME_ZONE, "EEE", { locale: enUS });
  const ymd = formatInTimeZone(date, TIME_ZONE, "yyyy-MM-dd", { locale: enUS });
  const index = WEEKDAY_INDEX[weekday];
  if (index === undefined) {
    throw new Error(`Unexpected weekday label: ${weekday}`);
  }
  return addCalendarDays(ymd, -index);
}

export function nextWeekStart(weekStart: string): string {
  return addCalendarDays(weekStart, 7);
}

/** Exclusive end instant: the following Monday at 00:00 America/New_York. */
export function weekEndExclusive(weekStart: string): Date {
  return fromZonedTime(`${nextWeekStart(weekStart)}T00:00:00`, TIME_ZONE);
}

export function weekEndInclusive(weekStart: string): Date {
  return new Date(weekEndExclusive(weekStart).getTime() - 1000);
}

export function isInWeek(iso: string, weekStart: string): boolean {
  const time = new Date(iso).getTime();
  const start = fromZonedTime(`${weekStart}T00:00:00`, TIME_ZONE).getTime();
  return time >= start && time < weekEndExclusive(weekStart).getTime();
}

export function formatCountdown(now: Date, weekStart: string): string {
  const remaining = weekEndExclusive(weekStart).getTime() - now.getTime();
  if (remaining <= 0) return "Week complete";
  const totalMinutes = Math.floor(remaining / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0 || days > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function formatWeekRange(weekStart: string): string {
  const end = addCalendarDays(weekStart, 6);
  return `${formatPrettyDate(weekStart)} – ${formatPrettyDate(end)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatPrettyDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function formatDateTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TIME_ZONE, "EEE, MMM d · h:mm a", { locale: enUS });
}

export function toDateTimeLocalValue(iso: string): string {
  return formatInTimeZone(new Date(iso), TIME_ZONE, "yyyy-MM-dd'T'HH:mm", { locale: enUS });
}

export function fromDateTimeLocalValue(value: string): string {
  return fromZonedTime(value, TIME_ZONE).toISOString();
}

export function nyDayKey(iso: string): string {
  return formatInTimeZone(new Date(iso), TIME_ZONE, "yyyy-MM-dd", { locale: enUS });
}

export function weekDayKeys(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index));
}

export function weekdayShort(isoDate: string): string {
  const index = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const monday = weekStartISO(fromZonedTime(`${isoDate}T12:00:00`, TIME_ZONE));
  const [year, month, day] = isoDate.split("-").map(Number);
  const [my, mm, md] = monday.split("-").map(Number);
  const diff = Math.round(
    (Date.UTC(year, month - 1, day) - Date.UTC(my, mm - 1, md)) / 86400000,
  );
  return index[diff] ?? "";
}

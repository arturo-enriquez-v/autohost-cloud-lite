export function parseCron(cron: string) {
  const parts = (cron || "").trim().split(/\s+/);
  if (parts.length < 5) {
    return { interval: "daily" as const, time: "03:00", dayOfWeek: "0", dayOfMonth: "1" };
  }
  const [min, hour, dom, , dow] = parts;
  const mm = (parseInt(min, 10) || 0).toString().padStart(2, "0");
  const hh = (parseInt(hour, 10) || 0).toString().padStart(2, "0");
  const time = `${hh}:${mm}`;

  if (dom !== "*" && dom !== "?") {
    return { interval: "monthly" as const, time, dayOfWeek: "0", dayOfMonth: dom };
  }
  if (dow !== "*" && dow !== "?") {
    return { interval: "weekly" as const, time, dayOfWeek: dow, dayOfMonth: "1" };
  }
  return { interval: "daily" as const, time, dayOfWeek: "0", dayOfMonth: "1" };
}

export function buildCron(
  interval: "daily" | "weekly" | "monthly",
  time: string,
  dayOfWeek: string,
  dayOfMonth: string
): string {
  const [hh, mm] = (time || "03:00").split(":").map((v) => parseInt(v, 10) || 0);
  if (interval === "monthly") {
    return `${mm} ${hh} ${dayOfMonth || "1"} * *`;
  }
  if (interval === "weekly") {
    return `${mm} ${hh} * * ${dayOfWeek || "0"}`;
  }
  return `${mm} ${hh} * * *`;
}

export function getScheduleSummary(
  interval: "daily" | "weekly" | "monthly",
  time: string,
  dayOfWeek: string,
  dayOfMonth: string
): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (interval === "monthly") {
    const d = parseInt(dayOfMonth, 10) || 1;
    const suffix = d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`;
    return `Every month on the ${suffix} at ${time} UTC`;
  }
  if (interval === "weekly") {
    const dayName = days[parseInt(dayOfWeek, 10) || 0] || "Sunday";
    return `Every week on ${dayName} at ${time} UTC`;
  }
  return `Daily at ${time} UTC`;
}

export function formatSnapshotDateFromKey(s3Key?: string): string {
  if (!s3Key) return "";
  const match = s3Key.match(/_(\d{8})_(\d{6})/);
  if (match) {
    const rawDate = match[1];
    const rawTime = match[2];
    const yyyy = rawDate.substring(0, 4);
    const mm = rawDate.substring(4, 6);
    const dd = rawDate.substring(6, 8);
    const HH = rawTime.substring(0, 2);
    const MM = rawTime.substring(2, 4);
    const SS = rawTime.substring(4, 6);
    return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS} UTC`;
  }
  const dateMatch = s3Key.match(/(\d{4}-\d{2}-\d{2})[T_](\d{2}-\d{2}-\d{2}|\d{6})/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const timeStr = dateMatch[2].replace(/-/g, ":");
    return `${dateStr} ${timeStr}`;
  }
  return s3Key.split("/").pop() || "";
}

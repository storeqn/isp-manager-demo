const DAY = 86400000;
export const today = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
};
export function dayNumber(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("التاريخ غير صحيح");
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1900 || y > 2200) throw new Error("السنة يجب أن تكون بين 1900 و2200");
  const ms = Date.UTC(y, m - 1, d);
  if (new Date(ms).toISOString().slice(0, 10) !== value)
    throw new Error("التاريخ غير صحيح");
  return ms / DAY;
}
export const isDate = (value) => {
  try {
    dayNumber(value);
    return true;
  } catch {
    return false;
  }
};
export function addDays(value, amount) {
  if (
    !Number.isInteger(Number(amount)) ||
    Number(amount) < 1 ||
    Number(amount) > 3650
  )
    throw new Error("المدة يجب أن تكون من 1 إلى 3650 يوم");
  const result = new Date((dayNumber(value) + Number(amount)) * DAY)
    .toISOString()
    .slice(0, 10);
  dayNumber(result);
  return result;
}
export const daysLeft = (value, current = today()) =>
  dayNumber(value) - dayNumber(current);
export const formatDate = (value) =>
  isDate(value) ? value.split("-").reverse().join("/") : "—";
export const formatTime = (value) =>
  new Intl.DateTimeFormat("ar-IQ", {
    timeZone: "Asia/Baghdad",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

import { isDate, dayNumber, addDays } from "./dateService.js";
export function validateSubscriber(s, subscribers, packages) {
  const errors = {};
  if (!String(s.name || "").trim()) errors.name = "أدخل الاسم الكامل";
  if (!String(s.username || "").trim()) errors.username = "أدخل اسم المستخدم";
  else if (!/^[a-zA-Z0-9_.@-]{3,64}$/.test(s.username.trim()))
    errors.username = "استخدم 3–64 حرفاً إنكليزياً أو رقماً أو _.@-";
  else if (
    subscribers.some(
      (x) =>
        x.id !== s.id &&
        x.username.toLowerCase() === s.username.trim().toLowerCase(),
    )
  )
    errors.username = "اسم المستخدم مستخدم مسبقاً";
  if (!String(s.password || "").trim())
    errors.password = "أدخل كلمة مرور تجريبية";
  if (s.phone && !/^\+?[\d ()-]{7,20}$/.test(s.phone))
    errors.phone = "رقم الهاتف غير صحيح";
  if (!packages.some((x) => x.id === s.packageId))
    errors.packageId = "اختر باقة متاحة";
  for (const k of ["download", "upload"])
    if (
      !Number.isFinite(Number(s[k])) ||
      Number(s[k]) <= 0 ||
      Number(s[k]) > 10000
    )
      errors[k] = "السرعة يجب أن تكون أكبر من صفر وحتى 10000 Mbps";
  if (
    !Number.isInteger(Number(s.duration)) ||
    Number(s.duration) < 1 ||
    Number(s.duration) > 3650
  )
    errors.duration = "المدة يجب أن تكون من 1 إلى 3650 يوم";
  if (!isDate(s.activationDate))
    errors.activationDate = "اختر تاريخ تفعيل صحيحاً";
  if (
    (s.ip &&
      !s.ip.split(".").every((x) => /^\d{1,3}$/.test(x) && Number(x) <= 255)) ||
    (s.ip && s.ip.split(".").length !== 4)
  )
    errors.ip = "أدخل عنوان IPv4 صحيحاً";
  if (!Object.keys(errors).length) {
    try {
      addDays(s.activationDate, Number(s.duration));
    } catch {
      errors.duration = "المدة تتجاوز نطاق التواريخ المدعوم";
    }
  }
  return errors;
}
export function validatePackage(p, packages) {
  const errors = {};
  if (!String(p.name || "").trim()) errors.name = "أدخل اسم الباقة";
  else if (
    packages.some(
      (x) =>
        x.id !== p.id &&
        x.name.trim().toLowerCase() === p.name.trim().toLowerCase(),
    )
  )
    errors.name = "اسم الباقة موجود مسبقاً";
  for (const k of ["download", "upload"])
    if (
      !Number.isFinite(Number(p[k])) ||
      Number(p[k]) <= 0 ||
      Number(p[k]) > 10000
    )
      errors[k] = "أدخل سرعة بين 0 و10000 أكبر من صفر";
  if (
    !Number.isInteger(Number(p.duration)) ||
    Number(p.duration) < 1 ||
    Number(p.duration) > 3650
  )
    errors.duration = "أدخل مدة صحيحة من 1 إلى 3650 يوم";
  if (
    p.price !== "" &&
    p.price !== null &&
    (!Number.isFinite(Number(p.price)) || Number(p.price) < 0)
  )
    errors.price = "أدخل سعراً صحيحاً أو اتركه فارغاً";
  return errors;
}
export function validateSettings(s) {
  if (
    !s ||
    typeof s !== "object" ||
    typeof s.networkName !== "string" ||
    !s.networkName.trim() ||
    typeof s.systemName !== "string" ||
    !s.systemName.trim() ||
    !["IQD", "USD"].includes(s.currency) ||
    !Number.isInteger(s.defaultDuration) ||
    s.defaultDuration < 1 ||
    s.defaultDuration > 3650 ||
    !Number.isInteger(s.warningDays) ||
    s.warningDays < 1 ||
    s.warningDays > 365 ||
    typeof s.showPrices !== "boolean" ||
    typeof s.notificationsEnabled !== "boolean"
  )
    throw new Error("إعدادات غير صالحة");
}
export function validateBackup(data) {
  if (
    !data ||
    data.schemaVersion !== 1 ||
    data.app !== "isp-manager-demo" ||
    !Array.isArray(data.subscribers) ||
    !Array.isArray(data.packages) ||
    !Array.isArray(data.renewals) ||
    !Array.isArray(data.activities) ||
    !Array.isArray(data.notifications) ||
    !Array.isArray(data.generatedKeys)
  )
    throw new Error("الملف ليس نسخة احتياطية صالحة لهذا النظام");
  validateSettings(data.settings);
  const unique = (rows) =>
    rows.every((x) => x && typeof x.id === "string" && x.id.length > 0) &&
    new Set(rows.map((x) => x.id)).size === rows.length;
  for (const rows of [
    data.subscribers,
    data.packages,
    data.renewals,
    data.activities,
    data.notifications,
  ])
    if (!unique(rows)) throw new Error("معرّفات مكررة أو غير صالحة");
  for (const p of data.packages)
    if (
      Object.keys(validatePackage(p, data.packages)).length ||
      typeof p.name !== "string" ||
      typeof p.download !== "number" ||
      typeof p.upload !== "number" ||
      typeof p.duration !== "number" ||
      (p.price !== null && typeof p.price !== "number")
    )
      throw new Error("بيانات الباقات غير صالحة");
  for (const s of data.subscribers) {
    if (
      Object.keys(validateSubscriber(s, data.subscribers, data.packages))
        .length ||
      !isDate(s.expiryDate) ||
      dayNumber(s.expiryDate) <= dayNumber(s.activationDate) ||
      typeof s.suspended !== "boolean" ||
      typeof s.online !== "boolean" ||
      !Number.isFinite(s.usageGB) ||
      s.usageGB < 0 ||
      typeof s.notes !== "string" ||
      typeof s.phone !== "string" ||
      typeof s.password !== "string" ||
      typeof s.username !== "string" ||
      typeof s.name !== "string" ||
      typeof s.ip !== "string" ||
      typeof s.download !== "number" ||
      typeof s.upload !== "number" ||
      !Number.isInteger(s.duration) ||
      !validTimestamp(s.createdAt)
    )
      throw new Error("بيانات المشتركين غير صالحة");
  }
  for (const x of data.activities)
    if (
      typeof x.type !== "string" ||
      typeof x.message !== "string" ||
      typeof x.subscriberName !== "string" ||
      !(x.subscriberId === null || typeof x.subscriberId === "string") ||
      !validTimestamp(x.at)
    )
      throw new Error("سجل العمليات غير صالح");
  for (const x of data.notifications)
    if (
      typeof x.message !== "string" ||
      typeof x.read !== "boolean" ||
      !(x.subscriberId === null || typeof x.subscriberId === "string") ||
      !validTimestamp(x.at)
    )
      throw new Error("التنبيهات غير صالحة");
  for (const x of data.renewals)
    if (
      typeof x.subscriberId !== "string" ||
      !Number.isInteger(x.days) ||
      x.days < 1 ||
      x.days > 3650 ||
      !isDate(x.from) ||
      !isDate(x.to) ||
      addDays(x.from, x.days) !== x.to ||
      !Number.isFinite(x.amount) ||
      x.amount < 0 ||
      !validTimestamp(x.at)
    )
      throw new Error("بيانات التجديدات غير صالحة");
  if (!data.generatedKeys.every((x) => typeof x === "string"))
    throw new Error("بيانات النظام غير صالحة");
  return data;
}
function validTimestamp(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

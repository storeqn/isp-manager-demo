import { today, daysLeft, addDays } from "./dateService.js";
import { validateSubscriber } from "./validationService.js";
import { activityService, uid } from "./activityService.js";
import { notificationService } from "./notificationService.js";
export const statusLabels = {
  active: "فعال",
  soon: "ينتهي قريباً",
  expired: "منتهي",
  suspended: "موقوف",
};
export const subscriberService = {
  status(s, settings, current = today()) {
    const left = daysLeft(s.expiryDate, current);
    return s.suspended
      ? "suspended"
      : left <= 0
        ? "expired"
        : left <= settings.warningDays
          ? "soon"
          : "active";
  },
  isOnline(s, current = today()) {
    return !s.suspended && daysLeft(s.expiryDate, current) > 0 && s.online;
  },
  save(data, input) {
    const errors = validateSubscriber(input, data.subscribers, data.packages);
    if (Object.keys(errors).length)
      throw Object.assign(new Error("تحقق من الحقول المطلوبة"), {
        fields: errors,
      });
    const existing = data.subscribers.find((x) => x.id === input.id);
    const s = {
      ...(existing || {}),
      id: existing?.id || uid("SUB"),
      name: input.name.trim(),
      phone: input.phone.trim(),
      username: input.username.trim(),
      password: input.password,
      ip: input.ip.trim(),
      packageId: input.packageId,
      download: Number(input.download),
      upload: Number(input.upload),
      activationDate: input.activationDate,
      duration: Number(input.duration),
      notes: input.notes.trim(),
      expiryDate:
        existing &&
        existing.activationDate === input.activationDate &&
        existing.duration === Number(input.duration)
          ? existing.expiryDate
          : addDays(input.activationDate, Number(input.duration)),
      suspended: existing?.suspended ?? false,
      online: existing?.online ?? false,
      usageGB: existing?.usageGB ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    if (existing)
      data.subscribers = data.subscribers.map((x) => (x.id === s.id ? s : x));
    else data.subscribers.unshift(s);
    activityService.record(
      data,
      existing ? "تعديل" : "إضافة",
      s,
      `تم ${existing ? "تعديل بيانات" : "إضافة المشترك"} ${s.name}`,
    );
    return s;
  },
  renew(data, id, days = 30, current = today()) {
    const s = this.get(data, id);
    const left = daysLeft(s.expiryDate, current);
    const from = left > 0 ? s.expiryDate : current;
    const to = addDays(from, Number(days));
    if (left <= 0) {
      s.activationDate = current;
      s.duration = Number(days);
    }
    s.expiryDate = to;
    // Renewal updates dates; a deliberate administrative suspension stays in force.
    const p = data.packages.find((x) => x.id === s.packageId);
    data.renewals.unshift({
      id: uid("renew"),
      subscriberId: id,
      days: Number(days),
      from,
      to,
      amount: p?.price ? Math.round((p.price * Number(days)) / p.duration) : 0,
      at: new Date().toISOString(),
    });
    activityService.record(
      data,
      "تجديد",
      s,
      `تم تجديد اشتراك ${s.name} لمدة ${days} يوم`,
    );
    notificationService.add(
      data,
      `تم تجديد اشتراك ${s.name} لمدة ${days} يوم`,
      id,
    );
  },
  get(data, id) {
    const s = data.subscribers.find((x) => x.id === id);
    if (!s) throw new Error("المشترك غير موجود");
    return s;
  },
  suspend(data, id, suspended) {
    const s = this.get(data, id);
    s.suspended = suspended;
    if (suspended) s.online = false;
    activityService.record(
      data,
      suspended ? "إيقاف" : "تفعيل",
      s,
      `تم ${suspended ? "إيقاف" : "إعادة تفعيل"} المشترك ${s.name}`,
    );
  },
  changePackage(data, id, packageId) {
    const s = this.get(data, id);
    const p = data.packages.find((x) => x.id === packageId);
    if (!p) throw new Error("الباقة غير موجودة");
    s.packageId = p.id;
    s.download = p.download;
    s.upload = p.upload;
    activityService.record(
      data,
      "باقة",
      s,
      `تم تغيير باقة ${s.name} إلى ${p.name}`,
    );
  },
  changeSpeed(data, id, download, upload) {
    const s = this.get(data, id);
    const fields = validateSubscriber(
      { ...s, download, upload },
      data.subscribers,
      data.packages,
    );
    if (fields.download || fields.upload)
      throw new Error(fields.download || fields.upload);
    s.download = Number(download);
    s.upload = Number(upload);
    activityService.record(
      data,
      "سرعة",
      s,
      `تم تغيير سرعة ${s.name} إلى ${download}/${upload} Mbps`,
    );
  },
  remove(data, id) {
    const s = this.get(data, id);
    data.subscribers = data.subscribers.filter((x) => x.id !== id);
    data.notifications = data.notifications.filter(
      (x) => x.subscriberId !== id,
    );
    activityService.record(data, "حذف", s, `تم حذف المشترك ${s.name}`);
  },
  query(data, { search = "", filter = "all", sort = "expiry" } = {}) {
    const term = search.trim().toLowerCase();
    const rows = data.subscribers.filter(
      (s) =>
        (!term ||
          [s.name, s.phone, s.username, s.ip].some((v) =>
            v.toLowerCase().includes(term),
          )) &&
        (filter === "all" ||
          (filter === "online" && this.isOnline(s)) ||
          (filter === "offline" && !this.isOnline(s)) ||
          (filter === "active" &&
            ["active", "soon"].includes(this.status(s, data.settings))) ||
          filter === this.status(s, data.settings)),
    );
    return rows.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "ar")
        : sort === "newest"
          ? b.createdAt.localeCompare(a.createdAt)
          : sort === "package"
            ? (
                data.packages.find((p) => p.id === a.packageId)?.name || ""
              ).localeCompare(
                data.packages.find((p) => p.id === b.packageId)?.name || "",
                "ar",
              )
            : a.expiryDate.localeCompare(b.expiryDate),
    );
  },
};

import { validatePackage } from "./validationService.js";
import { uid, activityService } from "./activityService.js";
export const packageService = {
  save(data, input) {
    const fields = validatePackage(input, data.packages);
    if (Object.keys(fields).length)
      throw Object.assign(new Error("تحقق من بيانات الباقة"), { fields });
    const existing = data.packages.find((x) => x.id === input.id);
    const p = {
      id: existing?.id || uid("pkg"),
      name: input.name.trim(),
      download: Number(input.download),
      upload: Number(input.upload),
      duration: Number(input.duration),
      price:
        input.price === "" || input.price === null ? null : Number(input.price),
    };
    if (existing)
      data.packages = data.packages.map((x) => (x.id === p.id ? p : x));
    else data.packages.push(p);
    activityService.record(
      data,
      "باقة",
      null,
      `تم ${existing ? "تعديل" : "إضافة"} باقة ${p.name}`,
    );
    return p;
  },
  remove(data, id) {
    if (data.subscribers.some((x) => x.packageId === id))
      throw new Error("لا يمكن حذف باقة مرتبطة بمشتركين. غيّر باقاتهم أولاً.");
    const p = data.packages.find((x) => x.id === id);
    if (!p) throw new Error("الباقة غير موجودة");
    data.packages = data.packages.filter((x) => x.id !== id);
    activityService.record(data, "باقة", null, `تم حذف باقة ${p.name}`);
  },
};

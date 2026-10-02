import { createSeed } from "./seedService.js";
import { validateBackup } from "./validationService.js";
export const STORAGE_KEY = "isp-manager-demo:v1";
export const storageService = {
  load(storage = localStorage) {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seed = createSeed();
      this.save(seed, storage);
      return seed;
    }
    try {
      return validateBackup(JSON.parse(raw));
    } catch {
      throw new Error(
        "تعذر قراءة البيانات المحفوظة. لن يتم استبدالها تلقائياً. استعد نسخة احتياطية صالحة من الشاشة التالية.",
      );
    }
  },
  save(data, storage = localStorage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error(
        "تعذر حفظ البيانات. تحقق من مساحة التخزين والسماح بالتخزين المحلي.",
      );
    }
  },
  export(data) {
    return JSON.stringify(
      { ...data, exportedAt: new Date().toISOString() },
      null,
      2,
    );
  },
  parseBackup(text) {
    if (text.length > 10 * 1024 * 1024)
      throw new Error("حجم النسخة يتجاوز 10 MB");
    try {
      return validateBackup(JSON.parse(text));
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error("ملف JSON غير صحيح");
      throw e;
    }
  },
};

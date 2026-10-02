import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const BASE = process.env.TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    ...(process.env.BROWSER_SINGLE_PROCESS
      ? ["--single-process", "--no-zygote"]
      : []),
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "ar-IQ",
  timezoneId: "Asia/Baghdad",
});
await context.addInitScript(() => {
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) {
      super(...(args.length ? args : ["2026-10-03T09:00:00.000Z"]));
    }
    static now() {
      return new NativeDate("2026-10-03T09:00:00.000Z").getTime();
    }
  }
  window.Date = FixedDate;
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const checks = [];
const record = (message) => {
  checks.push(message);
  console.log(`PASS ${message}`);
};
const wait = () => page.waitForTimeout(100);
const state = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("isp-manager-demo:v1")));
const go = async (route) => {
  await page.goto(`${BASE}/#${route}`);
  await page.locator("main h1").waitFor();
};
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const dialog = () => page.getByRole("dialog");
try {
  await fs.mkdir("test-results", { recursive: true });
  await page.goto(BASE);
  await page.getByRole("heading", { name: "كل شيء تحت السيطرة" }).waitFor();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  assert.equal((await state()).subscribers.length, 14);
  record("Dashboard, RTL and first-run seed");
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await go("subscribers");
  await click("إضافة مشترك جديد");
  await dialog()
    .getByRole("button", { name: "إضافة المشترك", exact: true })
    .click();
  await dialog().getByText("أدخل الاسم الكامل", { exact: true }).waitFor();
  await dialog().getByText("أدخل اسم المستخدم", { exact: true }).waitFor();
  record("Empty subscriber validation");
  await dialog()
    .getByLabel("الاسم الكامل *", { exact: true })
    .fill("مشترك الفحص");
  await dialog().getByLabel("رقم الهاتف", { exact: true }).fill("07709998877");
  await dialog()
    .getByLabel("اسم المستخدم PPPoE *", { exact: true })
    .fill("demo.user1");
  await dialog()
    .getByLabel("كلمة مرور تجريبية *", { exact: true })
    .fill("demo-test-123");
  await dialog()
    .getByRole("button", { name: "إضافة المشترك", exact: true })
    .click();
  await dialog()
    .getByText("اسم المستخدم مستخدم مسبقاً", { exact: true })
    .waitFor();
  record("Duplicate username prevention");
  await dialog()
    .getByLabel("اسم المستخدم PPPoE *", { exact: true })
    .fill("e2e.subscriber");
  await dialog()
    .getByLabel("عنوان IP (اختياري)", { exact: true })
    .fill("10.0.0.200");
  await dialog()
    .getByLabel("تاريخ التفعيل *", { exact: true })
    .fill("2026-10-03");
  await dialog()
    .getByRole("button", { name: "إضافة المشترك", exact: true })
    .click();
  await dialog().waitFor({ state: "hidden" });
  let s = (await state()).subscribers.find(
    (s) => s.username === "e2e.subscriber",
  );
  assert.equal(s.expiryDate, "2026-11-02");
  record("Subscriber creation and exact expiry preview");
  await page
    .getByRole("textbox", { name: "البحث عن مشترك" })
    .fill("e2e.subscriber");
  await page
    .getByRole("button", { name: "تفاصيل مشترك الفحص", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "مشترك الفحص", exact: true })
    .waitFor();
  await click("تجديد 30 يوم");
  assert.equal(
    (await state()).subscribers.find((x) => x.id === s.id).expiryDate,
    "2026-12-02",
  );
  record("Active renewal adds 30 days to existing expiry");
  await click("تجديد مدة مخصصة");
  await dialog().getByLabel("عدد أيام التجديد", { exact: true }).fill("0");
  await dialog().getByRole("button", { name: "حفظ", exact: true }).click();
  await dialog().getByRole("alert").waitFor();
  await dialog().getByLabel("عدد أيام التجديد", { exact: true }).fill("5");
  await dialog().getByRole("button", { name: "حفظ", exact: true }).click();
  await dialog().waitFor({ state: "hidden" });
  assert.equal(
    (await state()).subscribers.find((x) => x.id === s.id).expiryDate,
    "2026-12-07",
  );
  record("Custom renewal validation and calculation");
  await click("تغيير الباقة");
  await dialog()
    .getByLabel("الباقة الجديدة", { exact: true })
    .selectOption("pkg-4");
  await dialog().getByRole("button", { name: "حفظ", exact: true }).click();
  await dialog().waitFor({ state: "hidden" });
  assert.equal(
    (await state()).subscribers.find((x) => x.id === s.id).download,
    50,
  );
  await click("تغيير السرعة");
  await dialog().getByLabel("التنزيل Mbps", { exact: true }).fill("42");
  await dialog().getByLabel("الرفع Mbps", { exact: true }).fill("11");
  await dialog().getByRole("button", { name: "حفظ", exact: true }).click();
  await dialog().waitFor({ state: "hidden" });
  assert.equal(
    (await state()).subscribers.find((x) => x.id === s.id).download,
    42,
  );
  record("Package and speed changes");
  await click("إيقاف المشترك");
  assert.equal(
    (await state()).subscribers.find((x) => x.id === s.id).suspended,
    true,
  );
  await click("إعادة تفعيل المشترك");
  assert.equal(
    (await state()).subscribers.find((x) => x.id === s.id).suspended,
    false,
  );
  record("Suspend and reactivate");
  await click("تعديل البيانات");
  await dialog()
    .getByLabel("الاسم الكامل *", { exact: true })
    .fill("مشترك الفحص المعدل");
  await dialog()
    .getByRole("button", { name: "حفظ التعديلات", exact: true })
    .click();
  await dialog().waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "مشترك الفحص المعدل", exact: true })
    .waitFor();
  assert.equal(
    (await state()).subscribers.find((x) => x.id === s.id).expiryDate,
    "2026-12-07",
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "مشترك الفحص المعدل", exact: true })
    .waitFor();
  record("Edit preserves renewal and persists after reload");
  await click("حذف المشترك");
  assert.ok((await state()).subscribers.some((x) => x.id === s.id));
  await dialog().getByRole("button", { name: "إلغاء", exact: true }).click();
  assert.ok((await state()).subscribers.some((x) => x.id === s.id));
  record("Delete requires confirmation and can be cancelled");
  await click("حذف المشترك");
  await dialog()
    .getByRole("button", { name: "نعم، حذف المشترك", exact: true })
    .click();
  await page.getByRole("heading", { name: "المشتركون", exact: true }).waitFor();
  assert.ok(!(await state()).subscribers.some((x) => x.id === s.id));
  record("Confirmed delete and retained activity log");
  await go("subscribers");
  for (const [label, key] of [
    ["متصل", "online"],
    ["غير متصل", "offline"],
    ["ينتهي قريباً", "soon"],
    ["منتهي", "expired"],
    ["موقوف", "suspended"],
    ["فعال", "active"],
    ["الكل", "all"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await wait();
    assert.equal(
      await page
        .getByRole("button", { name: label, exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
  }
  for (const sort of ["name", "newest", "package", "expiry"])
    await page
      .getByRole("combobox", { name: "ترتيب المشتركين" })
      .selectOption(sort);
  await page
    .getByRole("textbox", { name: "البحث عن مشترك" })
    .fill("no-such-user");
  await page.getByRole("heading", { name: "لا توجد نتائج مطابقة" }).waitFor();
  record("Search, all filters, sort choices and empty state");
  const expired = (await state()).subscribers.find(
    (x) => x.expiryDate < "2026-10-03" && !x.suspended,
  );
  await go(`subscriber/${expired.id}`);
  await click("تجديد 30 يوم");
  let renewed = (await state()).subscribers.find((x) => x.id === expired.id);
  assert.equal(renewed.activationDate, "2026-10-03");
  assert.equal(renewed.expiryDate, "2026-11-02");
  record("Expired renewal starts today (Baghdad)");
  await go("packages");
  await click("إضافة باقة");
  await dialog().getByLabel("اسم الباقة", { exact: true }).fill("باقة الفحص");
  await dialog().getByLabel("سرعة التنزيل Mbps", { exact: true }).fill("80");
  await dialog().getByLabel("سرعة الرفع Mbps", { exact: true }).fill("20");
  await dialog()
    .getByRole("button", { name: "حفظ الباقة", exact: true })
    .click();
  await dialog().waitFor({ state: "hidden" });
  let pkg = (await state()).packages.find((x) => x.name === "باقة الفحص");
  assert.equal(pkg.price, null);
  let pkgCard = page
    .locator(".package-card")
    .filter({
      has: page.getByRole("heading", { name: "باقة الفحص", exact: true }),
    });
  await pkgCard.getByRole("button", { name: "تعديل", exact: true }).click();
  await dialog()
    .getByLabel("السعر IQD (اختياري)", { exact: true })
    .fill("50000");
  await dialog()
    .getByRole("button", { name: "حفظ الباقة", exact: true })
    .click();
  await dialog().waitFor({ state: "hidden" });
  assert.equal(
    (await state()).packages.find((x) => x.id === pkg.id).price,
    50000,
  );
  await pkgCard.getByRole("button", { name: "حذف", exact: true }).click();
  await dialog()
    .getByRole("button", { name: "حذف الباقة", exact: true })
    .click();
  await dialog().waitFor({ state: "hidden" });
  assert.ok(!(await state()).packages.some((x) => x.id === pkg.id));
  await page
    .locator(".package-card")
    .first()
    .getByRole("button", { name: "حذف", exact: true })
    .click();
  await dialog()
    .getByRole("button", { name: "حذف الباقة", exact: true })
    .click();
  await page
    .getByText("لا يمكن حذف باقة مرتبطة بمشتركين. غيّر باقاتهم أولاً.", {
      exact: true,
    })
    .waitFor();
  record("Package CRUD and linked-package deletion protection");
  await go("notifications");
  await click("قراءة الكل");
  assert.ok((await state()).notifications.every((x) => x.read));
  await click("مسح الكل");
  await dialog().getByRole("button", { name: "مسح الكل", exact: true }).click();
  await dialog().waitFor({ state: "hidden" });
  assert.equal((await state()).notifications.length, 0);
  await page.reload();
  await page.getByRole("heading", { name: "لا توجد تنبيهات" }).waitFor();
  record("Read and clear notifications persist without recreation");
  await go("activity");
  await page
    .getByText("تم حذف المشترك مشترك الفحص المعدل", { exact: true })
    .waitFor();
  await go("reports");
  assert.ok(
    await page
      .getByRole("heading", { name: "توزيع المشتركين حسب الباقة" })
      .isVisible(),
  );
  record("Activity and derived reports");
  await go("settings");
  await page.getByLabel("اسم الشبكة", { exact: true }).fill("شبكة الفحص");
  await click("حفظ الإعدادات");
  assert.equal((await state()).settings.networkName, "شبكة الفحص");
  const downloadPromise = page.waitForEvent("download");
  await click("تصدير نسخة احتياطية");
  const download = await downloadPromise;
  await download.saveAs("test-results/backup.json");
  const backup = JSON.parse(
    await fs.readFile("test-results/backup.json", "utf8"),
  );
  assert.equal(backup.subscribers.length, 14);
  await page
    .getByLabel("ملف النسخة الاحتياطية", { exact: true })
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
  await page
    .getByText("الملف ليس نسخة احتياطية صالحة لهذا النظام", { exact: true })
    .waitFor();
  await page.getByLabel("اسم الشبكة", { exact: true }).fill("تغيير بعد النسخة");
  await click("حفظ الإعدادات");
  await page
    .getByLabel("ملف النسخة الاحتياطية", { exact: true })
    .setInputFiles("test-results/backup.json");
  await dialog()
    .getByRole("heading", { name: "استعادة النسخة الاحتياطية؟" })
    .waitFor();
  assert.equal((await state()).settings.networkName, "تغيير بعد النسخة");
  await dialog()
    .getByRole("button", { name: "استعادة واستبدال البيانات", exact: true })
    .click();
  await dialog().waitFor({ state: "hidden" });
  assert.equal((await state()).settings.networkName, "شبكة الفحص");
  record(
    "Settings, backup download, invalid restore rejection and restore confirmation",
  );
  const before = (await state()).subscribers.length;
  await page.reload();
  assert.equal((await state()).subscribers.length, before);
  for (const width of [375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "dashboard",
      "subscribers",
      "packages",
      "reports",
      "notifications",
      "activity",
      "settings",
      `subscriber/${renewed.id}`,
    ]) {
      await go(route);
      await wait();
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(
        overflow.scroll <= overflow.width + 1,
        `overflow ${width} ${route}: ${JSON.stringify(overflow)}`,
      );
    }
    await go("subscribers");
    if (width <= 900) {
      await page
        .getByRole("button", { name: "فتح القائمة", exact: true })
        .click();
      assert.ok(await page.locator(".sidebar.open").isVisible());
      await page.keyboard.press("Escape");
      await wait();
    }
    await click("إضافة مشترك جديد");
    const bounds = await dialog().boundingBox();
    assert.ok(bounds.width <= width && bounds.x >= 0 && bounds.y >= 0);
    await dialog().getByRole("button", { name: "إغلاق", exact: true }).click();
    await go("dashboard");
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
    record(`Responsive ${width}px, navigation and modal fit`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await go("subscribers");
  await click("إضافة مشترك جديد");
  await page.keyboard.press("Escape");
  assert.equal(await dialog().count(), 0);
  record("Keyboard dialog dismissal");
  const manifest = await (
    await context.request.get(`${BASE}/manifest.webmanifest`)
  ).json();
  assert.equal(manifest.name, "ISP Manager");
  for (const icon of manifest.icons)
    assert.equal(
      (await context.request.get(`${BASE}/${icon.src}`)).status(),
      200,
    );
  record("PWA manifest and icons");
  const reopened = await context.newPage();
  await reopened.goto(BASE);
  await reopened.locator("main h1").waitFor();
  assert.equal(
    (
      await reopened.evaluate(() =>
        JSON.parse(localStorage.getItem("isp-manager-demo:v1")),
      )
    ).settings.networkName,
    "شبكة الفحص",
  );
  await reopened.close();
  record("Reopening a page retains persisted data");
  assert.deepEqual(errors, []);
  record("No browser console/page errors");
  await fs.writeFile(
    "test-results/e2e-results.json",
    JSON.stringify(
      { passed: checks.length, checks, consoleErrors: errors },
      null,
      2,
    ),
  );
  console.log(`\n${checks.length} end-to-end checks passed.`);
} finally {
  await browser.close();
}

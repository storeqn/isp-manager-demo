import { chromium } from "playwright";
import assert from "node:assert/strict";
import { createDb } from "./d1-helper.mjs";
import { handleApi } from "../server/api.js";
const base = process.env.TEST_URL || "http://127.0.0.1:5173";
const secret = "test-only-cloud-session-password";
const env = { DB: createDb(), ADMIN_PASSWORD: secret };
const browsers = [];
const errors = [];
let failWrites = false;
async function context() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      ...(process.env.BROWSER_SINGLE_PROCESS
        ? ["--single-process", "--no-zygote"]
        : []),
    ],
  });
  browsers.push(browser);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ar-IQ",
    timezoneId: "Asia/Baghdad",
  });
  await ctx.route("**/api/**", async (route) => {
    const req = route.request();
    if (failWrites && req.method() === "PUT") return route.abort("failed");
    const headers = await req.allHeaders();
    const response = await handleApi({
      env,
      request: new Request(req.url(), {
        method: req.method(),
        headers,
        ...(req.postData() ? { body: req.postData() } : {}),
      }),
    });
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
  return { ctx, page };
}
const click = (page, name) =>
  page.getByRole("button", { name, exact: true }).click();
async function login(page, password = secret) {
  await page.getByLabel("كلمة مرور الإدارة", { exact: true }).fill(password);
  await click(page, "تسجيل الدخول");
}
async function subscribers(page) {
  await page.goto(`${base}/#subscribers`);
  await page.reload();
  await page.getByRole("heading", { name: "المشتركون", exact: true }).waitFor();
}
try {
  const first = await context();
  const second = await context();
  await first.page.goto(base);
  await first.page
    .getByRole("heading", { name: "تسجيل دخول الإدارة" })
    .waitFor();
  await login(first.page, "wrong");
  await first.page
    .getByRole("alert")
    .filter({ hasText: "كلمة المرور غير صحيحة" })
    .waitFor();
  await login(first.page);
  await first.page
    .getByRole("heading", { name: "تهيئة مساحة العمل المشتركة" })
    .waitFor();
  const localBefore = await first.page.evaluate(() =>
    localStorage.getItem("isp-manager-demo:v1"),
  );
  await click(first.page, "نقل بيانات هذا الجهاز");
  await first.page
    .getByRole("heading", { name: "كل شيء تحت السيطرة" })
    .waitFor();
  assert.equal(
    env.DB.sql.prepare("SELECT revision FROM app_state").get().revision,
    1,
  );
  assert.equal(
    await first.page.evaluate(() =>
      localStorage.getItem("isp-manager-demo:v1"),
    ),
    localBefore,
  );
  await second.page.goto(base);
  await login(second.page);
  await second.page
    .getByRole("heading", { name: "كل شيء تحت السيطرة" })
    .waitFor();
  await subscribers(first.page);
  await click(first.page, "إضافة مشترك جديد");
  const form = first.page.getByRole("dialog");
  await form.getByLabel("الاسم الكامل *", { exact: true }).fill("مشترك سحابي");
  await form
    .getByLabel("اسم المستخدم PPPoE *", { exact: true })
    .fill("cloud.test");
  await form
    .getByLabel("كلمة مرور تجريبية *", { exact: true })
    .fill("demo-only");
  await form
    .getByRole("button", { name: "إضافة المشترك", exact: true })
    .click();
  await form.waitFor({ state: "hidden" });
  assert.equal(
    JSON.parse(env.DB.sql.prepare("SELECT data FROM app_state").get().data)
      .subscribers.length,
    15,
  );
  await subscribers(second.page);
  await second.page.locator(".subscriber-cards").getByText("مشترك سحابي", { exact: true }).waitFor();
  assert.equal(
    await second.page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await second.page.locator(".subscriber-cards").getByText("مشترك سحابي", { exact: true }).click();
  await click(second.page, "تجديد 30 يوم");
  await second.page
    .getByText("تم تجديد الاشتراك لمدة 30 يوم", { exact: true })
    .waitFor();
  // The first tab still has the earlier revision: a write is rejected and refreshed.
  await first.page.locator(".subscriber-cards").getByText("مشترك سحابي", { exact: true }).click();
  await click(first.page, "إيقاف المشترك");
  await first.page
    .getByText(/تغيّرت البيانات على جهاز آخر/)
    .first()
    .waitFor();
  await click(first.page, "إيقاف المشترك");
  await first.page.getByText("تم إيقاف المشترك", { exact: true }).waitFor();
  failWrites = true;
  await click(first.page, "إعادة تفعيل المشترك");
  await first.page
    .getByText(/تعذر تأكيد العملية/)
    .first()
    .waitFor();
  assert.equal(
    JSON.parse(
      env.DB.sql.prepare("SELECT data FROM app_state").get().data,
    ).subscribers.find((x) => x.username === "cloud.test").suspended,
    true,
  );
  failWrites = false;
  await first.page.reload();
  await first.page
    .getByRole("heading", { name: "مشترك سحابي", exact: true })
    .waitFor();
  await click(first.page, "خروج");
  await first.page
    .getByRole("heading", { name: "تسجيل دخول الإدارة" })
    .waitFor();
  await first.page.reload();
  await first.page
    .getByRole("heading", { name: "تسجيل دخول الإدارة" })
    .waitFor();
  await login(first.page);
  await first.page
    .getByRole("heading", { name: "مشترك سحابي", exact: true })
    .waitFor();
  await click(first.page, "حذف المشترك");
  await click(first.page, "نعم، حذف المشترك");
  await first.page
    .getByRole("heading", { name: "المشتركون", exact: true })
    .waitFor();
  await subscribers(second.page);
  assert.equal(
    await second.page.locator(".subscriber-cards").getByText("مشترك سحابي", { exact: true }).count(),
    0,
  );
  assert.equal(
    await first.page.evaluate(() =>
      localStorage.getItem("isp-manager-demo:v1"),
    ),
    localBefore,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS cloud login, wrong password, confirmed import, separate sessions, subscriber CRUD, renewal, conflict protection, failed save feedback, refresh, logout, local backup preservation, mobile 390px and no page errors.",
  );
} finally {
  for (const browser of browsers) await browser.close();
  env.DB.sql.close();
}

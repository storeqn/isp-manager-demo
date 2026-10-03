import { chromium } from "playwright";
import assert from "node:assert/strict";
const url = process.env.TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    ...(process.env.BROWSER_SINGLE_PROCESS
      ? ["--single-process", "--no-zygote"]
      : []),
  ],
});
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(url);
  await page.locator(".sidebar").waitFor({ state: "attached" });
  await page.locator("main h1").waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.reload();
  await page.locator(".sidebar").waitFor({ state: "attached" });
  await page.locator("main h1").waitFor();
  for (const route of ["packages", "settings", "reports"]) {
    await page.goto(`${url}/#${route}`);
    await page.locator(".sidebar").waitFor({ state: "attached" });
    await page.locator("main h1").waitFor();
  }
  const before = await page.evaluate(() =>
    localStorage.getItem("isp-manager-demo:v1"),
  );
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "التقارير", exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("isp-manager-demo:v1")),
    before,
  );
  await page.getByRole("button", { name: "الرئيسية", exact: true }).click();
  await page.getByRole("heading", { name: "كل شيء تحت السيطرة" }).waitFor();
  await context.setOffline(false);
  await page.reload();
  await page.getByRole("heading", { name: "كل شيء تحت السيطرة" }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("isp-manager-demo:v1")),
    before,
  );
  const worker = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return { scope: r.scope, active: !!r.active };
  });
  assert.ok(worker.active);
  const cachedApi = await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      if ((await cache.keys()).some(request => new URL(request.url).pathname.startsWith("/api/"))) return true;
    }
    return false;
  });
  assert.equal(cachedApi, false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS production service worker registration, offline reload of visited pages, persistence and online reload",
  );
} finally {
  await browser.close();
}

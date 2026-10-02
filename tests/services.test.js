import test from "node:test";
import assert from "node:assert/strict";
import {
  today,
  addDays,
  dayNumber,
  daysLeft,
  formatDate,
} from "../src/services/dateService.js";
import { createSeed } from "../src/services/seedService.js";
import { subscriberService } from "../src/services/subscriberService.js";
import { packageService } from "../src/services/packageService.js";
import { notificationService } from "../src/services/notificationService.js";
import { reportService } from "../src/services/reportService.js";
import { storageService, STORAGE_KEY } from "../src/services/storageService.js";
import {
  validateBackup,
  validateSubscriber,
  validateSettings,
} from "../src/services/validationService.js";
const fresh = () => createSeed();
const make = (data, overrides = {}) => ({
  name: "مشترك اختبار",
  phone: "07701234567",
  username: "test.user",
  password: "demo-password",
  ip: "10.0.0.99",
  packageId: data.packages[0].id,
  download: 10,
  upload: 3,
  activationDate: "2026-10-02",
  duration: 30,
  notes: "",
  ...overrides,
});

test("dates: Baghdad midnight, exact 30 days, leap years, invalid dates", () => {
  assert.equal(today(new Date("2026-10-02T21:01:00Z")), "2026-10-03");
  assert.equal(today(new Date("2026-10-02T20:59:00Z")), "2026-10-02");
  assert.equal(addDays("2026-10-02", 30), "2026-11-01");
  assert.equal(addDays("2026-10-10", 30), "2026-11-09");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(formatDate("2026-10-02"), "02/10/2026");
  assert.equal(daysLeft("2026-10-03", "2026-10-03"), 0);
  for (const value of ["2026-02-29", "2026-13-01", "2026-00-01", "03/10/2026"])
    assert.throws(() => dayNumber(value));
  for (const value of [0, -1, 1.5, NaN, 3651])
    assert.throws(() => addDays("2026-10-02", value));
});
test("subscriber CRUD, username uniqueness, input validation and audit", () => {
  const d = fresh();
  const s = subscriberService.save(d, make(d));
  assert.equal(d.subscribers.length, 15);
  assert.equal(s.expiryDate, "2026-11-01");
  assert.throws(
    () => subscriberService.save(d, make(d, { username: "TEST.USER" })),
    (e) => !!e.fields.username,
  );
  for (const [field, value] of [
    ["name", ""],
    ["username", ""],
    ["password", ""],
    ["download", 0],
    ["upload", "abc"],
    ["duration", 1.3],
    ["activationDate", "2026-02-30"],
    ["ip", "256.1.2.3"],
  ])
    assert.ok(
      validateSubscriber(
        make(d, { [field]: value }),
        d.subscribers,
        d.packages,
      )[field],
    );
  const edited = subscriberService.save(d, {
    ...s,
    name: "الاسم المعدل",
    upload: 7,
  });
  assert.equal(edited.name, "الاسم المعدل");
  assert.equal(edited.upload, 7);
  subscriberService.remove(d, s.id);
  assert.equal(d.subscribers.length, 14);
  assert.ok(
    d.activities.some((x) => x.type === "حذف" && x.subscriberId === s.id),
  );
});
test("renewal: active from expiry, expired from current date, audit and original prices", () => {
  const d = fresh();
  const s = subscriberService.save(
    d,
    make(d, { activationDate: "2026-09-10" }),
  );
  subscriberService.renew(d, s.id, 30, "2026-10-02");
  assert.equal(s.expiryDate, "2026-11-09");
  assert.equal(d.renewals[0].amount, 25000);
  const edited = subscriberService.save(d, { ...s, name: "تعديل بعد التجديد" });
  assert.equal(edited.expiryDate, "2026-11-09");
  subscriberService.renew(d, edited.id, 30, "2026-12-01");
  assert.equal(edited.activationDate, "2026-12-01");
  assert.equal(edited.expiryDate, "2026-12-31");
  const expiry = edited.expiryDate;
  assert.throws(() => subscriberService.renew(d, edited.id, 0));
  assert.equal(edited.expiryDate, expiry);
  const due = subscriberService.save(
    d,
    make(d, { username: "due.user", activationDate: "2026-09-02" }),
  );
  subscriberService.renew(d, due.id, 30, "2026-10-02");
  assert.equal(due.expiryDate, "2026-11-01");
});
test("suspend/reactivate, package and custom speeds update audit without dates", () => {
  const d = fresh();
  const s = subscriberService.save(d, make(d));
  s.online = true;
  assert.equal(subscriberService.isOnline(s, "2026-10-03"), true);
  subscriberService.suspend(d, s.id, true);
  assert.equal(s.online, false);
  assert.equal(
    subscriberService.status(s, d.settings, "2026-10-03"),
    "suspended",
  );
  subscriberService.renew(d, s.id, 30, "2026-10-03");
  assert.equal(s.suspended, true);
  subscriberService.suspend(d, s.id, false);
  assert.equal(subscriberService.status(s, d.settings, "2026-10-03"), "active");
  const expiry = s.expiryDate;
  subscriberService.changePackage(d, s.id, d.packages[3].id);
  assert.equal(s.download, 50);
  assert.equal(s.upload, 15);
  assert.equal(s.expiryDate, expiry);
  subscriberService.changeSpeed(d, s.id, 22.5, 6);
  assert.equal(s.download, 22.5);
  assert.throws(() => subscriberService.changeSpeed(d, s.id, -1, 5));
});
test("boundary states and expiry checks close sessions and emit once", () => {
  const d = fresh();
  const s = subscriberService.save(d, make(d));
  assert.equal(subscriberService.status(s, d.settings, "2026-10-24"), "active");
  assert.equal(subscriberService.status(s, d.settings, "2026-10-25"), "soon");
  assert.equal(
    subscriberService.status(s, d.settings, "2026-11-01"),
    "expired",
  );
  s.online = true;
  notificationService.sync(d, "2026-11-01");
  assert.equal(s.online, false);
  const notices = d.notifications.length;
  const logs = d.activities.length;
  notificationService.sync(d, "2026-11-01");
  assert.equal(d.notifications.length, notices);
  assert.equal(d.activities.length, logs);
  notificationService.clear(d);
  notificationService.sync(d, "2026-11-01");
  assert.equal(d.notifications.length, 0);
});
test("search all fields, filtering, ordering and no mutation of collection", () => {
  const d = fresh();
  const s = subscriberService.save(d, make(d));
  for (const term of ["مشترك اختبار", "07701234567", "TEST.USER", "10.0.0.99"])
    assert.equal(subscriberService.query(d, { search: term })[0].id, s.id);
  assert.equal(
    subscriberService.query(d, { search: "missing-name" }).length,
    0,
  );
  const ids = d.subscribers.map((x) => x.id);
  subscriberService.query(d, { sort: "name" });
  assert.deepEqual(
    d.subscribers.map((x) => x.id),
    ids,
  );
  for (const key of ["soon", "expired", "suspended"])
    assert.ok(
      subscriberService
        .query(d, { filter: key })
        .every((s) => subscriberService.status(s, d.settings) === key),
    );
  const total =
    subscriberService.query(d, { filter: "online" }).length +
    subscriberService.query(d, { filter: "offline" }).length;
  assert.equal(total, d.subscribers.length);
});
test("package CRUD, optional price, validation, referenced-package protection", () => {
  const d = fresh();
  const p = packageService.save(d, {
    name: "خاصة",
    download: 80,
    upload: 20,
    duration: 60,
    price: "",
  });
  assert.equal(p.price, null);
  const edited = packageService.save(d, { ...p, price: 50000 });
  assert.equal(edited.price, 50000);
  assert.throws(() => packageService.save(d, { ...edited, upload: 0 }));
  assert.throws(() => packageService.remove(d, d.packages[0].id));
  packageService.remove(d, p.id);
  assert.ok(!d.packages.some((x) => x.id === p.id));
});
test("notification read/delete/settings and report aggregates", () => {
  const d = fresh();
  notificationService.sync(d);
  assert.ok(d.notifications.length > 0);
  notificationService.markRead(d, d.notifications[0].id);
  assert.ok(d.notifications[0].read);
  notificationService.markAllRead(d);
  assert.ok(d.notifications.every((x) => x.read));
  const id = d.notifications[0].id;
  notificationService.remove(d, id);
  assert.ok(!d.notifications.some((x) => x.id === id));
  const n = d.notifications.length;
  d.settings.notificationsEnabled = false;
  notificationService.add(d, "disabled");
  assert.equal(d.notifications.length, n);
  const r = reportService.summary(d);
  assert.equal(r.total, 14);
  assert.equal(r.active + r.expired + r.suspended, 14);
  assert.equal(r.online + r.offline, 14);
  assert.equal(
    r.byPackage.reduce((n, p) => n + p.count, 0),
    14,
  );
  assert.throws(() => validateSettings({ ...d.settings, warningDays: 0 }));
});
test("backup roundtrip, deep validation, corrupt input rejection, seed once including empty state", () => {
  const map = new Map();
  const storage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
  const d = storageService.load(storage);
  assert.equal(d.subscribers.length, 14);
  d.subscribers = [];
  storageService.save(d, storage);
  assert.equal(storageService.load(storage).subscribers.length, 0);
  const original = fresh();
  notificationService.sync(original);
  subscriberService.renew(original, original.subscribers[0].id);
  const parsed = storageService.parseBackup(storageService.export(original));
  assert.deepEqual(parsed.subscribers, original.subscribers);
  assert.deepEqual(parsed.renewals, original.renewals);
  assert.throws(() => storageService.parseBackup("broken-json"));
  assert.throws(() => storageService.parseBackup("{}"));
  for (const change of [
    (d) => (d.subscribers[0].expiryDate = "2026-02-30"),
    (d) => (d.packages[0].price = -1),
    (d) => d.subscribers.push(d.subscribers[0]),
    (d) => (d.notifications[0].read = "false"),
    (d) => (d.settings.warningDays = -1),
    (d) => (d.renewals[0].to = "2026-10-02"),
  ]) {
    const c = structuredClone(original);
    change(c);
    assert.throws(() => validateBackup(c));
  }
  map.set(STORAGE_KEY, "invalid");
  assert.throws(() => storageService.load(storage));
  assert.equal(map.get(STORAGE_KEY), "invalid");
  assert.throws(() =>
    storageService.save(original, {
      setItem: () => {
        throw Error("QuotaExceeded");
      },
    }),
  );
});

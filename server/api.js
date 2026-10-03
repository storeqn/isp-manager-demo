import { validateBackup } from "../src/services/validationService.js";
const encoder = new TextEncoder();
const MAX_BYTES = 512 * 1024;
const COOKIE = "isp_session";
const SESSION_SECONDS = 12 * 60 * 60;
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extra,
    },
  });
const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};
const encode = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
async function key(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function sign(value, secret) {
  return encode(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await key(secret),
        encoder.encode(value),
      ),
    ),
  );
}
async function equal(a, b) {
  const hashes = await Promise.all(
    [a, b].map((x) => crypto.subtle.digest("SHA-256", encoder.encode(x))),
  );
  const [left, right] = hashes.map((x) => new Uint8Array(x));
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}
export async function authenticated(request, secret, now = Date.now()) {
  const token = request.headers
    .get("Cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!token || token.length > 250) return false;
  const [expiry, nonce, signature, extra] = token.split(".");
  if (
    extra ||
    !/^\d{10}$/.test(expiry || "") ||
    !/^[a-f0-9]{32}$/.test(nonce || "") ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature || "")
  )
    return false;
  const seconds = Math.floor(now / 1000);
  if (Number(expiry) <= seconds || Number(expiry) > seconds + SESSION_SECONDS)
    return false;
  return equal(signature, await sign(`isp-session:${expiry}.${nonce}`, secret));
}
async function readBody(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    fail("نوع الطلب غير صحيح", 415);
  if (Number(request.headers.get("Content-Length")) > MAX_BYTES)
    fail("البيانات تتجاوز 512 KB لهذه النسخة التجريبية", 413);
  const reader = request.body?.getReader();
  if (!reader) fail("الطلب فارغ", 400);
  const chunks = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      fail("البيانات تتجاوز 512 KB لهذه النسخة التجريبية", 413);
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    fail("ملف JSON غير صحيح", 400);
  }
}
async function rateLimit(request, db, secret) {
  // CF-Connecting-IP is supplied by Cloudflare in production. No raw IP is stored.
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const bucket = Math.floor(Date.now() / 900000);
  const ipKey = await sign(`login-ip:${ip}`, secret);
  const results = await db.batch([
    db.prepare("DELETE FROM login_limits WHERE bucket < ?").bind(bucket - 1),
    db
      .prepare(
        "INSERT INTO login_limits (key, bucket, attempts) VALUES (?, ?, 1) ON CONFLICT (key, bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts",
      )
      .bind(ipKey, bucket),
    db
      .prepare(
        "INSERT INTO login_limits (key, bucket, attempts) VALUES ('global', ?, 1) ON CONFLICT (key, bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts",
      )
      .bind(bucket),
  ]);
  if (
    results[1].results[0].attempts > 10 ||
    results[2].results[0].attempts > 1000
  )
    fail("محاولات دخول كثيرة. حاول بعد 15 دقيقة", 429);
}
function cookie(value, request, maxAge = SESSION_SECONDS) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
export async function handleApi({ request, env }) {
  try {
    const path = new URL(request.url).pathname;
    const configured =
      !!env.DB &&
      typeof env.ADMIN_PASSWORD === "string" &&
      env.ADMIN_PASSWORD.length >= 16 &&
      env.ADMIN_PASSWORD.length <= 256;
    if (path === "/api/session" && request.method === "GET") {
      return json({
        service: "isp-manager-api",
        configured,
        authenticated:
          configured && (await authenticated(request, env.ADMIN_PASSWORD)),
      });
    }
    if (!configured)
      fail(
        "أضف DB وكلمة مرور الإدارة ADMIN_PASSWORD في إعدادات Cloudflare",
        503,
      );
    if (!["GET", "POST", "PUT"].includes(request.method))
      fail("الطريقة غير مدعومة", 405);
    if (
      request.method !== "GET" &&
      request.headers.get("Origin") !== new URL(request.url).origin
    )
      fail("مصدر الطلب غير مسموح", 403);
    if (path === "/api/login" && request.method === "POST") {
      await rateLimit(request, env.DB, env.ADMIN_PASSWORD);
      const body = await readBody(request);
      if (
        typeof body?.password !== "string" ||
        body.password.length > 256 ||
        !(await equal(body.password, env.ADMIN_PASSWORD))
      )
        fail("كلمة المرور غير صحيحة", 401);
      const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
      const hex = [...crypto.getRandomValues(new Uint8Array(16))]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      const prefix = `${expiry}.${hex}`;
      return json({ authenticated: true }, 200, {
        "Set-Cookie": cookie(
          `${prefix}.${await sign(`isp-session:${prefix}`, env.ADMIN_PASSWORD)}`,
          request,
        ),
      });
    }
    if (path === "/api/logout" && request.method === "POST")
      return json({ authenticated: false }, 200, {
        "Set-Cookie": cookie("", request, 0),
      });
    if (!(await authenticated(request, env.ADMIN_PASSWORD)))
      fail("انتهت الجلسة. سجّل الدخول مجدداً", 401);
    if (path !== "/api/state") fail("المسار غير موجود", 404);
    if (request.method === "GET") {
      const row = await env.DB.prepare(
        "SELECT data, revision FROM app_state WHERE id = 1",
      ).first();
      return json(
        row
          ? {
              data: validateBackup(JSON.parse(row.data)),
              revision: row.revision,
            }
          : { data: null, revision: 0 },
      );
    }
    if (request.method !== "PUT") fail("الطريقة غير مدعومة", 405);
    const body = await readBody(request);
    if (!Number.isSafeInteger(body?.revision) || body.revision < 0)
      fail("إصدار البيانات غير صحيح", 400);
    let data;
    try {
      data = validateBackup(body.data);
    } catch (e) {
      fail(e.message, 400);
    }
    const raw = JSON.stringify(data);
    const result =
      body.revision === 0
        ? await env.DB.prepare(
            "INSERT INTO app_state (id, data, revision) VALUES (1, ?, 1) ON CONFLICT (id) DO NOTHING",
          )
            .bind(raw)
            .run()
        : await env.DB.prepare(
            "UPDATE app_state SET data = ?, revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1 AND revision = ?",
          )
            .bind(raw, body.revision)
            .run();
    if (result.meta.changes !== 1)
      fail(
        "تغيّرت البيانات على جهاز آخر. حدّث الصفحة وراجع البيانات قبل إعادة العملية",
        409,
      );
    return json({ data, revision: body.revision + 1 });
  } catch (e) {
    // Do not include SQL, credentials, subscriber payloads or internal errors.
    return json(
      {
        error: e.status
          ? e.message
          : "تعذر الوصول إلى القاعدة. تحقق من الجداول والربط ثم أعد المحاولة",
      },
      e.status || 503,
    );
  }
}

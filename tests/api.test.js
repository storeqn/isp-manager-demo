import test from "node:test";
import assert from "node:assert/strict";
import { handleApi, authenticated } from "../server/api.js";
import { createDb } from "./d1-helper.mjs";
import { createSeed } from "../src/services/seedService.js";
const secret = "test-only-not-a-real-password-123";
const origin = "https://isp.example";
function setup() {
  const env = { DB: createDb(), ADMIN_PASSWORD: secret };
  const request = (path, method = "GET", body, cookie, headers = {}) =>
    handleApi({
      env,
      request: new Request(`${origin}/api/${path}`, {
        method,
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(body !== undefined
          ? { body: typeof body === "string" ? body : JSON.stringify(body) }
          : {}),
      }),
    });
  return {
    env,
    request,
    login: async () =>
      (await request("login", "POST", { password: secret })).headers
        .get("Set-Cookie")
        .split(";")[0],
  };
}
test("API: fail closed, session cookie, wrong password, expiry, tamper and logout", async () => {
  const { env, request, login } = setup();
  assert.equal((await request("state")).status, 401);
  assert.equal(
    (await request("login", "POST", { password: "wrong" })).status,
    401,
  );
  const cookie = await login();
  assert.ok(
    await authenticated(
      new Request(origin, { headers: { Cookie: cookie } }),
      secret,
    ),
  );
  assert.equal(
    await authenticated(
      new Request(origin, { headers: { Cookie: cookie } }),
      secret,
      Date.now() + 13 * 3600000,
    ),
    false,
  );
  assert.equal(
    (await request("state", "GET", undefined, cookie.slice(0, -1) + "!"))
      .status,
    401,
  );
  const session = await (
    await request("session", "GET", undefined, cookie)
  ).json();
  assert.equal(session.authenticated, true);
  const logout = await request("logout", "POST", undefined, cookie);
  assert.match(logout.headers.get("Set-Cookie"), /Max-Age=0/);
  env.ADMIN_PASSWORD = "";
  assert.equal((await request("state", "GET", undefined, cookie)).status, 503);
  env.DB.sql.close();
});
test("API: empty DB, validated backup import, atomic revision conflict, persistence and limits", async () => {
  const { env, request, login } = setup();
  const cookie = await login();
  assert.deepEqual(
    await (await request("state", "GET", undefined, cookie)).json(),
    { data: null, revision: 0 },
  );
  const data = createSeed();
  assert.equal(
    (await request("state", "PUT", { data, revision: 0 }, cookie)).status,
    200,
  );
  assert.equal(
    (await request("state", "PUT", { data, revision: 0 }, cookie)).status,
    409,
  );
  const first = await (await request("state", "GET", undefined, cookie)).json();
  assert.equal(first.data.subscribers.length, 14);
  data.subscribers.pop();
  assert.equal(
    (await request("state", "PUT", { data, revision: 1 }, cookie)).status,
    200,
  );
  assert.equal(
    (await request("state", "PUT", { data: createSeed(), revision: 1 }, cookie))
      .status,
    409,
  );
  assert.equal(
    (await (await request("state", "GET", undefined, cookie)).json()).data
      .subscribers.length,
    13,
  );
  const invalid = structuredClone(data);
  invalid.subscribers[0].username = invalid.subscribers[1].username;
  assert.equal(
    (await request("state", "PUT", { data: invalid, revision: 2 }, cookie))
      .status,
    400,
  );
  assert.equal((await request("state", "PUT", "{broken", cookie)).status, 400);
  assert.equal(
    (await request("state", "PUT", " ".repeat(512 * 1024 + 1), cookie)).status,
    413,
  );
  assert.equal(
    (
      await request("state", "PUT", { data, revision: 2 }, cookie, {
        Origin: "https://other.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("state", "GET", undefined, cookie)).headers.get(
      "Cache-Control",
    ),
    "no-store",
  );
  env.DB.sql.close();
});
test("API: login brute-force limit is shared and database errors reveal no internals", async () => {
  const { env, request } = setup();
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await request("login", "POST", { password: "wrong" })).status,
      401,
    );
  assert.equal(
    (await request("login", "POST", { password: secret })).status,
    429,
  );
  env.DB.sql.exec("DROP TABLE login_limits");
  const response = await request("login", "POST", { password: secret });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /login_limits|SQL|test-only/);
  env.DB.sql.close();
});

import { useEffect, useState } from "react";
import App from "../App.jsx";
import { Button, Input, Icon } from "./ui.jsx";
import { cloudService } from "../services/cloudService.js";
import { store } from "../services/store.js";
import { storageService } from "../services/storageService.js";
import { createSeed } from "../services/seedService.js";
export default function CloudGate() {
  const [phase, setPhase] = useState("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const openCloud = async () => {
    sessionStorage.removeItem("isp-local-demo");
    setPhase((await store.connect()) ? "cloud" : "import");
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      try {
        const status = await cloudService.request("session", {
          signal: controller.signal,
        });
        if (!active) return;
        if (status.local) {
          sessionStorage.setItem("isp-local-demo", "1");
          setPhase("local");
        } else if (!status.configured) setPhase("setup");
        else if (!status.authenticated) setPhase("login");
        else await openCloud();
      } catch (e) {
        if (active) {
          if (
            !navigator.onLine &&
            sessionStorage.getItem("isp-local-demo") === "1"
          )
            setPhase("local");
          else {
            setError(e.message);
            setPhase("error");
          }
        }
      }
    })();
    const authRequired = () => {
      setPassword("");
      setPhase("login");
      setError("انتهت الجلسة. سجّل الدخول مجدداً");
    };
    window.addEventListener("isp-auth-required", authRequired);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener("isp-auth-required", authRequired);
    };
  }, [attempt]);
  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const initialize = async (data) => {
    if (
      !window.confirm(
        `نقل هذه النسخة إلى القاعدة المشتركة: ${data.subscribers.length} مشترك و${data.packages.length} باقة؟ ستصبح متاحة للأجهزة التي تسجّل الدخول.`,
      )
    )
      return;
    await store.restore(data);
    setPhase("cloud");
  };
  if (phase === "cloud" || phase === "local")
    return (
      <App
        cloud={phase === "cloud"}
        onLogout={async () => {
          await cloudService.request("logout", { method: "POST" });
          setPhase("login");
        }}
      />
    );
  return (
    <main className="recovery panel cloud-gate" aria-busy={busy}>
      <Icon name="shield" size={40} />
      <h1>ISP Manager</h1>
      {phase === "loading" ? (
        <p role="status">جارٍ التحقق من مساحة العمل…</p>
      ) : phase === "login" ? (
        <>
          <h2>تسجيل دخول الإدارة</h2>
          <p>
            استخدم كلمة المرور نفسها في المتصفح والتطبيق للوصول إلى البيانات
            المشتركة.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await cloudService.request("login", {
                  method: "POST",
                  body: { password },
                  authEvent: false,
                });
                setPassword("");
                await openCloud();
              });
            }}
          >
            <Input
              label="كلمة مرور الإدارة"
              type="password"
              autoComplete="current-password"
              value={password}
              maxLength={256}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
            <Button
              variant="primary"
              type="submit"
              disabled={busy || !password}
            >
              {busy ? "جارٍ التحقق…" : "تسجيل الدخول"}
            </Button>
          </form>
        </>
      ) : phase === "import" ? (
        <>
          <h2>تهيئة مساحة العمل المشتركة</h2>
          <p>
            القاعدة فارغة. اختر النسخة الصحيحة أولاً؛ بيانات هذا الجهاز لن
            تُحذف.
          </p>
          <div className="cloud-actions">
            <Button
              disabled={busy}
              variant="primary"
              onClick={() => run(() => initialize(storageService.load()))}
            >
              نقل بيانات هذا الجهاز
            </Button>
            <label className="field">
              <span>رفع نسخة احتياطية JSON من جهاز آخر</span>
              <input
                disabled={busy}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file)
                    run(async () => {
                      if (file.size > 512 * 1024)
                        throw new Error("حد النقل السحابي 512 KB");
                      await initialize(
                        storageService.parseBackup(await file.text()),
                      );
                    });
                }}
              />
            </label>
            <Button
              disabled={busy}
              onClick={() =>
                run(() => {
                  const data = createSeed();
                  for (const field of [
                    "subscribers",
                    "renewals",
                    "activities",
                    "notifications",
                    "generatedKeys",
                  ])
                    data[field] = [];
                  return initialize(data);
                })
              }
            >
              بدء مساحة فارغة مع الباقات الافتراضية
            </Button>
            <Button disabled={busy} onClick={() => run(openCloud)}>
              التحقق من تهيئة القاعدة على جهاز آخر
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2>{phase === "setup" ? "إعداد الخادم مطلوب" : "تعذر الاتصال"}</h2>
          <p>
            {phase === "setup"
              ? "أضف كلمة مرور قوية من 16 حرفاً على الأقل كمتغير Secret باسم ADMIN_PASSWORD في إعدادات Cloudflare، واربط قاعدة D1 باسم DB، ثم أعد النشر."
              : "تحقق من الاتصال ثم أعد المحاولة. لم تُستبدل بياناتك المحلية."}
          </p>
          <Button
            onClick={() => {
              setError("");
              setPhase("loading");
              setAttempt((x) => x + 1);
            }}
          >
            إعادة المحاولة
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <p className="hint">
        الراوتر غير متصل فعلياً. البيانات المشتركة تحتاج اتصالاً بالإنترنت.
      </p>
    </main>
  );
}

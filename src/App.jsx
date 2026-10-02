import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { store } from "./services/store.js";
import { Icon, Button, Modal } from "./components/ui.jsx";
import SubscriberForm from "./components/SubscriberForm.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Subscribers from "./pages/Subscribers.jsx";
import SubscriberDetails from "./pages/SubscriberDetails.jsx";
import { storageService } from "./services/storageService.js";
const Packages = lazy(() => import("./pages/Packages.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Activity = lazy(() => import("./pages/Activity.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const nav = [
  ["dashboard", "الرئيسية", "grid"],
  ["subscribers", "المشتركون", "users"],
  ["add", "إضافة مشترك", "plus"],
  ["packages", "الباقات والسرعات", "layers"],
  ["reports", "التقارير", "chart"],
  ["notifications", "التنبيهات", "bell"],
  ["activity", "سجل العمليات", "history"],
  ["settings", "الإعدادات", "settings"],
];
const currentRoute = () => {
  const hash = location.hash.slice(1);
  return /^subscriber\/.+/.test(hash) ||
    nav.some((x) => x[0] === hash && x[0] !== "add")
    ? hash
    : "dashboard";
};
export default function App() {
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [route, setRoute] = useState(currentRoute);
  const [menu, setMenu] = useState(false);
  const [form, setForm] = useState(null);
  const [toast, setToast] = useState(null);
  const [install, setInstall] = useState(false);
  const [startupError, setStartupError] = useState(store.getError());
  const notify = (message, type = "success") =>
    setToast({ message, type, at: Date.now() });
  const navigate = (page) => {
    location.hash = page;
    setRoute(page);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const add = () => {
    if (!data.packages.length) {
      notify("أضف باقة أولاً من صفحة الباقات والسرعات", "error");
      navigate("packages");
      return;
    }
    setMenu(false);
    setForm({});
  };
  useEffect(() => {
    const fn = () => setRoute(currentRoute());
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const sync = () => {
      if (!document.hidden)
        try {
          store.sync();
        } catch (e) {
          notify(e.message, "error");
        }
    };
    const id = setInterval(sync, 30000);
    document.addEventListener("visibilitychange", sync);
    const storage = (e) => {
      if (e.key === "isp-manager-demo:v1")
        try {
          store.reload();
        } catch (e) {
          notify(e.message, "error");
        }
    };
    window.addEventListener("storage", storage);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  useEffect(() => {
    const close = (e) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", close);
    document.body.classList.toggle("menu-open", menu);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("menu-open");
    };
  }, [menu]);
  const restore = (parsed) => {
    store.restore(parsed);
    setStartupError("");
  };
  if (!data || startupError)
    return (
      <main className="recovery panel">
        <Icon name="shield" size={40} />
        <h1>تعذر فتح البيانات المحلية</h1>
        <p role="alert">{startupError || "التخزين المحلي غير متاح"}</p>
        <label className="field">
          <span>استعادة ملف JSON صالح</span>
          <input
            type="file"
            accept=".json"
            onChange={async (e) => {
              try {
                const file = e.target.files[0];
                if (!file || file.size > 10 * 1024 * 1024)
                  throw new Error("اختر ملفاً أصغر من 10 MB");
                const parsed = storageService.parseBackup(await file.text());
                if (
                  window.confirm(
                    `استبدال البيانات التالفة بنسخة تحتوي على ${parsed.subscribers.length} مشترك؟`,
                  )
                )
                  restore(parsed);
              } catch (e) {
                setStartupError(e.message);
              }
            }}
          />
        </label>
      </main>
    );
  const props = {
    data,
    mutate: store.mutate,
    notify,
    navigate,
    add,
    select: (id) => navigate(`subscriber/${id}`),
    restore,
  };
  const unread = data.notifications.filter((x) => !x.read).length;
  const page = route.split("/")[0];
  const title =
    page === "subscriber"
      ? "تفاصيل المشترك"
      : nav.find((x) => x[0] === page)?.[1];
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content").focus();
        }}
      >
        تجاوز القائمة إلى المحتوى
      </a>
      {menu && (
        <button
          className="sidebar-overlay"
          aria-label="إغلاق القائمة"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={`sidebar ${menu ? "open" : ""}`}
        aria-label="القائمة الرئيسية"
      >
        <a className="brand" href="#dashboard" onClick={() => setMenu(false)}>
          <span className="brand-mark">
            <Icon name="wifi" size={25} />
          </span>
          <span dir="ltr">
            {data.settings.systemName}
            <small>إدارة مشتركي الإنترنت</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="dot" /> {data.settings.networkName}
          <span className="sidebar-demo">DEMO</span>
        </div>
        <div className="nav-label">مساحة الإدارة</div>
        <nav>
          {nav.map(([key, label, icon]) => (
            <button
              className={
                page === key || (page === "subscriber" && key === "subscribers")
                  ? "active"
                  : ""
              }
              aria-current={page === key ? "page" : undefined}
              key={key}
              onClick={() => (key === "add" ? add() : navigate(key))}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {key === "notifications" && unread > 0 && (
                <span className="nav-count">{unread}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-info">
            <Icon name="shield" />
            <strong>نسخة تجريبية محلية</strong>
            <p>
              استكشف النظام ببيانات تجريبية.
              <br />
              الراوتر غير متصل فعلياً.
            </p>
          </div>
          <button
            className="install-link"
            onClick={() => {
              setInstall(true);
              setMenu(false);
            }}
          >
            <Icon name="download" /> تثبيت النظام كتطبيق
          </button>
          <div className="admin-user">
            <span className="admin-avatar">م</span>
            <div>
              <strong>مدير الشبكة</strong>
              <small>مساحة تجريبية</small>
            </div>
            <Icon name="settings" />
          </div>
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-title">
            <button
              className="icon-btn mobile-menu"
              aria-label="فتح القائمة"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Icon name="menu" />
            </button>
            <span>
              مساحة العمل <span className="breadcrumb">/ {title}</span>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="local-badge">
              <span className="dot" /> حفظ محلي
            </span>
            <button
              className="bell-btn icon-btn"
              aria-label={`التنبيهات: ${unread} غير مقروء`}
              onClick={() => navigate("notifications")}
            >
              <Icon name="bell" />
              {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
            </button>
            <span className="topbar-avatar">م</span>
          </div>
        </header>
        <main id="main-content" tabIndex="-1">
          <Suspense
            fallback={
              <div className="loading" role="status">
                جارٍ فتح الصفحة…
              </div>
            }
          >
            {page === "dashboard" ? (
              <Dashboard {...props} />
            ) : page === "subscribers" ? (
              <Subscribers {...props} />
            ) : page === "subscriber" ? (
              <SubscriberDetails
                key={route}
                id={route.slice("subscriber/".length)}
                {...props}
                edit={(s) => setForm(s)}
              />
            ) : page === "packages" ? (
              <Packages {...props} />
            ) : page === "reports" ? (
              <Reports {...props} />
            ) : page === "notifications" ? (
              <Notifications {...props} />
            ) : page === "activity" ? (
              <Activity {...props} />
            ) : (
              <Settings {...props} />
            )}
          </Suspense>
          <footer className="footer">
            <span>ISP Manager · نسخة تجريبية</span>
            <span>مصمم لإدارة أبسط وشبكة أفضل</span>
          </footer>
        </main>
      </div>
      {form && (
        <SubscriberForm
          data={data}
          subscriber={form.id ? form : null}
          mutate={store.mutate}
          notify={notify}
          onClose={() => setForm(null)}
        />
      )}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`toast ${toast.type}`}>
            <Icon name={toast.type === "error" ? "close" : "check"} />
            <span>{toast.message}</span>
            <button
              className="icon-btn"
              aria-label="إغلاق الرسالة"
              onClick={() => setToast(null)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
      {install && (
        <Modal title="تثبيت ISP Manager" onClose={() => setInstall(false)}>
          <div className="install-steps">
            <p>
              <strong>iPhone / iPad</strong>
              <br />
              افتح الرابط في Safari ← مشاركة ← إضافة إلى الشاشة الرئيسية.
            </p>
            <p>
              <strong>Android</strong>
              <br />
              افتح الرابط في Chrome ← القائمة ← تثبيت التطبيق أو إضافة إلى
              الشاشة الرئيسية.
            </p>
            <p>
              <strong>الكمبيوتر</strong>
              <br />
              اضغط أيقونة التثبيت في شريط العنوان، أو خيار تثبيت التطبيق من
              قائمة المتصفح.
            </p>
            <p className="hint">
              يتطلب النشر عبر HTTPS. بيانات التجربة تبقى في المتصفح والجهاز
              المستخدمين.
            </p>
          </div>
          <Button variant="primary" onClick={() => setInstall(false)}>
            فهمت
          </Button>
        </Modal>
      )}
    </>
  );
}

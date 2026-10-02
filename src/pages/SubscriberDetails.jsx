import { useState } from "react";
import {
  PageTitle,
  Button,
  Badge,
  Online,
  Remaining,
  Icon,
  Modal,
  Confirm,
  Input,
  Field,
  Empty,
  money,
} from "../components/ui.jsx";
import { subscriberService } from "../services/subscriberService.js";
import { formatDate, formatTime } from "../services/dateService.js";
export default function SubscriberDetails({
  id,
  data,
  mutate,
  notify,
  navigate,
  edit,
}) {
  const s = data.subscribers.find((x) => x.id === id);
  const [action, setAction] = useState("");
  const [days, setDays] = useState(30);
  const [packageId, setPackageId] = useState(s?.packageId);
  const [speed, setSpeed] = useState({
    download: s?.download,
    upload: s?.upload,
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  if (!s)
    return (
      <Empty
        title="المشترك غير موجود"
        action={
          <Button onClick={() => navigate("subscribers")}>
            العودة إلى المشتركين
          </Button>
        }
      />
    );
  const p = data.packages.find((p) => p.id === s.packageId);
  const perform = (fn, message, close = true) => {
    try {
      mutate(fn);
      notify(message);
      if (close) setAction("");
      return true;
    } catch (e) {
      setError(e.message);
      notify(e.message, "error");
      return false;
    }
  };
  const open = (key) => {
    setError("");
    setAction(key);
    setDays(30);
    setPackageId(s.packageId);
    setSpeed({ download: s.download, upload: s.upload });
  };
  const items = [
    ["رقم المشترك", s.id],
    ["الهاتف", s.phone || "—"],
    ["اسم المستخدم", s.username],
    ["عنوان IP", s.ip || "غير محدد"],
    ["الباقة", p?.name],
    ["سرعة التنزيل", `${s.download} Mbps`],
    ["سرعة الرفع", `${s.upload} Mbps`],
    ["تاريخ التفعيل", formatDate(s.activationDate)],
    ["تاريخ الانتهاء", formatDate(s.expiryDate)],
    ["استهلاك تجريبي", `${s.usageGB.toFixed(1)} GB`],
  ];
  return (
    <>
      <PageTitle
        eyebrow="ملف المشترك"
        title={s.name}
        description={`حساب PPPoE تجريبي · ${s.username}`}
      >
        <Button onClick={() => navigate("subscribers")}>← المشتركين</Button>
        <Button icon="edit" variant="primary" onClick={() => edit(s)}>
          تعديل البيانات
        </Button>
      </PageTitle>
      <section className="panel detail-panel">
        <div className="detail-status">
          <Badge subscriber={s} settings={data.settings} />
          <Online subscriber={s} />
          <Remaining subscriber={s} settings={data.settings} />
        </div>
        <dl className="detail-grid">
          {items.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd
                dir={
                  /الهاتف|المستخدم|IP|تاريخ|سرعة|استهلاك|رقم/.test(label)
                    ? "ltr"
                    : "auto"
                }
              >
                {value}
              </dd>
            </div>
          ))}
          <div>
            <dt>كلمة مرور تجريبية</dt>
            <dd>
              <span dir="ltr">{showPassword ? s.password : "••••••••"}</span>
              <button
                className="text-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "إخفاء" : "إظهار"}
              </button>
            </dd>
          </div>
          {data.settings.showPrices && (
            <div>
              <dt>سعر الباقة</dt>
              <dd dir="ltr">{money(p?.price, data.settings)}</dd>
            </div>
          )}
        </dl>
        <div className="detail-notes">
          <h3>ملاحظات</h3>
          <p>{s.notes || "لا توجد ملاحظات لهذا المشترك."}</p>
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>إجراءات الاشتراك</h2>
        </div>
        <div className="action-grid">
          <Button
            icon="refresh"
            variant="primary"
            onClick={() =>
              perform(
                (d) => subscriberService.renew(d, s.id),
                "تم تجديد الاشتراك لمدة 30 يوم",
              )
            }
          >
            تجديد 30 يوم
          </Button>
          <Button icon="clock" onClick={() => open("renew")}>
            تجديد مدة مخصصة
          </Button>
          <Button icon="layers" onClick={() => open("package")}>
            تغيير الباقة
          </Button>
          <Button icon="wifi" onClick={() => open("speed")}>
            تغيير السرعة
          </Button>
          <Button
            icon={s.suspended ? "play" : "pause"}
            variant={s.suspended ? "success" : "warning"}
            onClick={() =>
              perform(
                (d) => subscriberService.suspend(d, s.id, !s.suspended),
                s.suspended ? "تم إعادة تفعيل المشترك" : "تم إيقاف المشترك",
              )
            }
          >
            {s.suspended ? "إعادة تفعيل المشترك" : "إيقاف المشترك"}
          </Button>
          <Button
            icon="trash"
            variant="danger-soft"
            onClick={() => open("delete")}
          >
            حذف المشترك
          </Button>
        </div>
        <p className="hint padded">
          التجديد يمدد الاشتراك الساري من تاريخ انتهائه، والمنتهي من اليوم.
          الإيقاف الإداري يبقى حتى إعادة التفعيل. التفعيل لا يحوّل حالة الاتصال
          إلى متصل تلقائياً.
        </p>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>سجل عمليات المشترك</h2>
          <Icon name="history" />
        </div>
        <div className="activity-list">
          {data.activities
            .filter((x) => x.subscriberId === s.id)
            .map((x) => (
              <article key={x.id}>
                <span className="activity-icon">
                  <Icon name="history" />
                </span>
                <div>
                  <strong>{x.message}</strong>
                  <small>
                    {formatTime(x.at)} · {x.type}
                  </small>
                </div>
              </article>
            ))}
        </div>
        {!data.activities.some((x) => x.subscriberId === s.id) && (
          <Empty
            title="لا توجد عمليات بعد"
            message="ستظهر الإضافات والتجديدات والتعديلات هنا."
          />
        )}
      </section>
      {action === "delete" && (
        <Confirm
          title="حذف المشترك؟"
          message={`سيتم حذف ${s.name} من البيانات المحلية. يبقى سجل عملياته محفوظاً. لا يمكن التراجع بدون نسخة احتياطية.`}
          danger
          label="نعم، حذف المشترك"
          onClose={() => setAction("")}
          onConfirm={() => {
            if (
              perform(
                (d) => subscriberService.remove(d, s.id),
                "تم حذف المشترك",
              )
            )
              navigate("subscribers");
          }}
        />
      )}
      {["renew", "package", "speed"].includes(action) && (
        <Modal
          title={
            action === "renew"
              ? "تجديد مدة مخصصة"
              : action === "package"
                ? "تغيير الباقة"
                : "تغيير السرعة"
          }
          onClose={() => setAction("")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perform(
                (d) =>
                  action === "renew"
                    ? subscriberService.renew(d, s.id, Number(days))
                    : action === "package"
                      ? subscriberService.changePackage(d, s.id, packageId)
                      : subscriberService.changeSpeed(
                          d,
                          s.id,
                          speed.download,
                          speed.upload,
                        ),
                action === "renew"
                  ? `تم التجديد لمدة ${days} يوم`
                  : "تم حفظ التغييرات",
              );
            }}
            noValidate
          >
            {action === "renew" ? (
              <Input
                label="عدد أيام التجديد"
                type="number"
                min="1"
                max="3650"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                autoFocus
              />
            ) : action === "package" ? (
              <>
                <Field label="الباقة الجديدة">
                  <select
                    value={packageId}
                    onChange={(e) => setPackageId(e.target.value)}
                  >
                    {data.packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.download}/{p.upload} Mbps
                      </option>
                    ))}
                  </select>
                </Field>
                <p className="hint">
                  يتم تطبيق سرعات الباقة دون تغيير تواريخ الاشتراك.
                </p>
              </>
            ) : (
              <div className="form-grid">
                <Input
                  label="التنزيل Mbps"
                  type="number"
                  step="any"
                  value={speed.download}
                  onChange={(e) =>
                    setSpeed((x) => ({ ...x, download: e.target.value }))
                  }
                />
                <Input
                  label="الرفع Mbps"
                  type="number"
                  step="any"
                  value={speed.upload}
                  onChange={(e) =>
                    setSpeed((x) => ({ ...x, upload: e.target.value }))
                  }
                />
              </div>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="primary" type="submit">
                حفظ
              </Button>
              <Button type="button" onClick={() => setAction("")}>
                إلغاء
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

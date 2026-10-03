import { useRef, useState } from "react";
import {
  PageTitle,
  Button,
  Input,
  Field,
  Icon,
  Confirm,
} from "../components/ui.jsx";
import { storageService } from "../services/storageService.js";
import { validateSettings } from "../services/validationService.js";
import { activityService } from "../services/activityService.js";
import { today } from "../services/dateService.js";
export default function Settings({ data, mutate, notify, restore }) {
  const [form, setForm] = useState({ ...data.settings });
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const exportFile = () => {
    const blob = new Blob([storageService.export(data)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isp-manager-backup-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("تم تنزيل النسخة الاحتياطية");
  };
  const readFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("حجم النسخة يتجاوز 10 MB");
      const parsed = storageService.parseBackup(await file.text());
      setPending(parsed);
    } catch (e) {
      notify(e.message, "error");
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="اضبط النظام على طريقتك"
        title="الإعدادات"
        description="إعدادات هذه النسخة التجريبية، دون أي بيانات اتصال بالراوتر."
      />
      <section className="panel settings-panel">
        <div className="panel-heading">
          <h2>إعدادات الشبكة</h2>
          <Icon name="settings" />
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const settings = {
                ...form,
                defaultDuration: Number(form.defaultDuration),
                warningDays: Number(form.warningDays),
              };
              validateSettings(settings);
              await mutate((d) => {
                d.settings = settings;
                activityService.record(
                  d,
                  "إعدادات",
                  null,
                  "تم تحديث إعدادات النظام",
                );
              });
              setError("");
              notify("تم حفظ الإعدادات");
            } catch (e) {
              setError(e.message);
            }
          }}
          noValidate
        >
          <div className="form-grid">
            <Input
              label="اسم الشبكة"
              value={form.networkName}
              maxLength={100}
              onChange={(e) => set("networkName", e.target.value)}
            />
            <Input
              label="اسم النظام"
              value={form.systemName}
              maxLength={60}
              onChange={(e) => set("systemName", e.target.value)}
            />
            <Field label="العملة">
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                <option value="IQD">دينار عراقي IQD</option>
                <option value="USD">دولار أمريكي USD</option>
              </select>
            </Field>
            <Input
              label="المدة الافتراضية (يوم)"
              type="number"
              value={form.defaultDuration}
              min="1"
              max="3650"
              onChange={(e) => set("defaultDuration", e.target.value)}
            />
            <Input
              label="التنبيه قبل الانتهاء (يوم)"
              type="number"
              value={form.warningDays}
              min="1"
              max="365"
              onChange={(e) => set("warningDays", e.target.value)}
            />
          </div>
          <div className="toggle-list">
            <label>
              <span>
                <strong>إظهار الأسعار</strong>
                <small>عرض أسعار الباقات والإيرادات التقديرية</small>
              </span>
              <input
                type="checkbox"
                checked={form.showPrices}
                onChange={(e) => set("showPrices", e.target.checked)}
              />
            </label>
            <label>
              <span>
                <strong>تفعيل التنبيهات</strong>
                <small>تنبيهات الانتهاء والتجديد داخل النظام</small>
              </span>
              <input
                type="checkbox"
                checked={form.notificationsEnabled}
                onChange={(e) => set("notificationsEnabled", e.target.checked)}
              />
            </label>
          </div>
          <p className="hint">
            تغيير العملة يغيّر وحدة العرض فقط، ولا يحوّل الأسعار المحفوظة.
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" icon="check">
            حفظ الإعدادات
          </Button>
        </form>
      </section>
      <section className="panel backup-panel">
        <div className="panel-heading">
          <div>
            <h2>النسخ الاحتياطي والاستعادة</h2>
            <p>احتفظ بنسخة من المشتركين والباقات والسجلات والإعدادات.</p>
          </div>
          <Icon name="shield" />
        </div>
        <div className="backup-actions">
          <Button icon="download" variant="primary" onClick={exportFile}>
            تصدير نسخة احتياطية
          </Button>
          <Button icon="upload" onClick={() => fileRef.current.click()}>
            استعادة نسخة احتياطية
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={readFile}
            className="sr-only"
            tabIndex="-1"
            aria-label="ملف النسخة الاحتياطية"
          />
        </div>
        <p className="hint">
          الاستعادة تستبدل البيانات الحالية بالكامل بعد التحقق والتأكيد. النسخة
          تشمل كلمات مرور المشتركين التجريبية، فاحفظها في مكان خاص.
        </p>
      </section>
      <section className="panel install-panel">
        <Icon name="download" size={28} />
        <div>
          <h2>ثبّت ISP Manager كتطبيق</h2>
          <p>
            iPhone: افتح الموقع في Safari، اضغط مشاركة ثم «إضافة إلى الشاشة
            الرئيسية». Android وDesktop: استخدم خيار تثبيت التطبيق من قائمة
            المتصفح. يتطلب HTTPS أو localhost.
          </p>
        </div>
      </section>
      <div className="architecture-note">
        <Icon name="shield" />
        <p>
          المرحلة المقبلة: الواجهة ← Backend آمن ← MikroTik RouterOS API. جميع
          الاتصالات الحالية محاكاة، ولا توجد بيانات وصول حقيقية في المشروع.
        </p>
      </div>
      {pending && (
        <Confirm
          title="استعادة النسخة الاحتياطية؟"
          message={`تحتوي النسخة على ${pending.subscribers.length} مشترك و${pending.packages.length} باقة. ستستبدل البيانات الحالية. ننصح بتصديرها قبل المتابعة.`}
          label="استعادة واستبدال البيانات"
          onClose={() => setPending(null)}
          onConfirm={async () => {
            try {
              await restore(pending);
              setForm({ ...pending.settings });
              setPending(null);
              notify("تمت استعادة النسخة الاحتياطية");
            } catch (e) {
              notify(e.message, "error");
            }
          }}
        />
      )}
    </>
  );
}

import { useState } from "react";
import { Input, Field, Button, Modal } from "./ui.jsx";
import { today, addDays, formatDate } from "../services/dateService.js";
import { subscriberService } from "../services/subscriberService.js";
export default function SubscriberForm({
  data,
  subscriber,
  mutate,
  notify,
  onClose,
}) {
  const p = data.packages[0];
  const [form, setForm] = useState(
    subscriber
      ? { ...subscriber }
      : {
          name: "",
          phone: "",
          username: "",
          password: "",
          ip: "",
          packageId: p?.id || "",
          download: p?.download || 10,
          upload: p?.upload || 3,
          activationDate: today(),
          duration: data.settings.defaultDuration,
          notes: "",
        },
  );
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  let expiry = "—";
  try {
    expiry = formatDate(
      subscriber &&
        form.activationDate === subscriber.activationDate &&
        Number(form.duration) === subscriber.duration
        ? subscriber.expiryDate
        : addDays(form.activationDate, Number(form.duration)),
    );
  } catch {
    /* form preview remains empty until valid */
  }
  const save = async (e) => {
    e.preventDefault();
    try {
      await mutate((d) => subscriberService.save(d, form));
      notify(subscriber ? "تم حفظ التعديلات" : "تم إضافة المشترك بنجاح");
      onClose();
    } catch (e) {
      setErrors(e.fields || { general: e.message });
    }
  };
  return (
    <Modal
      title={subscriber ? "تعديل بيانات المشترك" : "إضافة مشترك جديد"}
      onClose={onClose}
      wide
    >
      <p className="modal-subtitle">
        بيانات تجريبية؛ يتم تأكيد الحفظ قبل إغلاق النموذج
      </p>
      <form onSubmit={save} noValidate>
        <div className="form-grid">
          <Input
            label="الاسم الكامل *"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
            autoFocus
            maxLength={120}
          />
          <Input
            label="رقم الهاتف"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            error={errors.phone}
            type="tel"
            dir="ltr"
          />
          <Input
            label="اسم المستخدم PPPoE *"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            error={errors.username}
            dir="ltr"
            autoComplete="off"
            maxLength={64}
          />
          <div>
            <Input
              label="كلمة مرور تجريبية *"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              error={errors.password}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              dir="ltr"
              maxLength={128}
            />
            <button
              type="button"
              className="text-btn"
              onClick={() => setShow(!show)}
            >
              {show ? "إخفاء" : "إظهار"} كلمة المرور
            </button>
          </div>
          <Field label="الباقة *" error={errors.packageId}>
            <select
              value={form.packageId}
              onChange={(e) => {
                const pkg = data.packages.find((p) => p.id === e.target.value);
                setForm((f) => ({
                  ...f,
                  packageId: pkg.id,
                  download: pkg.download,
                  upload: pkg.upload,
                  ...(!subscriber ? { duration: pkg.duration } : {}),
                }));
              }}
            >
              <option value="" disabled>
                اختر الباقة
              </option>
              {data.packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Input
            label="عنوان IP (اختياري)"
            value={form.ip}
            onChange={(e) => set("ip", e.target.value)}
            error={errors.ip}
            dir="ltr"
            placeholder="10.10.0.10"
          />
          <Input
            label="سرعة التنزيل (Mbps) *"
            type="number"
            min="0.01"
            max="10000"
            step="any"
            value={form.download}
            onChange={(e) => set("download", e.target.value)}
            error={errors.download}
          />
          <Input
            label="سرعة الرفع (Mbps) *"
            type="number"
            min="0.01"
            max="10000"
            step="any"
            value={form.upload}
            onChange={(e) => set("upload", e.target.value)}
            error={errors.upload}
          />
          <Input
            label="تاريخ التفعيل *"
            type="date"
            value={form.activationDate}
            onChange={(e) => set("activationDate", e.target.value)}
            error={errors.activationDate}
          />
          <Input
            label="مدة الاشتراك (يوم) *"
            type="number"
            min="1"
            max="3650"
            value={form.duration}
            onChange={(e) => set("duration", e.target.value)}
            error={errors.duration}
          />
          <Field label="ملاحظات" className="full">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows="3"
              maxLength={2000}
            />
          </Field>
        </div>
        <div className="expiry-preview">
          <span>تاريخ الانتهاء المحسوب</span>
          <strong dir="ltr">{expiry}</strong>
        </div>
        {subscriber && (
          <p className="hint">
            تغيير تاريخ التفعيل أو المدة يعيد حساب الانتهاء. تبقى التجديدات
            السابقة محفوظة في السجل.
          </p>
        )}
        {errors.general && (
          <p className="field-error" role="alert">
            {errors.general}
          </p>
        )}
        <div className="modal-actions">
          <Button variant="primary" type="submit" icon="check">
            {subscriber ? "حفظ التعديلات" : "إضافة المشترك"}
          </Button>
          <Button type="button" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Modal>
  );
}

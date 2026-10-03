import { useState } from "react";
import {
  PageTitle,
  Button,
  Icon,
  Modal,
  Confirm,
  Input,
  Empty,
  money,
} from "../components/ui.jsx";
import { packageService } from "../services/packageService.js";
export default function Packages({ data, mutate, notify }) {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [remove, setRemove] = useState(null);
  const edit = (p) => {
    setErrors({});
    setForm(
      p
        ? { ...p, price: p.price ?? "" }
        : {
            name: "",
            download: "",
            upload: "",
            price: "",
            duration: data.settings.defaultDuration,
          },
    );
  };
  return (
    <>
      <PageTitle
        eyebrow="خطط تناسب جميع المشتركين"
        title="الباقات والسرعات"
        description="حدد السرعة والمدة والسعر، وطبّق الباقة عند إضافة المشترك."
      >
        <Button variant="primary" icon="plus" onClick={() => edit()}>
          إضافة باقة
        </Button>
      </PageTitle>
      <div className="package-grid">
        {data.packages.map((p, i) => (
          <article
            className={`package-card ${i === 3 ? "featured" : ""}`}
            key={p.id}
          >
            <span className="package-icon">
              <Icon name="layers" size={26} />
            </span>
            <h2>{p.name}</h2>
            <p>اشتراك لمدة {p.duration} يوم</p>
            <div className="package-speed">
              <strong>{p.download}</strong>
              <span>Mbps تنزيل</span>
            </div>
            <div className="package-upload">
              <Icon name="up" size={16} /> {p.upload} Mbps رفع
            </div>
            {data.settings.showPrices && (
              <div className="package-price" dir="ltr">
                {money(p.price, data.settings)}
              </div>
            )}
            <div className="package-count">
              {data.subscribers.filter((s) => s.packageId === p.id).length}{" "}
              مشترك بهذه الباقة
            </div>
            <div className="package-actions">
              <Button icon="edit" onClick={() => edit(p)}>
                تعديل
              </Button>
              <Button
                icon="trash"
                variant="danger-soft"
                onClick={() => setRemove(p)}
              >
                حذف
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!data.packages.length && (
        <section className="panel">
          <Empty
            title="لا توجد باقات"
            message="أضف باقة لتتمكن من إضافة المشتركين."
            action={<Button onClick={() => edit()}>إضافة باقة</Button>}
          />
        </section>
      )}
      <p className="hint">
        تعديل الباقة يحدّث تعريفها وسعرها. سرعات المشتركين الحاليين تبقى كما هي
        حتى تغيير باقتهم أو سرعتهم من ملف المشترك.
      </p>
      {form && (
        <Modal
          title={form.id ? "تعديل الباقة" : "إضافة باقة"}
          onClose={() => setForm(null)}
        >
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await mutate((d) => packageService.save(d, form));
                notify("تم حفظ الباقة بنجاح");
                setForm(null);
              } catch (e) {
                setErrors(e.fields || { general: e.message });
              }
            }}
          >
            <div className="form-grid">
              {[
                ["name", "اسم الباقة", "text"],
                ["download", "سرعة التنزيل Mbps", "number"],
                ["upload", "سرعة الرفع Mbps", "number"],
                ["duration", "المدة الافتراضية (يوم)", "number"],
                [
                  "price",
                  `السعر ${data.settings.currency} (اختياري)`,
                  "number",
                ],
              ].map(([key, label, type]) => (
                <Input
                  key={key}
                  label={label}
                  type={type}
                  step={
                    ["download", "upload", "price"].includes(key) ? "any" : "1"
                  }
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  error={errors[key]}
                  autoFocus={key === "name"}
                />
              ))}
            </div>
            {errors.general && (
              <p role="alert" className="field-error">
                {errors.general}
              </p>
            )}
            <div className="modal-actions">
              <Button type="submit" variant="primary">
                حفظ الباقة
              </Button>
              <Button type="button" onClick={() => setForm(null)}>
                إلغاء
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {remove && (
        <Confirm
          title="حذف الباقة؟"
          message={`هل تريد حذف باقة ${remove.name}؟ لا يمكن حذف باقة مرتبطة بمشتركين.`}
          danger
          label="حذف الباقة"
          onClose={() => setRemove(null)}
          onConfirm={async () => {
            try {
              await mutate((d) => packageService.remove(d, remove.id));
              notify("تم حذف الباقة");
              setRemove(null);
            } catch (e) {
              notify(e.message, "error");
              setRemove(null);
            }
          }}
        />
      )}
    </>
  );
}

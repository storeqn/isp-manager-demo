import { useState } from "react";
import { PageTitle, Icon, Empty, Button } from "../components/ui.jsx";
import { formatTime } from "../services/dateService.js";
export default function Activity({ data }) {
  const [type, setType] = useState("all");
  const [limit, setLimit] = useState(50);
  const rows = data.activities.filter((x) => type === "all" || x.type === type);
  return (
    <>
      <PageTitle
        eyebrow="توثيق لكل خطوة"
        title="سجل العمليات"
        description="سجل محلي للإضافة والتعديل والتجديد والإيقاف، محفوظ مع النسخة الاحتياطية."
      />
      <section className="panel">
        <div className="list-toolbar">
          <span>{rows.length} عملية مسجلة</span>
          <select
            aria-label="تصفية نوع العملية"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setLimit(50);
            }}
          >
            <option value="all">جميع العمليات</option>
            {[...new Set(data.activities.map((x) => x.type))].map((t) => (
              <option value={t} key={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="activity-list">
          {rows.slice(0, limit).map((x) => (
            <article key={x.id}>
              <span className="activity-icon">
                <Icon
                  name={
                    x.type === "تجديد"
                      ? "refresh"
                      : x.type === "حذف"
                        ? "trash"
                        : "history"
                  }
                />
              </span>
              <div>
                <strong>{x.message}</strong>
                <small>
                  {formatTime(x.at)} · {x.subscriberName}
                </small>
              </div>
              <span className="activity-type">{x.type}</span>
            </article>
          ))}
        </div>
        {!rows.length && (
          <Empty
            title="لا توجد عمليات"
            message="اختر نوعاً آخر أو نفّذ عملية لتظهر هنا."
          />
        )}
        {rows.length > limit && (
          <div className="load-more">
            <Button onClick={() => setLimit((n) => n + 50)}>عرض المزيد</Button>
          </div>
        )}
      </section>
    </>
  );
}

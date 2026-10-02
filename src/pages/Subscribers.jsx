import { useState } from "react";
import {
  PageTitle,
  Button,
  Icon,
  SubscriberTable,
  Empty,
} from "../components/ui.jsx";
import { subscriberService } from "../services/subscriberService.js";
export default function Subscribers({ data, add, select }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("expiry");
  const [limit, setLimit] = useState(30);
  const rows = subscriberService.query(data, { search, filter, sort });
  return (
    <>
      <PageTitle
        eyebrow="إدارة حسابات PPPoE"
        title="المشتركون"
        description={`${data.subscribers.length} مشترك في شبكتك · إدارة بسيطة لكل التفاصيل`}
      >
        <Button icon="plus" variant="primary" onClick={add}>
          إضافة مشترك جديد
        </Button>
      </PageTitle>
      <section className="panel">
        <div className="list-toolbar">
          <label className="search-box">
            <Icon name="search" />
            <input
              aria-label="البحث عن مشترك"
              placeholder="ابحث بالاسم، الهاتف، Username أو IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(30);
              }}
            />
          </label>
          <select
            aria-label="ترتيب المشتركين"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="expiry">الأقرب للانتهاء</option>
            <option value="newest">الأحدث</option>
            <option value="name">الاسم</option>
            <option value="package">الباقة</option>
          </select>
        </div>
        <div className="filter-tabs">
          {[
            ["all", "الكل"],
            ["active", "فعال"],
            ["online", "متصل"],
            ["offline", "غير متصل"],
            ["soon", "ينتهي قريباً"],
            ["expired", "منتهي"],
            ["suspended", "موقوف"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setLimit(30);
              }}
              className={filter === key ? "selected" : ""}
              aria-pressed={filter === key}
            >
              {label}
            </button>
          ))}
        </div>
        {rows.length ? (
          <SubscriberTable
            rows={rows.slice(0, limit)}
            data={data}
            onSelect={select}
          />
        ) : (
          <Empty
            title={
              data.subscribers.length
                ? "لا توجد نتائج مطابقة"
                : "لا يوجد مشتركون"
            }
            message={
              data.subscribers.length
                ? "جرّب كلمة بحث أخرى أو غيّر الفلتر."
                : "ابدأ بإضافة أول مشترك لشبكتك."
            }
            action={
              !data.subscribers.length && (
                <Button variant="primary" onClick={add}>
                  إضافة مشترك
                </Button>
              )
            }
          />
        )}{" "}
        {rows.length > limit && (
          <div className="load-more">
            <Button onClick={() => setLimit((n) => n + 30)}>
              عرض المزيد ({rows.length - limit})
            </Button>
          </div>
        )}
      </section>
    </>
  );
}

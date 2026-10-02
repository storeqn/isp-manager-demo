import { PageTitle, Icon, money } from "../components/ui.jsx";
import { reportService } from "../services/reportService.js";
export default function Reports({ data }) {
  const r = reportService.summary(data);
  return (
    <>
      <PageTitle
        eyebrow="قراءة واضحة لأداء الشبكة"
        title="التقارير"
        description="إحصائيات من بياناتك المحلية، تتحدث مباشرة مع كل عملية."
      />
      <div className="report-grid">
        {[
          ["إجمالي المشتركين", r.total],
          ["اشتراكات فعالة", r.active],
          ["اشتراكات منتهية", r.expired],
          ["مشتركون موقوفون", r.suspended],
          ["متصلون الآن", r.online],
          ["غير متصلين", r.offline],
          ["مشتركون جدد اليوم", r.newToday],
          ["عدد التجديدات المسجلة", r.renewals],
        ].map(([label, value]) => (
          <article className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>محتسب من البيانات المحلية</small>
          </article>
        ))}
      </div>
      {data.settings.showPrices && (
        <div className="revenue-grid">
          <article className="panel revenue">
            <Icon name="chart" size={30} />
            <div>
              <p>قيمة الاشتراكات الفعالة التقديرية</p>
              <strong dir="ltr">
                {money(r.estimatedRevenue, data.settings)}
              </strong>
              <small>مجموع أسعار الباقات السارية، وليس مدفوعات فعلية.</small>
            </div>
          </article>
          <article className="panel revenue">
            <Icon name="refresh" size={30} />
            <div>
              <p>قيمة التجديدات التقديرية</p>
              <strong dir="ltr">
                {money(r.renewalRevenue, data.settings)}
              </strong>
              <small>حسب سعر الباقة والمدة وقت التجديد.</small>
            </div>
          </article>
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>توزيع المشتركين حسب الباقة</h2>
          <Icon name="layers" />
        </div>
        <div className="distribution">
          {r.byPackage.map((p) => (
            <div key={p.id}>
              <div className="distribution-label">
                <strong>{p.name}</strong>
                <span>{p.count} مشترك</span>
              </div>
              <div className="progress">
                <span
                  style={{
                    width: `${r.total ? (p.count / r.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>سجل التجديدات</h2>
        </div>
        <div className="renewal-list">
          {data.renewals.length ? (
            data.renewals.slice(0, 100).map((x) => (
              <div key={x.id}>
                <strong>
                  {data.subscribers.find((s) => s.id === x.subscriberId)
                    ?.name || "مشترك محذوف"}
                </strong>
                <span>{x.days} يوم</span>
                <span dir="ltr">{x.to.split("-").reverse().join("/")}</span>
                {data.settings.showPrices && (
                  <span dir="ltr">{money(x.amount, data.settings)}</span>
                )}
              </div>
            ))
          ) : (
            <p className="hint padded">لا توجد تجديدات مسجلة بعد.</p>
          )}
        </div>
      </section>
    </>
  );
}

import { useState } from "react";
import {
  PageTitle,
  Icon,
  Button,
  SubscriberTable,
  Empty,
} from "../components/ui.jsx";
import { reportService } from "../services/reportService.js";
import { networkService } from "../services/networkService.js";
import { subscriberService } from "../services/subscriberService.js";
export default function Dashboard({ data, navigate, add, select }) {
  const summary = reportService.summary(data);
  const network = networkService.status();
  const [period, setPeriod] = useState("24h");
  const points = networkService.traffic(period);
  const stats = [
    {
      key: "total",
      label: "إجمالي المشتركين",
      icon: "users",
      note: "جميع حسابات الشبكة",
      color: "blue",
    },
    {
      key: "active",
      label: "المشتركون الفعالون",
      icon: "shield",
      note: "اشتراكات سارية",
      color: "green",
    },
    {
      key: "online",
      label: "متصلون الآن",
      icon: "wifi",
      note: "جلسات تجريبية",
      color: "green",
    },
    {
      key: "offline",
      label: "غير متصلين",
      icon: "globe",
      note: "لا توجد جلسة نشطة",
      color: "muted",
    },
    {
      key: "expired",
      label: "اشتراكات منتهية",
      icon: "clock",
      note: "تحتاج إلى تجديد",
      color: "red",
    },
    {
      key: "soon",
      label: "تنتهي قريباً",
      icon: "bell",
      note: `خلال ${data.settings.warningDays} أيام`,
      color: "orange",
    },
    {
      key: "suspended",
      label: "مشتركون موقوفون",
      icon: "pause",
      note: "إيقاف إداري",
      color: "muted",
    },
  ];
  const rows = subscriberService
    .query(data)
    .filter((s) =>
      ["soon", "expired"].includes(subscriberService.status(s, data.settings)),
    )
    .slice(0, 5);
  const line = (key) =>
    points
      .map((p, i) => `${(i * 700) / (points.length - 1)},${190 - p[key] * 1.2}`)
      .join(" ");
  return (
    <>
      <PageTitle
        eyebrow="نظرة عامة على الشبكة"
        title="كل شيء تحت السيطرة"
        description={`مرحباً بك في ${data.settings.networkName}، هذه آخر مؤشرات شبكتك التجريبية.`}
      >
        <Button variant="primary" icon="plus" onClick={add}>
          إضافة مشترك
        </Button>
      </PageTitle>
      <section className="network-panel" aria-label="حالة الشبكة التجريبية">
        <div className="network-heading">
          <span className="network-icon">
            <Icon name="wifi" size={30} />
          </span>
          <div>
            <h2>شبكتك تعمل بكفاءة</h2>
            <p>
              <span className="live-dot" /> MikroTik متصل{" "}
              <span className="separator">•</span> Starlink متصل
            </p>
          </div>
          <span className="demo-pill">محاكاة DEMO</span>
        </div>
        <div className="network-metrics">
          {[
            ["سرعة التنزيل", network.download, "Mbps", "arrow"],
            ["سرعة الرفع", network.upload, "Mbps", "up"],
            ["زمن الاستجابة", network.ping, "ms", "globe"],
            ["مدة التشغيل", network.uptime, "يوم", "clock"],
            ["استهلاك الإنترنت", network.traffic, "GB", "chart"],
          ].map(([label, value, unit, icon]) => (
            <div key={label}>
              <span>
                <Icon name={icon} size={16} />
                {label}
              </span>
              <strong>
                {value}
                <small>{unit}</small>
              </strong>
            </div>
          ))}
        </div>
        <p className="network-note">
          مؤشرات توضيحية فقط · لا يوجد اتصال فعلي بأي راوتر أو مصدر إنترنت
        </p>
      </section>
      <section className="stats-grid" aria-label="إحصائيات المشتركين">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.key}>
            <div className={`stat-icon ${stat.color}`}>
              <Icon name={stat.icon} />
            </div>
            <span>{stat.label}</span>
            <strong>{summary[stat.key]}</strong>
            <small>{stat.note}</small>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel traffic-panel">
          <div className="panel-heading">
            <div>
              <h2>حركة الإنترنت</h2>
              <p>متوسط السرعة · بيانات تجريبية ثابتة</p>
            </div>
            <div className="segmented">
              {[
                ["24h", "24 ساعة"],
                ["7d", "7 أيام"],
                ["30d", "30 يوم"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={period === key ? "selected" : ""}
                  onClick={() => setPeriod(key)}
                  aria-pressed={period === key}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="blue-dot" />
              التنزيل
            </span>
            <span>
              <i className="cyan-dot" />
              الرفع
            </span>
            <span className="chart-unit">Mbps</span>
          </div>
          <div className="traffic-chart">
            <div className="chart-scale">
              <span>150</span>
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>
            <svg
              viewBox="0 0 700 210"
              role="img"
              aria-label={`رسم سرعة التنزيل والرفع خلال ${period === "24h" ? "24 ساعة" : period === "7d" ? "7 أيام" : "30 يوم"}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6fed" stopOpacity=".19" />
                  <stop offset="100%" stopColor="#2f6fed" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[10, 70, 130, 190].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="700"
                  y2={y}
                  stroke="#e8eef6"
                  strokeDasharray="4 5"
                />
              ))}
              <polygon
                points={`0,210 ${line("download")} 700,210`}
                fill="url(#area)"
              />
              <polyline
                points={line("download")}
                fill="none"
                stroke="#2f6fed"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={line("upload")}
                fill="none"
                stroke="#26b9be"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="chart-labels" dir="ltr">
            {[0, Math.floor(points.length / 2), points.length - 1].map((i) => (
              <span key={i}>{points[i].label}</span>
            ))}
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading">
            <h2>إجراءات سريعة</h2>
            <Icon name="layers" />
          </div>
          <button onClick={add}>
            <span className="quick-icon blue">
              <Icon name="plus" />
            </span>
            <span>
              <strong>إضافة مشترك جديد</strong>
              <small>حساب جديد خلال ثوانٍ</small>
            </span>
            <span>←</span>
          </button>
          <button onClick={() => navigate("subscribers")}>
            <span className="quick-icon orange">
              <Icon name="refresh" />
            </span>
            <span>
              <strong>إدارة الاشتراكات</strong>
              <small>
                {summary.soon + summary.expired} اشتراك يحتاج متابعة
              </small>
            </span>
            <span>←</span>
          </button>
          <button onClick={() => navigate("reports")}>
            <span className="quick-icon green">
              <Icon name="chart" />
            </span>
            <span>
              <strong>تقارير الشبكة</strong>
              <small>أرقام واضحة لاتخاذ القرار</small>
            </span>
            <span>←</span>
          </button>
          <div className="quick-tip">
            <Icon name="shield" />
            <p>
              بياناتك محفوظة محلياً.
              <br />
              صدّر نسخة احتياطية من الإعدادات.
            </p>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>اشتراكات تحتاج إلى متابعة</h2>
            <p>المنتهية والأقرب للانتهاء</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("subscribers")}>
            عرض المشتركين ←
          </Button>
        </div>
        {rows.length ? (
          <SubscriberTable rows={rows} data={data} onSelect={select} compact />
        ) : (
          <Empty
            title="جميع الاشتراكات محدثة"
            message="لا توجد اشتراكات تحتاج إلى متابعة الآن."
          />
        )}
      </section>
    </>
  );
}

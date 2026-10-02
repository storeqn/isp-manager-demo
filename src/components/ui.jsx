import { useEffect, useRef, useId, cloneElement } from "react";
import {
  subscriberService,
  statusLabels,
} from "../services/subscriberService.js";
import { daysLeft, formatDate } from "../services/dateService.js";
export function Icon({ name = "grid", size = 20, ...props }) {
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    plus: "M12 5v14 M5 12h14",
    layers: "m12 3 10 6-10 6L2 9z M2 13l10 6 10-6 M2 17l10 6 10-6",
    chart: "M3 3v18h18 M7 15v3 M12 10v8 M17 5v13",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    history: "M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
    search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
    menu: "M3 6h18 M3 12h18 M3 18h18",
    close: "m6 6 12 12 M6 18 18 6",
    arrow: "M12 5v14 M5 12l7 7 7-7",
    up: "M12 19V5 M5 12l7-7 7 7",
    wifi: "M2 8a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M8 16a6 6 0 0 1 8 0 M12 20h.01",
    check: "m5 12 4 4L19 6",
    edit: "m16 3 5 5-12 12-6 1 1-6z M14 5l5 5",
    trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
    refresh:
      "M3 11a9 9 0 0 1 16-6l2 2 M21 3v4h-4 M21 13a9 9 0 0 1-16 6l-2-2 M3 21v-4h4",
    pause: "M7 4v16 M17 4v16",
    play: "m7 3 14 9-14 9z",
    shield: "M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6z M8 12l3 3 5-6",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
    download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
    upload: "M12 15V3 M7 8l5-5 5 5 M4 16v5h16v-5",
    logout: "M10 3H4v18h6 M10 12h11 M17 8l4 4-4 4",
    globe:
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c-6 5-6 13 0 18 M12 3c6 5 6 13 0 18",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
export const Button = ({
  icon,
  children,
  variant = "",
  className = "",
  ...props
}) => (
  <button className={`btn ${variant} ${className}`} {...props}>
    {icon && <Icon name={icon} size={18} />} {children}
  </button>
);
export function Badge({ subscriber, settings }) {
  const status = subscriberService.status(subscriber, settings);
  return (
    <span className={`badge ${status}`}>
      <span className="dot" />
      {statusLabels[status]}
    </span>
  );
}
export function Online({ subscriber }) {
  const on = subscriberService.isOnline(subscriber);
  return (
    <span className={`connection ${on ? "on" : ""}`}>
      <span className="dot" />
      {on ? "متصل" : "غير متصل"}
    </span>
  );
}
export function Remaining({ subscriber, settings }) {
  const left = daysLeft(subscriber.expiryDate);
  return (
    <span
      className={`remaining ${left <= 0 ? "red" : left <= (settings?.warningDays ?? 7) ? "orange" : ""}`}
    >
      {left === 0
        ? "ينتهي اليوم"
        : left < 0
          ? `منتهي منذ ${Math.abs(left)} يوم`
          : `متبقي ${left} يوم`}
    </span>
  );
}
export function Empty({
  title = "لا توجد بيانات",
  message = "ستظهر البيانات هنا عند إضافتها.",
  action,
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name="layers" size={34} />
      </div>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
export function Field({ label, error, children, ...props }) {
  const id = useId();
  return (
    <div className={`field ${props.className || ""}`}>
      <label htmlFor={id}>{label}</label>
      {typeof children === "function"
        ? children(id)
        : cloneElement(children, {
            id,
            "aria-invalid": !!error,
            "aria-describedby": error ? `${id}-error` : undefined,
          })}
      {error && (
        <small id={`${id}-error`} role="alert" className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Input({ label, error, className, ...props }) {
  const id = useId();
  return (
    <div className={`field ${className || ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <small id={`${id}-error`} role="alert" className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "wide" : ""}`}
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-btn" aria-label="إغلاق" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  message,
  onConfirm,
  onClose,
  label = "تأكيد",
  danger = false,
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {label}
        </Button>
        <Button onClick={onClose}>إلغاء</Button>
      </div>
    </Modal>
  );
}
export function PageTitle({ eyebrow, title, description, children }) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
export const money = (amount, settings) =>
  amount == null
    ? "غير محدد"
    : `${new Intl.NumberFormat("en-US").format(amount)} ${settings.currency}`;
export function SubscriberTable({ rows, data, onSelect, compact = false }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>المشترك</th>
            <th>الباقة والسرعة</th>
            <th>حالة الاشتراك</th>
            <th>الاتصال</th>
            <th>تاريخ الانتهاء</th>
            <th>
              <span className="sr-only">التفاصيل</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>
                <button
                  className="subscriber-link"
                  onClick={() => onSelect(s.id)}
                >
                  <span className="avatar">{s.name.slice(0, 1)}</span>
                  <span>
                    <strong>{s.name}</strong>
                    <small dir="ltr">{s.username}</small>
                  </span>
                </button>
              </td>
              <td>
                <strong>
                  {data.packages.find((p) => p.id === s.packageId)?.name}
                </strong>
                <small dir="ltr">
                  ↓ {s.download} / ↑ {s.upload} Mbps
                </small>
              </td>
              <td>
                <Badge subscriber={s} settings={data.settings} />
              </td>
              <td>
                <Online subscriber={s} />
              </td>
              <td>
                <span dir="ltr">{formatDate(s.expiryDate)}</span>
                <small>
                  <Remaining subscriber={s} settings={data.settings} />
                </small>
              </td>
              <td>
                <button
                  className="icon-btn"
                  aria-label={`تفاصيل ${s.name}`}
                  onClick={() => onSelect(s.id)}
                >
                  <Icon name="eye" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="subscriber-cards">
        {rows.map((s) => (
          <button
            className="subscriber-card"
            key={s.id}
            onClick={() => onSelect(s.id)}
          >
            <div className="card-top">
              <div className="person">
                <span className="avatar">{s.name.slice(0, 1)}</span>
                <div>
                  <strong>{s.name}</strong>
                  <small dir="ltr">{s.username}</small>
                </div>
              </div>
              <Badge subscriber={s} settings={data.settings} />
            </div>
            <div className="card-bottom">
              <span>
                {data.packages.find((p) => p.id === s.packageId)?.name}{" "}
                <small dir="ltr">
                  ↓ {s.download} / ↑ {s.upload}
                </small>
              </span>
              <Online subscriber={s} />
            </div>
            <div className="card-footer">
              <span dir="ltr">{formatDate(s.expiryDate)}</span>
              <Remaining subscriber={s} settings={data.settings} />
            </div>
          </button>
        ))}
      </div>
      {!compact && <div className="table-footer">عرض {rows.length} مشترك</div>}
    </div>
  );
}

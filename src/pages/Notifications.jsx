import { PageTitle, Button, Icon, Empty, Confirm } from "../components/ui.jsx";
import { notificationService } from "../services/notificationService.js";
import { formatTime } from "../services/dateService.js";
import { useState } from "react";
export default function Notifications({ data, mutate, notify, select }) {
  const [confirm, setConfirm] = useState(false);
  const perform = async (fn, message) => {
    try {
      await mutate(fn);
      if (message) notify(message);
      return true;
    } catch (e) {
      notify(e.message, "error");
      return false;
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="ابقَ على اطلاع"
        title="التنبيهات"
        description={`${data.notifications.filter((x) => !x.read).length} تنبيه غير مقروء`}
      >
        <Button
          icon="check"
          disabled={!data.notifications.some((x) => !x.read)}
          onClick={() => {
            perform(
              (d) => notificationService.markAllRead(d),
              "تم تحديد جميع التنبيهات كمقروءة",
            );
          }}
        >
          قراءة الكل
        </Button>
        <Button
          variant="danger-soft"
          icon="trash"
          disabled={!data.notifications.length}
          onClick={() => setConfirm(true)}
        >
          مسح الكل
        </Button>
      </PageTitle>
      <section className="panel notification-list">
        {data.notifications.length ? (
          data.notifications.map((n) => (
            <article className={n.read ? "read" : "unread"} key={n.id}>
              <span className="notice-icon">
                <Icon name="bell" />
              </span>
              <div className="notice-body">
                <strong>{n.message}</strong>
                <small>{formatTime(n.at)}</small>
                {n.subscriberId &&
                  data.subscribers.some((s) => s.id === n.subscriberId) && (
                    <button
                      className="text-btn"
                      onClick={() => select(n.subscriberId)}
                    >
                      عرض المشترك ←
                    </button>
                  )}
              </div>
              <div className="notice-actions">
                {!n.read && (
                  <button
                    className="icon-btn"
                    aria-label={`تحديد كمقروء: ${n.message}`}
                    onClick={() =>
                      perform((d) => notificationService.markRead(d, n.id))
                    }
                  >
                    <Icon name="check" />
                  </button>
                )}
                <button
                  className="icon-btn"
                  aria-label={`مسح التنبيه: ${n.message}`}
                  onClick={() =>
                    perform((d) => notificationService.remove(d, n.id))
                  }
                >
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <Empty
            title="لا توجد تنبيهات"
            message="ستظهر التنبيهات الجديدة عند اقتراب انتهاء الاشتراكات أو تجديدها."
          />
        )}
      </section>
      {confirm && (
        <Confirm
          title="مسح جميع التنبيهات؟"
          message="سيتم حذف التنبيهات الحالية. لن يعاد إنشاء التنبيهات المحذوفة نفسها في هذا اليوم."
          label="مسح الكل"
          danger
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            if (
              await perform(
                (d) => notificationService.clear(d),
                "تم مسح جميع التنبيهات",
              )
            )
              setConfirm(false);
          }}
        />
      )}
    </>
  );
}

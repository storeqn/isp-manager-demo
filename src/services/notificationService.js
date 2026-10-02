import { daysLeft, today } from "./dateService.js";
import { uid, activityService } from "./activityService.js";
export const notificationService = {
  add(data, message, subscriberId = null) {
    if (data.settings.notificationsEnabled)
      data.notifications.unshift({
        id: uid("notice"),
        message,
        subscriberId,
        read: false,
        at: new Date().toISOString(),
      });
  },
  sync(data, current = today()) {
    let changed = false;
    for (const s of data.subscribers) {
      const left = daysLeft(s.expiryDate, current);
      if (left <= 0 && s.online) {
        s.online = false;
        changed = true;
      }
      if (s.suspended) continue;
      const expiredKey = `expired:${s.id}:${s.expiryDate}`;
      if (left <= 0 && !data.generatedKeys.includes(expiredKey)) {
        activityService.record(data, "انتهاء", s, `انتهى اشتراك ${s.name}`);
        data.generatedKeys.push(expiredKey);
        changed = true;
      }
      if (
        !data.settings.notificationsEnabled ||
        left > data.settings.warningDays
      )
        continue;
      const key = `notice:${s.id}:${s.expiryDate}:${left <= 0 ? "expired" : current}`;
      if (!data.generatedKeys.includes(key)) {
        this.add(
          data,
          left <= 0
            ? `انتهى اشتراك ${s.name}${left === 0 ? " اليوم" : ""}`
            : `اشتراك ${s.name} ينتهي بعد ${left} يوم`,
          s.id,
        );
        data.generatedKeys.push(key);
        changed = true;
      }
    }
    return changed;
  },
  markRead(data, id) {
    const n = data.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  },
  markAllRead(data) {
    data.notifications.forEach((n) => {
      n.read = true;
    });
  },
  remove(data, id) {
    data.notifications = data.notifications.filter((x) => x.id !== id);
  },
  clear(data) {
    data.notifications = [];
  },
};

import { subscriberService } from "./subscriberService.js";
import { today } from "./dateService.js";
export const reportService = {
  summary(data) {
    const status = (s) => subscriberService.status(s, data.settings);
    const online = data.subscribers.filter((s) =>
      subscriberService.isOnline(s),
    ).length;
    return {
      total: data.subscribers.length,
      active: data.subscribers.filter((s) =>
        ["active", "soon"].includes(status(s)),
      ).length,
      online,
      offline: data.subscribers.length - online,
      expired: data.subscribers.filter((s) => status(s) === "expired").length,
      soon: data.subscribers.filter((s) => status(s) === "soon").length,
      suspended: data.subscribers.filter((s) => status(s) === "suspended")
        .length,
      newToday: data.subscribers.filter(
        (s) => today(new Date(s.createdAt)) === today(),
      ).length,
      renewals: data.renewals.length,
      renewalRevenue: data.renewals.reduce((n, x) => n + x.amount, 0),
      estimatedRevenue: data.subscribers
        .filter((s) => ["active", "soon"].includes(status(s)))
        .reduce(
          (n, s) =>
            n + (data.packages.find((p) => p.id === s.packageId)?.price || 0),
          0,
        ),
      byPackage: data.packages.map((p) => ({
        ...p,
        count: data.subscribers.filter((s) => s.packageId === p.id).length,
      })),
    };
  },
};

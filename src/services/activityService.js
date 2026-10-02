export const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
export const activityService = {
  record(data, type, subscriber, message) {
    data.activities.unshift({
      id: uid("act"),
      type,
      subscriberId: subscriber?.id ?? null,
      subscriberName: subscriber?.name ?? "النظام",
      message,
      at: new Date().toISOString(),
    });
  },
};

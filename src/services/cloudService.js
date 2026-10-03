export const cloudService = {
  async request(path, { method = "GET", body, signal, authEvent = true } = {}) {
    let response;
    try {
      response = await fetch(`/api/${path}`, {
        method,
        credentials: "same-origin",
        cache: "no-store",
        signal,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw new Error(
        "تعذر تأكيد العملية من الخادم. تحقق من الإنترنت وحدّث البيانات قبل إعادة المحاولة",
      );
    }
    if (
      path === "session" &&
      (response.status === 404 ||
        response.headers.get("Content-Type")?.includes("text/html"))
    )
      return { local: true };
    let value;
    try {
      value = await response.json();
    } catch {
      throw new Error("استجابة الخادم غير صحيحة. تحقق من نشر Pages Functions");
    }
    if (!response.ok) {
      if (response.status === 401 && authEvent)
        window.dispatchEvent(new Event("isp-auth-required"));
      throw Object.assign(new Error(value.error || "تعذر إكمال العملية"), {
        status: response.status,
      });
    }
    return value;
  },
  read() {
    return this.request("state");
  },
  write(data, revision) {
    return this.request("state", { method: "PUT", body: { data, revision } });
  },
};

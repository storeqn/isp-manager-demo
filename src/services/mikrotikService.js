// Frontend-only mock. Replace with a secure backend client; never RouterOS credentials.
export const mikrotikService = {
  async getStatus() {
    return { connected: true, mock: true };
  },
  async command() {
    throw new Error("أوامر MikroTik غير متاحة في النسخة التجريبية");
  },
};

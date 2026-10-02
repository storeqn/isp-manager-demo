export const networkService = {
  status() {
    return {
      mock: true,
      source: "Starlink",
      connected: true,
      download: 185,
      upload: 32,
      ping: 35,
      uptime: 12,
      traffic: 180,
    };
  },
  traffic(period) {
    const n = period === "24h" ? 24 : period === "7d" ? 7 : 30;
    return Array.from({ length: n }, (_, i) => ({
      label: period === "24h" ? `${i}:00` : `يوم ${i + 1}`,
      download: Math.round(72 + Math.sin(i * 1.8) * 30 + (i % 4) * 13),
      upload: Math.round(16 + Math.sin(i * 1.3) * 6 + (i % 3) * 3),
    }));
  },
};

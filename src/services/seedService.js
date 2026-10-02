import { today, addDays, dayNumber } from "./dateService.js";
const shift = (date, n) =>
  new Date((dayNumber(date) + n) * 86400000).toISOString().slice(0, 10);
export function createSeed() {
  const date = today();
  const packages = [
    {
      id: "pkg-1",
      name: "اقتصادية",
      download: 10,
      upload: 3,
      duration: 30,
      price: 25000,
    },
    {
      id: "pkg-2",
      name: "أساسية",
      download: 20,
      upload: 5,
      duration: 30,
      price: 35000,
    },
    {
      id: "pkg-3",
      name: "متقدمة",
      download: 30,
      upload: 10,
      duration: 30,
      price: 45000,
    },
    {
      id: "pkg-4",
      name: "Premium",
      download: 50,
      upload: 15,
      duration: 30,
      price: 60000,
    },
  ];
  const names = [
    "أحمد علي",
    "محمد حسن",
    "علي حسين",
    "حيدر كريم",
    "مصطفى جاسم",
    "فاطمة خالد",
    "زينب عباس",
    "حسن محمود",
    "عمر سعد",
    "عباس وليد",
    "نور أحمد",
    "سارة يوسف",
    "مهند سالم",
    "كرار ماجد",
  ];
  const left = [24, -4, 2, 18, 0, 6, 29, -12, 10, 3, 20, 16, 5, 26];
  const subscribers = names.map((name, i) => {
    const p = packages[i % 4];
    const activationDate = shift(date, left[i] - 30);
    return {
      id: `SUB-${String(i + 1).padStart(3, "0")}`,
      name,
      phone: `0770123${String(4000 + i)}`,
      username: `demo.user${i + 1}`,
      password: "demo-only",
      ip: `10.10.0.${i + 10}`,
      packageId: p.id,
      download: p.download,
      upload: p.upload,
      activationDate,
      expiryDate: addDays(activationDate, 30),
      duration: 30,
      suspended: i === 3 || i === 10,
      online: i % 3 !== 0 && left[i] > 0 && i !== 10,
      notes: i === 0 ? "مشترك تجريبي — القرنة" : "",
      usageGB: 8 + i * 4.7,
      createdAt: `${activationDate}T09:00:00.000Z`,
    };
  });
  return {
    app: "isp-manager-demo",
    schemaVersion: 1,
    subscribers,
    packages,
    settings: {
      networkName: "شبكة القرنة",
      systemName: "ISP Manager",
      currency: "IQD",
      defaultDuration: 30,
      warningDays: 7,
      showPrices: true,
      notificationsEnabled: true,
    },
    renewals: [],
    notifications: [],
    generatedKeys: [],
    activities: [
      {
        id: "seed-activity",
        type: "تهيئة",
        subscriberId: null,
        subscriberName: "النظام",
        message: "تم تجهيز البيانات التجريبية لأول تشغيل",
        at: new Date().toISOString(),
      },
    ],
  };
}

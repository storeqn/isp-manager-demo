import { storageService } from "./storageService.js";
import { today } from "./dateService.js";
import { notificationService } from "./notificationService.js";
import { cloudService } from "./cloudService.js";
let state;
let loadError = "";
try {
  state = storageService.load();
  if (notificationService.sync(state)) storageService.save(state);
} catch (e) {
  loadError = e.message;
}
const listeners = new Set();
let lastDay = today();
let cloud = false;
let revision = 0;
let busy = false;
const emit = () => listeners.forEach((fn) => fn());
const adopt = (value) => {
  state = value.data;
  revision = value.revision;
  loadError = "";
  emit();
};
async function persist(next) {
  if (!cloud) {
    storageService.save(next);
    state = next;
    emit();
    return;
  }
  try {
    adopt(await cloudService.write(next, revision));
  } catch (e) {
    if (e.status === 409) adopt(await cloudService.read());
    throw e;
  }
}
export const store = {
  getSnapshot: () => state,
  getError: () => loadError,
  isCloud: () => cloud,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  async connect() {
    cloud = true;
    adopt(await cloudService.read());
    return state !== null;
  },
  async mutate(fn) {
    if (busy) throw new Error("جارٍ حفظ عملية أخرى. انتظر اكتمالها");
    busy = true;
    try {
      const next = structuredClone(state);
      const result = fn(next);
      notificationService.sync(next);
      await persist(next);
      return result;
    } finally {
      busy = false;
    }
  },
  async restore(data) {
    if (busy) throw new Error("انتظر اكتمال الحفظ أولاً");
    busy = true;
    try {
      const next = storageService.parseBackup(JSON.stringify(data));
      await persist(next);
      loadError = "";
    } finally {
      busy = false;
    }
  },
  async sync() {
    if (busy) return;
    busy = true;
    try {
      if (cloud) {
        const remote = await cloudService.read();
        if (remote.revision !== revision) adopt(remote);
      }
      if (!state) return;
      const next = structuredClone(state);
      const changed = notificationService.sync(next);
      const dateChanged = today() !== lastDay;
      if (changed || dateChanged) {
        if (changed) await persist(next);
        else {
          state = next;
          emit();
        }
        lastDay = today();
      }
    } finally {
      busy = false;
    }
  },
  async reload() {
    if (cloud) return this.sync();
    state = storageService.load();
    loadError = "";
    emit();
  },
};

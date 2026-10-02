import { storageService } from "./storageService.js";
import { today } from "./dateService.js";
import { notificationService } from "./notificationService.js";
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
export const store = {
  getSnapshot: () => state,
  getError: () => loadError,
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  mutate(fn) {
    const next = structuredClone(state);
    const result = fn(next);
    notificationService.sync(next);
    storageService.save(next);
    state = next;
    listeners.forEach((fn) => fn());
    return result;
  },
  restore(data) {
    storageService.save(storageService.parseBackup(JSON.stringify(data)));
    state = data;
    loadError = "";
    listeners.forEach((fn) => fn());
  },
  sync() {
    if (!state) return;
    const next = structuredClone(state);
    const changed = notificationService.sync(next);
    const dateChanged = today() !== lastDay;
    if (changed || dateChanged) {
      storageService.save(next);
      state = next;
      lastDay = today();
      listeners.forEach((fn) => fn());
    }
  },
  reload() {
    state = storageService.load();
    loadError = "";
    listeners.forEach((fn) => fn());
  },
};

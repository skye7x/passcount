export const STORAGE_KEY_COUNTERS = 'passcount_counters';
export const STORAGE_KEY_SETTINGS = 'passcount_settings';
export const STORAGE_KEY_LOGS = 'passcount_logs';
export const STORAGE_KEY_TRAININGS = 'passcount_trainings';
export const STORAGE_KEY_EQUIPMENT = 'passcount_equipment';
export const STORAGE_KEY_EQUIPMENT_DAY = 'passcount_equipment_day';

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to persist data', e);
  }
}

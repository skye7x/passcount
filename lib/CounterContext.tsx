'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  Counter,
  AppSettings,
  DEFAULT_SETTINGS,
  LogEntry,
  Training,
  EquipmentList,
  EquipmentItem,
} from './types';
import {
  rescheduleAllTrainings,
  cancelAllTrainingNotifications,
  rescheduleAllExpiryNotifications,
  cancelCounterNotifications,
} from './notifications';

const STORAGE_KEY_COUNTERS = 'passcount_counters';
const STORAGE_KEY_SETTINGS = 'passcount_settings';
const STORAGE_KEY_LOGS = 'passcount_logs';
const STORAGE_KEY_TRAININGS = 'passcount_trainings';
const STORAGE_KEY_EQUIPMENT = 'passcount_equipment';
const STORAGE_KEY_EQUIPMENT_DAY = 'passcount_equipment_day';

interface CounterContextType {
  counters: Counter[];
  settings: AppSettings;
  logs: LogEntry[];
  trainings: Training[];
  equipment: EquipmentList[];
  addCounter: (name: string, total: number, color: string, expiresAt: number | null) => void;
  deleteCounter: (id: string) => void;
  decrementCounter: (id: string) => void;
  resetCounter: (id: string) => void;
  updateCounter: (
    id: string,
    name: string,
    total: number,
    color: string,
    expiresAt: number | null,
  ) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addTraining: (training: Omit<Training, 'id'>) => void;
  updateTraining: (id: string, data: Partial<Training>) => void;
  deleteTraining: (id: string) => void;
  clearLogs: () => void;
  addEquipmentList: (name: string, color: string, items: EquipmentItem[]) => void;
  updateEquipmentList: (id: string, data: Partial<EquipmentList>) => void;
  deleteEquipmentList: (id: string) => void;
  toggleEquipmentItem: (listId: string, itemId: string) => void;
  addEquipmentItem: (listId: string, name: string) => void;
  removeEquipmentItem: (listId: string, itemId: string) => void;
  setEquipmentPacked: (listId: string, packed: boolean) => void;
  loading: boolean;
}

const CounterContext = createContext<CounterContextType | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function resetEquipmentPacked(lists: EquipmentList[]): EquipmentList[] {
  return lists.map(list => ({
    ...list,
    packed: false,
    packedAt: null,
    items: list.items.map(item => ({ ...item, packed: false })),
  }));
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to persist data', e);
  }
}

export function CounterProvider({ children }: { children: React.ReactNode }) {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [equipment, setEquipment] = useState<EquipmentList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedDay = readStorage<string | null>(STORAGE_KEY_EQUIPMENT_DAY, null);
    const today = dayKey(new Date());
    const storedEquipment = readStorage<EquipmentList[]>(STORAGE_KEY_EQUIPMENT, []);
    if (savedDay !== today) {
      writeStorage(STORAGE_KEY_EQUIPMENT_DAY, today);
      const needsReset = storedEquipment.some(
        list => list.packed || list.items.some(item => item.packed),
      );
      setEquipment(needsReset ? resetEquipmentPacked(storedEquipment) : storedEquipment);
      if (needsReset) {
        writeStorage(STORAGE_KEY_EQUIPMENT, resetEquipmentPacked(storedEquipment));
      }
    } else {
      setEquipment(storedEquipment);
    }

    setCounters(readStorage(STORAGE_KEY_COUNTERS, []));
    setSettings({ ...DEFAULT_SETTINGS, ...readStorage(STORAGE_KEY_SETTINGS, {}) });
    setLogs(readStorage(STORAGE_KEY_LOGS, []));
    setTrainings(readStorage(STORAGE_KEY_TRAININGS, []));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && settings.notificationsEnabled) {
      rescheduleAllTrainings(trainings);
      rescheduleAllExpiryNotifications(counters);
    }
  }, [trainings, counters, settings.notificationsEnabled, loading]);

  useEffect(() => {
    if (loading) return;

    const checkDay = () => {
      const savedDay = readStorage<string | null>(STORAGE_KEY_EQUIPMENT_DAY, null);
      const today = dayKey(new Date());
      if (savedDay === today) return;
      writeStorage(STORAGE_KEY_EQUIPMENT_DAY, today);
      setEquipment(prev => {
        const updated = resetEquipmentPacked(prev);
        writeStorage(STORAGE_KEY_EQUIPMENT, updated);
        return updated;
      });
    };

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 5, 0);
    let timeout: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval> | null = null;
    timeout = setTimeout(() => {
      checkDay();
      interval = setInterval(checkDay, 60 * 1000);
    }, nextMidnight.getTime() - now.getTime());

    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkDay();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loading]);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const log: LogEntry = { ...entry, id: generateId(), timestamp: Date.now() };
    setLogs(prev => {
      const updated = [log, ...prev].slice(0, 200);
      writeStorage(STORAGE_KEY_LOGS, updated);
      return updated;
    });
  }, []);

  const addCounter = useCallback(
    (name: string, total: number, color: string, expiresAt: number | null) => {
      const id = generateId();
      setCounters(prev => {
        const counter: Counter = {
          id,
          name,
          total,
          remaining: total,
          color,
          createdAt: Date.now(),
          expiresAt,
        };
        const updated = [...prev, counter];
        writeStorage(STORAGE_KEY_COUNTERS, updated);
        return updated;
      });
      addLog({ counterId: id, counterName: name, type: 'create' });
    },
    [addLog],
  );

  const deleteCounter = useCallback((id: string) => {
    cancelCounterNotifications(id).catch(() => {});
    setCounters(prev => {
      const updated = prev.filter(c => c.id !== id);
      writeStorage(STORAGE_KEY_COUNTERS, updated);
      return updated;
    });
  }, []);

  const decrementCounter = useCallback((id: string) => {
    setCounters(prev => {
      const updated = prev.map(c =>
        c.id === id && c.remaining > 0 ? { ...c, remaining: c.remaining - 1 } : c,
      );
      writeStorage(STORAGE_KEY_COUNTERS, updated);
      const c = updated.find(x => x.id === id);
      if (c) addLog({ counterId: id, counterName: c.name, type: 'decrement' });
      return updated;
    });
  }, [addLog]);

  const resetCounter = useCallback((id: string) => {
    setCounters(prev => {
      const c = prev.find(x => x.id === id);
      const updated = prev.map(c => (c.id === id ? { ...c, remaining: c.total } : c));
      writeStorage(STORAGE_KEY_COUNTERS, updated);
      if (c) addLog({ counterId: id, counterName: c.name, type: 'reset' });
      return updated;
    });
  }, [addLog]);

  const updateCounter = useCallback(
    (id: string, name: string, total: number, color: string, expiresAt: number | null) => {
      setCounters(prev => {
        const updated = prev.map(c =>
          c.id === id
            ? { ...c, name, total, remaining: Math.min(c.remaining, total), color, expiresAt }
            : c,
        );
        writeStorage(STORAGE_KEY_COUNTERS, updated);
        return updated;
      });
      addLog({ counterId: id, counterName: name, type: 'edit' });
    },
    [addLog],
  );

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      writeStorage(STORAGE_KEY_SETTINGS, newSettings);
      return newSettings;
    });
  }, []);

  const addTraining = useCallback((training: Omit<Training, 'id'>) => {
    const t: Training = { ...training, id: generateId() };
    setTrainings(prev => {
      const updated = [...prev, t];
      writeStorage(STORAGE_KEY_TRAININGS, updated);
      return updated;
    });
  }, []);

  const updateTraining = useCallback((id: string, data: Partial<Training>) => {
    setTrainings(prev => {
      const updated = prev.map(t => (t.id === id ? { ...t, ...data } : t));
      writeStorage(STORAGE_KEY_TRAININGS, updated);
      return updated;
    });
  }, []);

  const deleteTraining = useCallback((id: string) => {
    setTrainings(prev => {
      const target = prev.find(t => t.id === id);
      if (target) {
        cancelAllTrainingNotifications(target.id, target.days).catch(() => {});
      }
      const updated = prev.filter(t => t.id !== id);
      writeStorage(STORAGE_KEY_TRAININGS, updated);
      return updated;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    writeStorage(STORAGE_KEY_LOGS, []);
  }, []);

  const addEquipmentList = useCallback((name: string, color: string, items: EquipmentItem[]) => {
    const list: EquipmentList = {
      id: generateId(),
      name,
      color,
      items,
      packed: false,
      packedAt: null,
      createdAt: Date.now(),
    };
    setEquipment(prev => {
      const updated = [...prev, list];
      writeStorage(STORAGE_KEY_EQUIPMENT, updated);
      return updated;
    });
  }, []);

  const updateEquipmentList = useCallback((id: string, data: Partial<EquipmentList>) => {
    setEquipment(prev => {
      const updated = prev.map(list => (list.id === id ? { ...list, ...data } : list));
      writeStorage(STORAGE_KEY_EQUIPMENT, updated);
      return updated;
    });
  }, []);

  const deleteEquipmentList = useCallback((id: string) => {
    setEquipment(prev => {
      const updated = prev.filter(list => list.id !== id);
      writeStorage(STORAGE_KEY_EQUIPMENT, updated);
      return updated;
    });
  }, []);

  const toggleEquipmentItem = useCallback((listId: string, itemId: string) => {
    setEquipment(prev => {
      const updated = prev.map(list =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map(item =>
                item.id === itemId ? { ...item, packed: !item.packed } : item,
              ),
            }
          : list,
      );
      writeStorage(STORAGE_KEY_EQUIPMENT, updated);
      return updated;
    });
  }, []);

  const addEquipmentItem = useCallback((listId: string, name: string) => {
    const item: EquipmentItem = { id: generateId(), name, packed: false };
    setEquipment(prev => {
      const updated = prev.map(list =>
        list.id === listId ? { ...list, items: [...list.items, item] } : list,
      );
      writeStorage(STORAGE_KEY_EQUIPMENT, updated);
      return updated;
    });
  }, []);

  const removeEquipmentItem = useCallback((listId: string, itemId: string) => {
    setEquipment(prev => {
      const updated = prev.map(list =>
        list.id === listId
          ? { ...list, items: list.items.filter(item => item.id !== itemId) }
          : list,
      );
      writeStorage(STORAGE_KEY_EQUIPMENT, updated);
      return updated;
    });
  }, []);

  const setEquipmentPacked = useCallback((listId: string, packed: boolean) => {
    setEquipment(prev => {
      const updated = prev.map(list =>
        list.id === listId
          ? {
              ...list,
              packed,
              packedAt: packed ? Date.now() : null,
              items: list.items.map(item => ({ ...item, packed })),
            }
          : list,
      );
      writeStorage(STORAGE_KEY_EQUIPMENT, updated);
      return updated;
    });
  }, []);

  return (
    <CounterContext.Provider
      value={{
        counters,
        settings,
        logs,
        trainings,
        addCounter,
        deleteCounter,
        decrementCounter,
        resetCounter,
        updateCounter,
        updateSettings,
        addTraining,
        updateTraining,
        deleteTraining,
        clearLogs,
        equipment,
        addEquipmentList,
        updateEquipmentList,
        deleteEquipmentList,
        toggleEquipmentItem,
        addEquipmentItem,
        removeEquipmentItem,
        setEquipmentPacked,
        loading,
      }}>
      {children}
    </CounterContext.Provider>
  );
}

export function useCounters() {
  const ctx = useContext(CounterContext);
  if (!ctx) throw new Error('useCounters must be used within CounterProvider');
  return ctx;
}

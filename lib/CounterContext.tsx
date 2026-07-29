'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Counter, AppSettings, DEFAULT_SETTINGS, LogEntry, Training } from './types';
import { rescheduleAllTrainings } from './notifications';

const STORAGE_KEY_COUNTERS = 'passcount_counters';
const STORAGE_KEY_SETTINGS = 'passcount_settings';
const STORAGE_KEY_LOGS = 'passcount_logs';
const STORAGE_KEY_TRAININGS = 'passcount_trainings';

interface CounterContextType {
  counters: Counter[];
  settings: AppSettings;
  logs: LogEntry[];
  trainings: Training[];
  addCounter: (name: string, total: number, color: string) => void;
  deleteCounter: (id: string) => void;
  decrementCounter: (id: string) => void;
  resetCounter: (id: string) => void;
  updateCounter: (id: string, name: string, total: number, color: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addTraining: (training: Omit<Training, 'id'>) => void;
  updateTraining: (id: string, data: Partial<Training>) => void;
  deleteTraining: (id: string) => void;
  clearLogs: () => void;
  loading: boolean;
}

const CounterContext = createContext<CounterContextType | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCounters(readStorage(STORAGE_KEY_COUNTERS, []));
    setSettings({ ...DEFAULT_SETTINGS, ...readStorage(STORAGE_KEY_SETTINGS, {}) });
    setLogs(readStorage(STORAGE_KEY_LOGS, []));
    setTrainings(readStorage(STORAGE_KEY_TRAININGS, []));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && settings.notificationsEnabled) {
      rescheduleAllTrainings(trainings);
    }
  }, [trainings, settings.notificationsEnabled, loading]);

  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const log: LogEntry = { ...entry, id: generateId(), timestamp: Date.now() };
    setLogs(prev => {
      const updated = [log, ...prev].slice(0, 200);
      writeStorage(STORAGE_KEY_LOGS, updated);
      return updated;
    });
  }, []);

  const addCounter = useCallback((name: string, total: number, color: string) => {
    const id = generateId();
    setCounters(prev => {
      const counter: Counter = { id, name, total, remaining: total, color, createdAt: Date.now() };
      const updated = [...prev, counter];
      writeStorage(STORAGE_KEY_COUNTERS, updated);
      return updated;
    });
    addLog({ counterId: id, counterName: name, type: 'create' });
  }, [addLog]);

  const deleteCounter = useCallback((id: string) => {
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
    (id: string, name: string, total: number, color: string) => {
      setCounters(prev => {
        const updated = prev.map(c =>
          c.id === id
            ? { ...c, name, total, remaining: Math.min(c.remaining, total), color }
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
      const updated = prev.filter(t => t.id !== id);
      writeStorage(STORAGE_KEY_TRAININGS, updated);
      return updated;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    writeStorage(STORAGE_KEY_LOGS, []);
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

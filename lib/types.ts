export interface Counter {
  id: string;
  name: string;
  total: number;
  remaining: number;
  color: string;
  createdAt: number;
  expiresAt: number | null;
}

export interface LogEntry {
  id: string;
  counterId: string;
  counterName: string;
  timestamp: number;
  type: 'decrement' | 'reset' | 'edit' | 'create';
}

export interface Training {
  id: string;
  name: string;
  days: number[];
  hour: number;
  minute: number;
  enabled: boolean;
  color: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  packed: boolean;
}

export interface EquipmentList {
  id: string;
  name: string;
  color: string;
  items: EquipmentItem[];
  packed: boolean;
  packedAt: number | null;
  createdAt: number;
}

export interface AppSettings {
  hapticFeedback: boolean;
  confirmDelete: boolean;
  sortOrder: 'newest' | 'oldest' | 'name' | 'remaining';
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  hapticFeedback: true,
  confirmDelete: true,
  sortOrder: 'newest',
  notificationsEnabled: false,
};

export const SWATCH_COLORS = [
  '#a1a1a6',
  '#8e8e93',
  '#7c7c80',
  '#636366',
  '#555558',
  '#48484a',
  '#3a3a3c',
  '#2c2c2e',
];

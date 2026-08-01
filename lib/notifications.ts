import { Counter, Training } from './types';

const TEST_NOTIFICATION_ID = 2100000000;
const REMINDER_HOUR = 9;

export type ExpiryNotificationType = '7days' | 'tomorrow' | 'renewal';

const EXPIRY_NOTIFICATION_TYPES: ExpiryNotificationType[] = [
  '7days',
  'tomorrow',
  'renewal',
];

function notificationId(hashBase: string): number {
  let id = 0;
  for (let i = 0; i < hashBase.length; i++) {
    id = (id * 31 + hashBase.charCodeAt(i)) % 2147483647;
  }
  return id || 1;
}

function trainingNotificationId(trainingId: string, dayIndex: number): number {
  return notificationId(trainingId + String(dayIndex));
}

function counterNotificationId(counterId: string, type: ExpiryNotificationType): number {
  return notificationId(counterId + type);
}

async function isNativePlatform(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    }
  } catch {
  }

  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function scheduleTrainingNotification(
  training: Training,
): Promise<void> {
  if (!training.enabled) return;
  if (typeof window === 'undefined') return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      const notifications = training.days.map(day => ({
        title: training.name,
        body: 'Time for your training!',
        id: trainingNotificationId(training.id, day),
        schedule: {
          on: {
            weekday: ((day + 1) % 7) + 1,
            hour: training.hour,
            minute: training.minute,
          },
          allowWhileIdle: true,
        },
        sound: 'default',
      }));

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
      return;
    }
  } catch (e) {
    console.error('Failed to schedule training notification', e);
  }

  if ('serviceWorker' in navigator && 'Notification' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(training.name, {
        body: `Time for your training at ${String(training.hour).padStart(2, '0')}:${String(training.minute).padStart(2, '0')}!`,
        icon: '/icons/icon-192.png',
        tag: `training-${training.id}`,
      });
    } catch {
    }
  }
}

function reminderAt(expiresAt: number, daysBefore: number): Date {
  const date = new Date(expiresAt);
  date.setHours(REMINDER_HOUR, 0, 0, 0);
  date.setDate(date.getDate() - daysBefore);
  return date;
}

export async function scheduleExpiryNotifications(counter: Counter): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!counter.expiresAt) return;
  if (!(await isNativePlatform())) return;

  const now = Date.now();
  const reminders: { type: ExpiryNotificationType; at: Date; body: string }[] = [
    {
      type: '7days',
      at: reminderAt(counter.expiresAt, 7),
      body: `${counter.name} expires in 7 days.`,
    },
    {
      type: 'tomorrow',
      at: reminderAt(counter.expiresAt, 1),
      body: `${counter.name} expires tomorrow.`,
    },
    {
      type: 'renewal',
      at: reminderAt(counter.expiresAt, 0),
      body: `${counter.name} — renew your pass.`,
    },
  ];

  const notifications = reminders
    .filter(reminder => reminder.at.getTime() > now)
    .map(reminder => ({
      title: 'PassCount',
      body: reminder.body,
      id: counterNotificationId(counter.id, reminder.type),
      schedule: {
        at: reminder.at,
        allowWhileIdle: true,
      },
      sound: 'default',
    }));

  if (notifications.length === 0) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.error('Failed to schedule expiry notifications', e);
  }
}

export async function cancelCounterNotifications(counterId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const notifications = EXPIRY_NOTIFICATION_TYPES.map(type => ({
      id: counterNotificationId(counterId, type),
    }));
    await LocalNotifications.cancel({ notifications });
  } catch (e) {
    console.error('Failed to cancel counter notifications', e);
  }
}

export async function rescheduleAllExpiryNotifications(counters: Counter[]): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!(await isNativePlatform())) return;

  for (const counter of counters) {
    await cancelCounterNotifications(counter.id);
    await scheduleExpiryNotifications(counter);
  }
}

export async function getPendingNotificationsCount(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (!(await isNativePlatform())) return 0;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    return pending.notifications.length;
  } catch (e) {
    console.error('Failed to read pending notifications', e);
    return 0;
  }
}

export async function sendTestNotification(): Promise<void> {
  if (typeof window === 'undefined') return;

  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.schedule({
      notifications: [
        {
          title: 'PassCount',
          body: 'Test notification — everything works!',
          id: TEST_NOTIFICATION_ID,
          schedule: {
            at: new Date(Date.now() + 3000),
            allowWhileIdle: true,
          },
          sound: 'default',
        },
      ],
    });
  }
}

export async function cancelTrainingNotification(id: string, days?: number[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      if (days && days.length > 0) {
        const notifications = days.map(day => ({
          id: trainingNotificationId(id, day),
        }));
        await LocalNotifications.cancel({ notifications });
      } else {
        await LocalNotifications.cancel({
          notifications: [{ id: trainingNotificationId(id, 0) }],
        });
      }
    }
  } catch {
  }
}

export async function cancelAllTrainingNotifications(trainingId: string, days: number[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      const notifications = days.map(day => ({
        id: trainingNotificationId(trainingId, day),
      }));
      if (notifications.length > 0) {
        await LocalNotifications.cancel({ notifications });
      }
    }
  } catch {
  }
}

export async function rescheduleAllTrainings(trainings: Training[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
  } catch {
    return;
  }

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const perms = await LocalNotifications.checkPermissions();
    if (perms.display !== 'granted') {
      console.warn('Notification permission not granted, skipping training scheduling');
      return;
    }
  } catch (e) {
    console.error('Failed to check notification permission', e);
    return;
  }

  for (const training of trainings) {
    await cancelAllTrainingNotifications(training.id, training.days);
    if (training.enabled) {
      await scheduleTrainingNotification(training);
    }
  }
}

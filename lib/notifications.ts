import { Training } from './types';

function notificationId(trainingId: string, dayIndex: number): number {
  const hash = trainingId.slice(0, 8) + String(dayIndex);
  let id = 0;
  for (let i = 0; i < hash.length; i++) {
    id = (id * 31 + hash.charCodeAt(i)) % 2147483647;
  }
  return id || 1;
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
        id: notificationId(training.id, day),
        schedule: {
          on: {
            weekday: day + 2,
            hour: training.hour,
            minute: training.minute,
          },
        },
        sound: 'default',
      }));

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
      return;
    }
  } catch {
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

export async function cancelTrainingNotification(id: string, days?: number[]): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      if (days && days.length > 0) {
        const notifications = days.map(day => ({
          id: notificationId(id, day),
        }));
        await LocalNotifications.cancel({ notifications });
      } else {
        await LocalNotifications.cancel({
          notifications: [{ id: notificationId(id, 0) }],
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
        id: notificationId(trainingId, day),
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

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  for (const training of trainings) {
    await cancelAllTrainingNotifications(training.id, training.days);
    if (training.enabled) {
      await scheduleTrainingNotification(training);
    }
  }
}

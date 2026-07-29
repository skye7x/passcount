import { Capacitor } from '@capacitor/core';

export async function triggerHaptic(
  style: 'light' | 'medium' | 'heavy' = 'light',
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (Capacitor.isNativePlatform()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const map = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: map[style] });
    } catch {
      // plugin not available, ignore
    }
    return;
  }

  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 20, heavy: 35 };
    navigator.vibrate(durations[style]);
  }
}

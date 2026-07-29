import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.passcount.app',
  appName: 'passcount',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#000000',
};

export default config;

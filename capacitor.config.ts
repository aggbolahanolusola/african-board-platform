import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nurtgov.app',
  appName: 'NurtGov',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    cleartext: true,
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
    Filesystem: {
      permissions: ['storage', 'documents'],
    },
    LocalNotifications: {
      permissions: ['notifications'],
    },
    Network: {
      permissions: ['network'],
    },
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;

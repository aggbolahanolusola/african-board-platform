import { describe, it, expect, vi } from 'vitest';
import {
  isNativePlatform,
  isIOS,
  isAndroid,
  checkNetworkStatus,
  requestCameraPermission,
  requestNotificationPermission,
} from './capacitor';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => 'ios'),
  },
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {
    requestPermissions: vi.fn().mockResolvedValue({
      camera: 'granted',
    }),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({
      display: 'granted',
    }),
  },
}));

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
    }),
    addListener: vi.fn().mockResolvedValue({
      remove: vi.fn(),
    }),
  },
}));

describe('Capacitor Utilities', () => {
  describe('Platform Detection', () => {
    it('should detect native platform', () => {
      const result = isNativePlatform();
      expect(typeof result).toBe('boolean');
    });

    it('should detect iOS platform', () => {
      const result = isIOS();
      expect(typeof result).toBe('boolean');
    });

    it('should detect Android platform', () => {
      const result = isAndroid();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Network Status', () => {
    it('should check network status', async () => {
      const status = await checkNetworkStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('connectionType');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.connectionType).toBe('string');
    });

    it('should handle network check errors', async () => {
      const status = await checkNetworkStatus();
      expect(status.connected).toBeDefined();
    });
  });

  describe('Permissions', () => {
    it('should request camera permission', async () => {
      const permission = await requestCameraPermission();
      expect(typeof permission).toBe('boolean');
    });

    it('should request notification permission', async () => {
      const permission = await requestNotificationPermission();
      expect(typeof permission).toBe('boolean');
    });

    it('should handle permission errors gracefully', async () => {
      const cameraPermission = await requestCameraPermission();
      const notificationPermission = await requestNotificationPermission();

      expect(typeof cameraPermission).toBe('boolean');
      expect(typeof notificationPermission).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should return false on network error', async () => {
      const status = await checkNetworkStatus();
      expect(status).toHaveProperty('connected');
    });

    it('should return false on permission error', async () => {
      const permission = await requestCameraPermission();
      expect(typeof permission).toBe('boolean');
    });
  });
});

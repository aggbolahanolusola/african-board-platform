import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

/**
 * Check if running on native mobile platform
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Capture photo from camera or gallery
 */
export const capturePhoto = async (
  source: 'camera' | 'gallery' = 'camera'
): Promise<string | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      promptLabelPicture: 'Select Photo',
      promptLabelCancel: 'Cancel',
    });

    return image.base64String || null;
  } catch (error) {
    console.error('[Capacitor] Failed to capture photo:', error);
    return null;
  }
};

/**
 * Save file to device storage
 */
export const saveFile = async (
  filename: string,
  data: string,
  directory: 'DOCUMENTS' | 'CACHE' = 'DOCUMENTS'
): Promise<boolean> => {
  try {
    const dirMap = {
      DOCUMENTS: Directory.Documents,
      CACHE: Directory.Cache,
    };

    await Filesystem.writeFile({
      path: filename,
      data: data,
      directory: dirMap[directory],
      recursive: true,
    });

    return true;
  } catch (error) {
    console.error('[Capacitor] Failed to save file:', error);
    return false;
  }
};

/**
 * Read file from device storage
 */
export const readFile = async (
  filename: string,
  directory: 'DOCUMENTS' | 'CACHE' = 'DOCUMENTS'
): Promise<string | null> => {
  try {
    const dirMap = {
      DOCUMENTS: Directory.Documents,
      CACHE: Directory.Cache,
    };

    const result = await Filesystem.readFile({
      path: filename,
      directory: dirMap[directory],
    });

    return typeof result.data === 'string' ? result.data : null;
  } catch (error) {
    console.error('[Capacitor] Failed to read file:', error);
    return null;
  }
};

/**
 * Delete file from device storage
 */
export const deleteFile = async (
  filename: string,
  directory: 'DOCUMENTS' | 'CACHE' = 'DOCUMENTS'
): Promise<boolean> => {
  try {
    const dirMap = {
      DOCUMENTS: Directory.Documents,
      CACHE: Directory.Cache,
    };

    await Filesystem.deleteFile({
      path: filename,
      directory: dirMap[directory],
    });

    return true;
  } catch (error) {
    console.error('[Capacitor] Failed to delete file:', error);
    return false;
  }
};

/**
 * Send local notification
 */
export const sendNotification = async (
  title: string,
  body: string,
  id: number = 1
): Promise<boolean> => {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: title,
          body: body,
          id: id,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: 'default',
          actionTypeId: 'DEFAULT',
          autoCancel: true,
        },
      ],
    });

    return true;
  } catch (error) {
    console.error('[Capacitor] Failed to send notification:', error);
    return false;
  }
};

/**
 * Check network connectivity
 */
export const checkNetworkStatus = async (): Promise<{
  connected: boolean;
  connectionType: string;
}> => {
  try {
    const status = await Network.getStatus();

    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (error) {
    console.error('[Capacitor] Failed to check network status:', error);
    return {
      connected: false,
      connectionType: 'unknown',
    };
  }
};

/**
 * Listen for network status changes
 */
export const onNetworkStatusChange = (
  callback: (connected: boolean) => void
): (() => void) => {
  let unsubscribe: any = null;

  Network.addListener('networkStatusChange', (status) => {
    callback(status.connected);
  }).then((handle) => {
    unsubscribe = handle;
  });

  return () => {
    if (unsubscribe) {
      unsubscribe.remove();
    }
  };
};

/**
 * Request camera permission
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const permission = await Camera.requestPermissions();
    return permission.camera === 'granted' || permission.camera === 'prompt';
  } catch (error) {
    console.error('[Capacitor] Failed to request camera permission:', error);
    return false;
  }
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted' || permission.display === 'prompt';
  } catch (error) {
    console.error('[Capacitor] Failed to request notification permission:', error);
    return false;
  }
};

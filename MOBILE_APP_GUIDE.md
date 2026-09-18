# NurtGov Mobile App Guide - Capacitor Setup

This guide explains how to build and deploy NurtGov as a native iOS and Android app using Capacitor.

## Prerequisites

### For iOS Development
- macOS with Xcode installed
- Apple Developer Account ($99/year)
- iOS 14.0 or later

### For Android Development
- Android Studio installed
- Android SDK (API level 24 or higher)
- Google Play Developer Account ($25 one-time)

### General Requirements
- Node.js 16+ and pnpm
- Capacitor CLI (already installed)

## Project Structure

```
african-board-platform/
├── client/                    # React web app
│   ├── src/
│   │   ├── lib/capacitor.ts  # Capacitor utilities
│   │   └── hooks/useCapacitor.ts
│   └── dist/                 # Built web app (generated)
├── server/                    # Express backend
├── capacitor.config.ts       # Capacitor configuration
├── ios/                      # iOS native project (generated)
└── android/                  # Android native project (generated)
```

## Build Steps

### 1. Build the Web App

```bash
cd /home/ubuntu/african-board-platform
pnpm build
```

This creates the `dist/` folder that Capacitor will package.

### 2. Add iOS Platform

```bash
npx cap add ios
```

This creates the `ios/` directory with Xcode project.

### 3. Add Android Platform

```bash
npx cap add android
```

This creates the `android/` directory with Android Studio project.

### 4. Sync Changes

After making changes to the web app, sync them to native projects:

```bash
npx cap sync
```

Or for specific platform:

```bash
npx cap sync ios
npx cap sync android
```

## iOS Deployment

### 1. Open in Xcode

```bash
npx cap open ios
```

### 2. Configure App Signing

1. In Xcode, select the NurtGov target
2. Go to Signing & Capabilities
3. Select your Apple Developer Team
4. Update the Bundle Identifier to match your app ID
5. Enable necessary capabilities:
   - Camera (for document scanning)
   - Local Notifications
   - Network

### 3. Build and Test

```bash
# Build for simulator
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -destination 'generic/platform=iOS Simulator'

# Or use Xcode UI: Product → Run
```

### 4. Submit to App Store

1. Create App Store Connect entry at https://appstoreconnect.apple.com
2. Build archive: Product → Archive
3. Validate and upload through Xcode
4. Submit for review

## Android Deployment

### 1. Open in Android Studio

```bash
npx cap open android
```

### 2. Configure App Signing

1. In Android Studio, go to Build → Generate Signed Bundle/APK
2. Create or select signing key
3. Choose APK or App Bundle format
4. Select Release build variant
5. Finish signing process

### 3. Build and Test

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Test on emulator
adb install -r app/build/outputs/apk/release/app-release.apk
```

### 4. Submit to Google Play

1. Create Google Play Console entry at https://play.google.com/console
2. Upload signed APK or App Bundle
3. Fill in app details, screenshots, description
4. Submit for review

## Using Capacitor Features

### Camera Access

```typescript
import { capturePhoto } from '@/lib/capacitor';

const photo = await capturePhoto('camera');
if (photo) {
  // Use base64 photo data
}
```

### File Storage

```typescript
import { saveFile, readFile, deleteFile } from '@/lib/capacitor';

// Save meeting notes offline
await saveFile('meeting-notes.txt', noteContent, 'DOCUMENTS');

// Read later
const content = await readFile('meeting-notes.txt', 'DOCUMENTS');

// Clean up
await deleteFile('meeting-notes.txt', 'DOCUMENTS');
```

### Local Notifications

```typescript
import { sendNotification } from '@/lib/capacitor';

// Notify user of task assignment
await sendNotification(
  'New Task Assigned',
  'Review Q1 financial report',
  1
);
```

### Network Detection

```typescript
import { useCapacitor } from '@/hooks/useCapacitor';

const { isOnline, connectionType } = useCapacitor();

if (!isOnline) {
  // Show offline mode UI
}
```

### Platform Detection

```typescript
import { useCapacitor } from '@/hooks/useCapacitor';

const { isNative, isIOS, isAndroid } = useCapacitor();

if (isNative && isIOS) {
  // iOS-specific code
}
```

## Permissions Configuration

Capacitor automatically handles permissions through the `capacitor.config.ts` file. Required permissions are:

- **Camera**: For document scanning and photo capture
- **Photos**: For accessing photo library
- **Notifications**: For task and meeting reminders
- **Storage**: For offline document access
- **Network**: For connectivity detection

## Development Workflow

1. **Make changes** to React components in `client/src/`
2. **Test in browser** with `pnpm dev`
3. **Build web app** with `pnpm build`
4. **Sync to native** with `npx cap sync`
5. **Test on device** with Xcode or Android Studio
6. **Deploy** to App Store or Google Play

## Debugging

### iOS Debugging

```bash
# View console logs
npx cap open ios
# Then use Xcode's Debug Navigator
```

### Android Debugging

```bash
# View logcat
adb logcat | grep "NurtGov"

# Or use Android Studio's Logcat
```

### Web View Debugging

Both iOS and Android use WebView to render the React app. Use browser DevTools:

```bash
# iOS: Safari → Develop → Simulator → NurtGov
# Android: Chrome → chrome://inspect
```

## Troubleshooting

### Build Fails

1. Clear caches: `pnpm clean && pnpm install`
2. Rebuild web app: `pnpm build`
3. Sync again: `npx cap sync`
4. Clean native projects:
   - iOS: `xcodebuild clean -workspace ios/App/App.xcworkspace -scheme App`
   - Android: `./gradlew clean`

### Permissions Not Working

1. Check `capacitor.config.ts` has correct plugin configuration
2. Verify native permissions are requested at runtime
3. Check app has permissions in Settings

### Network Issues

1. Ensure `allowMixedContent: true` in Android config (for HTTP in development)
2. Check CORS headers on backend
3. Verify API endpoints are accessible from mobile network

## Performance Optimization

1. **Lazy load** components with React.lazy()
2. **Optimize images** before including in app
3. **Use service workers** for offline support
4. **Minimize bundle size** with code splitting
5. **Cache API responses** for offline access

## Next Steps

1. **Set up CI/CD** for automated builds and deployments
2. **Implement analytics** to track app usage
3. **Add push notifications** for real-time updates
4. **Optimize offline mode** for better UX
5. **Monitor app performance** with crash reporting

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS App Development](https://developer.apple.com/ios/)
- [Android App Development](https://developer.android.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console)

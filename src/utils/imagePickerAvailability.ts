import { NativeModules, TurboModuleRegistry } from 'react-native';

export function isImagePickerAvailable(): boolean {
  try {
    const turboModule = TurboModuleRegistry.get('ImagePicker');
    const legacyModule = NativeModules.ImagePicker;
    return Boolean(turboModule ?? legacyModule);
  } catch {
    return false;
  }
}

export function getImagePickerSetupError(): string {
  return 'Photo picker is not installed in this app build. Rebuild once:\n\ncd ios && pod install && cd ..\nnpm run ios\n\nOr paste an image URL below instead.';
}

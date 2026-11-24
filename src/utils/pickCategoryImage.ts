import { launchImageLibrary } from 'react-native-image-picker';

import { PickedImage } from '../services/storageService';
import {
  getImagePickerSetupError,
  isImagePickerAvailable,
} from './imagePickerAvailability';

function normalizeMimeType(type: string | undefined, fileName: string): string {
  if (type && type !== 'application/octet-stream') {
    return type === 'image/jpg' ? 'image/jpeg' : type;
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic' || extension === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export async function pickCategoryImage(): Promise<PickedImage | null> {
  if (!isImagePickerAvailable()) {
    throw new Error(getImagePickerSetupError());
  }

  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    quality: 0.85,
    includeBase64: true,
  });

  if (result.didCancel) {
    return null;
  }

  if (result.errorMessage) {
    throw new Error(result.errorMessage);
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    return null;
  }

  const fileName = asset.fileName ?? `category-${Date.now()}.jpg`;

  return {
    uri: asset.uri,
    fileName,
    mimeType: normalizeMimeType(asset.type, fileName),
    base64: asset.base64 ?? undefined,
  };
}

export function normalizeImageUrlInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  throw new Error('Image URL must start with http:// or https://');
}

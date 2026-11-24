import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../utils/errorMessage';

const BUCKET = 'category-images';

export type PickedImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  base64?: string;
};

function decodeBase64(base64: string): ArrayBuffer {
  const normalized = base64.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
  const binary = global.atob(normalized);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function readImageBytes(image: PickedImage): Promise<ArrayBuffer> {
  if (image.base64) {
    return decodeBase64(image.base64);
  }

  const response = await fetch(image.uri);

  if (!response.ok) {
    throw new Error('Could not read the selected image from your device.');
  }

  return response.arrayBuffer();
}

export async function uploadCategoryImage(image: PickedImage): Promise<string> {
  return uploadToBucket(image, 'categories');
}

export async function uploadProfileImage(image: PickedImage): Promise<string> {
  return uploadToBucket(image, 'profiles');
}

export async function uploadProductImage(
  image: PickedImage,
  sku: string,
  slot: 'main' | 'front' | 'side' | 'back',
): Promise<string> {
  const safeSku = sku.replace(/[^a-zA-Z0-9-_]/g, '_');
  return uploadToBucket(image, `products/${safeSku}`, `${slot}-${Date.now()}`);
}

async function uploadToBucket(
  image: PickedImage,
  folder: string,
  filePrefix?: string,
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const extension = image.fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const name =
    filePrefix ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${folder}/${name}.${extension}`;

  let fileBytes: ArrayBuffer;
  try {
    fileBytes = await readImageBytes(image);
  } catch (error) {
    throw new Error(
      getErrorMessage(error, 'Could not read the selected image. Try choosing another photo.'),
    );
  }

  if (!fileBytes.byteLength) {
    throw new Error('Selected image is empty. Please choose another photo.');
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, fileBytes, {
    contentType: image.mimeType,
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    const message = error.message ?? 'Image upload failed.';

    if (message.includes('Bucket not found') || message.toLowerCase().includes('bucket')) {
      throw new Error(
        'Storage bucket "category-images" is missing. In Supabase SQL Editor, run the file supabase/fix_storage_bucket.sql then try again.',
      );
    }

    if (message.includes('row-level security') || message.includes('policy')) {
      throw new Error(
        'Storage upload blocked. Run supabase/RUN_THIS.sql to add storage policies in Supabase.',
      );
    }

    throw new Error(getErrorMessage(error, 'Image upload failed.'));
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

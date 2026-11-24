import { useState } from 'react';
import { PickedImage } from '../services/storageService';
import { normalizeImageUrlInput, pickCategoryImage } from '../utils/pickCategoryImage';

export function useCategoryImagePicker() {
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [pickError, setPickError] = useState('');

  const pickImage = async () => {
    setPickError('');
    try {
      const picked = await pickCategoryImage();
      if (!picked) {
        return;
      }
      setPickedImage(picked);
      setPreviewUri(picked.uri);
      setImageUrlInput('');
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not open photo library.');
    }
  };

  const clearImage = () => {
    setPickedImage(null);
    setPreviewUri(null);
    setPickError('');
  };

  const getResolvedImageUrl = async (
    upload: (image: PickedImage) => Promise<string>,
  ): Promise<string | null> => {
    if (pickedImage) {
      return upload(pickedImage);
    }

    return normalizeImageUrlInput(imageUrlInput);
  };

  const handleImageUrlInput = (value: string) => {
    setImageUrlInput(value);
    if (value.trim()) {
      setPreviewUri(value.trim());
      return;
    }
    if (pickedImage) {
      setPreviewUri(pickedImage.uri);
      return;
    }
    setPreviewUri(null);
  };

  return {
    pickedImage,
    previewUri,
    imageUrlInput,
    setImageUrlInput: handleImageUrlInput,
    pickError,
    pickImage,
    clearImage,
    getResolvedImageUrl,
  };
};

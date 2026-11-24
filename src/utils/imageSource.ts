import { ImageSourcePropType } from 'react-native';

export const getImageSource = (image: string | number | null | undefined): ImageSourcePropType => {
  if (image == null) {
    return { uri: '' };
  }
  return typeof image === 'string' ? { uri: image } : image;
};

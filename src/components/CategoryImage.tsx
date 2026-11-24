import { Image, ImageStyle, StyleProp, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import { getCategoryProductThumbLayout } from '../utils/bundledImageLayout';
import { getImageSource } from '../utils/imageSource';

type CategoryImageProps = {
  image: string | number | null | undefined;
  style?: StyleProp<ImageStyle>;
  iconSize?: number;
  iconName?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  /** When set with a numeric bundled image, sizes the image from its aspect ratio inside this square. */
  fitToCell?: number;
};

export function CategoryImage({
  image,
  style,
  iconSize = 28,
  iconName = 'cube-outline',
  iconColor = '#64748B',
  iconBackgroundColor = '#F1F5F9',
  resizeMode = 'cover',
  fitToCell,
}: CategoryImageProps) {
  if (image == null) {
    return (
      <View
        style={[
          style,
          {
            alignItems: 'center',
            backgroundColor: iconBackgroundColor,
            justifyContent: 'center',
          },
        ]}>
        <Icon color={iconColor} name={iconName} size={iconSize} />
      </View>
    );
  }

  const source = getImageSource(image);

  if (fitToCell != null && typeof image === 'number') {
    const layout = getCategoryProductThumbLayout(source, fitToCell);
    return (
      <View
        style={[
          style,
          {
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            height: fitToCell,
            justifyContent: 'center',
            overflow: 'hidden',
            width: fitToCell,
          },
        ]}>
        <Image
          fadeDuration={0}
          source={source}
          resizeMode="contain"
          style={{ width: layout.width, height: layout.width }}
        />
      </View>
    );
  }

  return <Image fadeDuration={0} source={source} style={style} resizeMode={resizeMode} />;
}

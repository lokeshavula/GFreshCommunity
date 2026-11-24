import { Dimensions, Image, ImageSourcePropType, PixelRatio } from 'react-native';

type ImageLayout = {
  width: number;
  height: number;
};

type ResolvedSize = {
  width: number;
  height: number;
};

function resolveSize(source: ImageSourcePropType): ResolvedSize | null {
  const resolved = Image.resolveAssetSource(source);
  if (!resolved?.width || !resolved?.height) {
    return null;
  }
  return { width: resolved.width, height: resolved.height };
}

export function getFittedImageLayout(
  source: ImageSourcePropType,
  maxWidth: number,
  maxHeight: number,
): ImageLayout {
  const resolved = resolveSize(source);

  if (!resolved) {
    return { width: maxWidth, height: maxHeight };
  }

  const aspectRatio = resolved.width / resolved.height;
  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function getBundledImageLayout(
  source: ImageSourcePropType,
  maxWidth: number,
  maxHeight: number,
): ImageLayout {
  const resolved = resolveSize(source);

  if (!resolved) {
    return { width: maxWidth, height: maxHeight };
  }

  const aspectRatio = resolved.width / resolved.height;
  const pixelRatio = PixelRatio.get();
  const maxSharpWidth = resolved.width / pixelRatio;
  const maxSharpHeight = resolved.height / pixelRatio;

  let width = Math.min(maxWidth, maxSharpWidth);
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = Math.min(maxHeight, maxSharpHeight);
    width = height * aspectRatio;
  }

  if (height > maxSharpHeight) {
    height = maxSharpHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function getDefaultImageZoom(
  source: ImageSourcePropType,
  stageWidth: number,
  stageHeight: number,
): number {
  const resolved = resolveSize(source);
  if (!resolved || stageWidth <= 0 || stageHeight <= 0) {
    return 1;
  }

  const pixelRatio = PixelRatio.get();
  const naturalW = resolved.width / pixelRatio;
  const naturalH = resolved.height / pixelRatio;
  const coverScale = Math.max(stageWidth / naturalW, stageHeight / naturalH);
  const zoom = Math.min(Math.max(coverScale * 0.92, 1), 2.2);
  return Number(zoom.toFixed(2));
}

export function getDetailHeroLayout(source: ImageSourcePropType): ImageLayout {
  const screenWidth = Dimensions.get('window').width;
  // Keep product heroes compact and consistent (zoom out large studio shots)
  const maxSide = Math.min(Math.round(screenWidth * 0.52), 200);
  return getFittedImageLayout(source, maxSide, maxSide);
}

export function getCategoryProductThumbLayout(
  _source: ImageSourcePropType,
  cellSize: number,
): ImageLayout {
  // Fixed square for every product so tomato and others share the same visual size
  const maxSide = Math.round(cellSize * 0.58);
  return { width: maxSide, height: maxSide };
}

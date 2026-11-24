import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { ZoomableImage } from './ZoomableImage';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  uri: string | null;
  name?: string;
  onClose: () => void;
  onChangePhoto?: () => void;
};

export function ProfilePhotoViewer({ visible, uri, name, onClose, onChangePhoto }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  if (!uri) {
    return null;
  }

  const stageSize = Math.min(width - 32, height * 0.62);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable accessibilityLabel="Close" style={styles.iconButton} onPress={onClose}>
            <Icon color={colors.white} name="close" size={22} />
          </Pressable>
          <View className="mx-3 flex-1">
            <Text className="text-base font-bold text-white" numberOfLines={1}>
              {name ? `${name}'s photo` : 'Profile photo'}
            </Text>
            <Text className="text-xs text-white/60">Pinch to zoom</Text>
          </View>
          {onChangePhoto ? (
            <Pressable style={styles.changeButton} onPress={onChangePhoto}>
              <Icon color={colors.primaryDark} name="camera" size={14} />
              <Text className="ml-1.5 text-xs font-bold text-primary-dark">Change</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.stage}>
          <ZoomableImage
            height={stageSize}
            source={{ uri }}
            style={styles.image}
            width={stageSize}
          />
        </View>

        <Pressable
          style={[styles.dismissHint, { paddingBottom: insets.bottom + 20 }]}
          onPress={onClose}>
          <Text className="text-sm font-semibold text-white/70">Tap to close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  changeButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stage: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    borderRadius: 24,
  },
  dismissHint: {
    alignItems: 'center',
    paddingTop: 8,
  },
});

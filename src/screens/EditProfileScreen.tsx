import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { ProfilePhotoViewer } from '../components/ProfilePhotoViewer';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PickedImage, uploadProfileImage } from '../services/storageService';
import { getCurrentUser, updateProfile } from '../services/userService';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useCenteredContentStyle } from '../utils/layout';
import { pickCategoryImage } from '../utils/pickCategoryImage';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    width: 'form',
    paddingBottom: insets.bottom + 28,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [blockNumber, setBlockNumber] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const user = await getCurrentUser();
        if (!user) {
          navigation.replace('Login');
          return;
        }
        setUserId(user.id);
        setFullName(user.fullName);
        setMobileNumber(user.mobileNumber);
        setBlockNumber(user.blockNumber);
        setFlatNo(user.flatNo);
        setAvatarUrl(user.avatarUrl ?? null);
        setPreviewUri(user.avatarUrl ?? null);
        setPickedImage(null);
        setRemoveAvatar(false);
        setLoading(false);
      })();
    }, [navigation]),
  );

  const handlePickPhoto = async () => {
    try {
      const picked = await pickCategoryImage();
      if (!picked) {
        return;
      }
      setPickedImage(picked);
      setPreviewUri(picked.uri);
      setRemoveAvatar(false);
    } catch (error) {
      Alert.alert('Photo library', getErrorMessage(error, 'Could not open photo library.'));
    }
  };

  const handleRemovePhoto = () => {
    setPickedImage(null);
    setPreviewUri(null);
    setRemoveAvatar(true);
  };

  const handleSave = async () => {
    if (!userId) {
      return;
    }

    setSaving(true);
    try {
      let nextAvatarUrl: string | null | undefined = undefined;

      if (pickedImage) {
        nextAvatarUrl = await uploadProfileImage(pickedImage);
      } else if (removeAvatar) {
        nextAvatarUrl = null;
      }

      await updateProfile(userId, {
        fullName,
        mobileNumber,
        blockNumber,
        flatNo,
        ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
      });
      Alert.alert('Profile updated', 'Your account details have been saved.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Update failed', getErrorMessage(error, 'Could not save profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPress = () => {
    if (previewUri) {
      setViewerOpen(true);
      return;
    }
    handlePickPhoto();
  };

  const initial = fullName.trim().charAt(0).toUpperCase() || 'G';

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Update your photo and personal details"
        title="Edit profile"
        onBack={() => navigation.goBack()}
      />

      <ProfilePhotoViewer
        name={fullName}
        uri={previewUri}
        visible={viewerOpen}
        onChangePhoto={() => {
          setViewerOpen(false);
          handlePickPhoto();
        }}
        onClose={() => setViewerOpen(false)}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={[{ paddingTop: 20 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.photoCard}>
            <Pressable style={styles.avatarWrap} onPress={handleAvatarPress}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text className="text-3xl font-bold text-green-700">{initial}</Text>
                </View>
              )}
              <Pressable
                accessibilityLabel="Change profile photo"
                style={styles.cameraBadge}
                onPress={handlePickPhoto}>
                <Icon color={colors.white} name="camera" size={14} />
              </Pressable>
            </Pressable>

            <Text className="mt-4 text-base font-bold text-slate-900">Profile photo</Text>
            <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
              {previewUri
                ? 'Tap the photo to view it full screen, or use Change to update it.'
                : 'Upload a picture from your gallery.'}
            </Text>

            <View className="mt-4 flex-row items-center justify-center gap-3">
              {previewUri ? (
                <Pressable style={styles.viewAction} onPress={() => setViewerOpen(true)}>
                  <Icon color={colors.primaryDark} name="expand-outline" size={16} />
                  <Text className="ml-1.5 text-sm font-bold text-primary-dark">View</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.photoAction} onPress={handlePickPhoto}>
                <Icon color={colors.primary} name="image-outline" size={16} />
                <Text className="ml-1.5 text-sm font-bold text-primary">
                  {previewUri || avatarUrl ? 'Change' : 'Upload'}
                </Text>
              </Pressable>
              {previewUri || avatarUrl ? (
                <Pressable style={styles.removeAction} onPress={handleRemovePhoto}>
                  <Icon color={colors.danger} name="trash-outline" size={16} />
                  <Text className="ml-1.5 text-sm font-bold text-red-500">Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.formCard}>
            <EditableField
              label="Full name"
              placeholder="Your name"
              value={fullName}
              onChangeText={setFullName}
            />
            <EditableField
              keyboardType="phone-pad"
              label="Mobile number"
              placeholder="10-digit mobile"
              value={mobileNumber}
              onChangeText={setMobileNumber}
            />
            <EditableField
              label="Block number"
              placeholder="e.g. A / Tower 2"
              value={blockNumber}
              onChangeText={setBlockNumber}
            />
            <EditableField
              label="Flat number"
              placeholder="e.g. 101"
              value={flatNo}
              onChangeText={setFlatNo}
              last
            />
          </View>

          <Pressable
            disabled={saving}
            style={[styles.saveButton, saving && styles.saveDisabled]}
            onPress={handleSave}>
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text className="text-sm font-bold text-white">Save changes</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function EditableField({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType,
  last,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'phone-pad';
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldBlock, last && { marginBottom: 0 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.surface, flex: 1 },
  photoCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    padding: 20,
  },
  avatarWrap: {
    height: 104,
    position: 'relative',
    width: 104,
  },
  avatarImage: {
    borderRadius: 52,
    height: 104,
    width: 104,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  cameraBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    bottom: 2,
    height: 30,
    justifyContent: 'center',
    position: 'absolute',
    right: 2,
    width: 30,
  },
  photoAction: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viewAction: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  removeAction: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  formCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  fieldBlock: { marginBottom: 14 },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 15,
  },
  saveDisabled: { opacity: 0.7 },
});

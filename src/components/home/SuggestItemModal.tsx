import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, note?: string) => Promise<void>;
};

export function SuggestItemModal({ visible, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(title.trim(), note.trim() || undefined);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setTitle('');
        setNote('');
        onClose();
      }, 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setNote('');
      setIsSubmitted(false);
      onClose();
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={handleClose} />

        <View style={styles.sheet}>
          <View style={styles.dragPill} />

          {isSubmitted ? (
            <View style={styles.successBox}>
              <View style={styles.successIconWrap}>
                <Icon color="#059669" name="checkmark-done" size={32} />
              </View>
              <Text style={styles.successTitle}>Request Sent to G-Fresh Team!</Text>
              <Text style={styles.successSub}>
                We'll review your request with our farm partners for tomorrow's dispatch.
              </Text>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2.5">
                  <View style={styles.headerIconWrap}>
                    <Text style={{ fontSize: 20 }}>💡</Text>
                  </View>
                  <View>
                    <Text style={styles.title}>Suggest an Item</Text>
                    <Text style={styles.subtitle}>
                      Tell us what special produce to bring
                    </Text>
                  </View>
                </View>

                <Pressable hitSlop={10} style={styles.closeBtn} onPress={handleClose}>
                  <Icon color="#64748B" name="close" size={20} />
                </Pressable>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Item Name <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  placeholder="e.g. Tender Coconuts, Strawberries, Paneer..."
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Quantity / Special Note (Optional)</Text>
                <TextInput
                  multiline
                  numberOfLines={3}
                  placeholder="e.g. Need 2 pcs, prefer organic or early morning slot"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.textArea]}
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  disabled={isSubmitting}
                  style={styles.cancelBtn}
                  onPress={handleClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  disabled={!title.trim() || isSubmitting}
                  style={[
                    styles.submitBtn,
                    (!title.trim() || isSubmitting) && { opacity: 0.6 },
                  ]}
                  onPress={handleSubmit}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon color="#FFFFFF" name="paper-plane" size={16} />
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    elevation: 20,
    maxWidth: 480,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    width: '100%',
    zIndex: 10,
  },
  dragPill: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    height: 4,
    marginBottom: 16,
    width: 36,
  },
  headerIconWrap: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1.5,
    color: '#0F172A',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    height: 76,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    elevation: 4,
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconWrap: {
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 36,
    height: 64,
    justifyContent: 'center',
    marginBottom: 14,
    width: 64,
  },
  successTitle: {
    color: '#065F46',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSub: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
});

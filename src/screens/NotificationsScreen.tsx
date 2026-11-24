import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountPageHeader } from '../components/AccountPageHeader';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  AppNotification,
  fetchNotificationsForUser,
  formatNotificationTime,
  getReadNotificationIds,
  groupNotificationsByDay,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationKind,
} from '../services/notificationService';
import { getCurrentUser } from '../services/userService';
import { colors } from '../theme/colors';
import { useCenteredContentStyle } from '../utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
type FilterKey = 'all' | NotificationKind;

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'order', label: 'Orders' },
  { id: 'offer', label: 'Offers' },
  { id: 'system', label: 'Updates' },
];

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const contentStyle = useCenteredContentStyle({
    paddingBottom: insets.bottom + 24,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotions, setPromotions] = useState(true);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      const [items, read] = await Promise.all([
        fetchNotificationsForUser(user?.id ?? null),
        getReadNotificationIds(),
      ]);
      setNotifications(items);
      setReadIds(read);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const visibleNotifications = notifications.filter(item => {
    if (filter !== 'all' && item.kind !== filter) return false;
    if (filter === 'offer' && !promotions) return false;
    if (filter === 'order' && !orderUpdates) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q) ||
      (item.orderId ?? '').toLowerCase().includes(q)
    );
  });

  const unreadCount = visibleNotifications.filter(item => !readIds.has(item.id)).length;
  const groups = groupNotificationsByDay(visibleNotifications);

  const handleOpen = async (item: AppNotification) => {
    await markNotificationRead(item.id);
    setReadIds(current => new Set([...current, item.id]));

    if (item.trackOrder) {
      navigation.navigate('TrackOrder', item.trackOrder);
    }
  };

  const handleMarkAllRead = async () => {
    const ids = notifications.map(item => item.id);
    await markAllNotificationsRead(ids);
    setReadIds(new Set(ids));
  };

  return (
    <View className="flex-1" style={styles.screen}>
      <AccountPageHeader
        subtitle="Order updates, offers & alerts"
        title="Notifications"
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Icon color={colors.primary} name="notifications" size={22} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-base font-bold text-slate-900">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </Text>
              <Text className="mt-0.5 text-sm text-slate-500">
                {visibleNotifications.length} notification
                {visibleNotifications.length === 1 ? '' : 's'} in your inbox
              </Text>
            </View>
            {unreadCount > 0 ? (
              <Pressable style={styles.markReadButton} onPress={handleMarkAllRead}>
                <Text className="text-xs font-bold text-primary">Mark all read</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.prefsCard}>
            <PrefRow
              label="Order updates"
              subtitle="Delivery and status alerts"
              value={orderUpdates}
              onValueChange={setOrderUpdates}
            />
            <View style={styles.divider} />
            <PrefRow
              label="Offers & promotions"
              subtitle="Deals from LG Enterprises"
              value={promotions}
              onValueChange={setPromotions}
            />
          </View>

          <View style={styles.searchBar}>
            <Icon color={colors.textMuted} name="search-outline" size={18} />
            <TextInput
              placeholder="Search notifications..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
            />
            {query ? (
              <Pressable hitSlop={8} onPress={() => setQuery('')}>
                <Icon color={colors.textMuted} name="close-circle" size={18} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            contentContainerStyle={styles.chipRow}
            showsHorizontalScrollIndicator={false}>
            {FILTERS.map(item => {
              const active = filter === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFilter(item.id)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Icon color={colors.textMuted} name="notifications-off-outline" size={42} />
              <Text className="mt-3 text-base font-bold text-slate-700">No notifications</Text>
              <Text className="mt-1 text-center text-sm text-slate-500">
                You&apos;re all caught up for now.
              </Text>
            </View>
          ) : (
            groups.map(group => (
              <View key={group.title} className="px-5">
                <Text className="mb-3 mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {group.title}
                </Text>
                <View style={styles.listCard}>
                  {group.items.map((item, index) => (
                    <View key={item.id}>
                      {index > 0 ? <View style={styles.rowDivider} /> : null}
                      <NotificationRow
                        item={item}
                        unread={!readIds.has(item.id)}
                        onPress={() => handleOpen(item)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function NotificationRow({
  item,
  unread,
  onPress,
}: {
  item: AppNotification;
  unread: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {unread ? <View style={styles.unreadDot} /> : null}
      <View style={[styles.iconWrap, { backgroundColor: item.soft }]}>
        <Icon color={item.accent} name={item.icon} size={18} />
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-sm font-bold text-slate-900" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="ml-2 text-[11px] font-semibold text-slate-400">
            {formatNotificationTime(item.createdAt)}
          </Text>
        </View>
        <Text className="mt-1 text-sm leading-5 text-slate-500" numberOfLines={2}>
          {item.message}
        </Text>
        {item.trackOrder ? (
          <View className="mt-2 flex-row items-center">
            <Text className="text-xs font-bold text-primary">Track order</Text>
            <Icon color={colors.primary} name="chevron-forward" size={12} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function PrefRow({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3.5">
      <View className="flex-1 pr-4">
        <Text className="text-sm font-semibold text-slate-900">{label}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">{subtitle}</Text>
      </View>
      <Switch
        thumbColor={value ? colors.primary : '#F9FAFB'}
        trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8FAFC',
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 16,
    padding: 16,
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  markReadButton: {
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  prefsCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  divider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginHorizontal: 16,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 0,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 12,
  },
  chip: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.white,
  },
  listCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
    position: 'relative',
  },
  rowDivider: {
    backgroundColor: '#F1F5F9',
    height: 1,
    marginLeft: 66,
  },
  unreadDot: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 8,
    left: 8,
    position: 'absolute',
    top: 18,
    width: 8,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  empty: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 40,
  },
});

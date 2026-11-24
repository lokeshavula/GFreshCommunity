import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { AppStatusBar } from '../components/AppStatusBar';
import {
  fetchAdminPriceProducts,
  updateProductPrice,
} from '../services/productService';
import { PriceCategorySlug, Product } from '../types/product';
import { colors } from '../theme/colors';
import { getErrorMessage } from '../utils/errorMessage';
import { useResponsiveLayout } from '../utils/layout';
import {
  formatPriceDateLabel,
  formatPriceDateLong,
  parsePriceDateKey,
  shiftPriceDateKey,
  toPriceDateKey,
} from '../utils/priceDate';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AdminDailyPrices'>;

const TABS: { id: PriceCategorySlug; label: string }[] = [
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruits', label: 'Fruits' },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildMonthGrid(viewMonth: Date): Array<Date | null> {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startPad = first.getDay();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function AdminDailyPricesScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { shellStyle } = useResponsiveLayout();
  const [category, setCategory] = useState<PriceCategorySlug>('vegetables');
  const [priceDate, setPriceDate] = useState(toPriceDateKey());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parsePriceDateKey(toPriceDateKey()));
  const [products, setProducts] = useState<Product[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingSku, setSavingSku] = useState<string | null>(null);

  const load = useCallback(async (nextCategory: PriceCategorySlug, nextDate: string) => {
    setIsLoading(true);
    try {
      const rows = await fetchAdminPriceProducts(nextCategory, nextDate);
      setProducts(rows);
      const drafts: Record<string, string> = {};
      rows.forEach(row => {
        drafts[row.id] = String(row.price);
      });
      setDraftPrices(drafts);
    } catch (error) {
      Alert.alert(
        'Prices',
        getErrorMessage(
          error,
          'Could not load prices. Run supabase/gfm_product_daily_prices.sql in Supabase.',
        ),
      );
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(category, priceDate);
    }, [category, priceDate, load]),
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      product =>
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query),
    );
  }, [products, searchQuery]);

  const monthCells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const isToday = priceDate === toPriceDateKey();

  const handleSave = async (product: Product) => {
    const raw = draftPrices[product.id] ?? '';
    const next = Number(raw);
    if (!Number.isFinite(next) || next <= 0) {
      Alert.alert('Invalid price', 'Enter a price greater than 0.');
      return;
    }

    setSavingSku(product.id);
    try {
      await updateProductPrice(product.id, next, priceDate);
      setProducts(current =>
        current.map(row => (row.id === product.id ? { ...row, price: next } : row)),
      );
      setDraftPrices(current => ({ ...current, [product.id]: String(next) }));
    } catch (error) {
      Alert.alert('Save failed', getErrorMessage(error, 'Could not update price.'));
    } finally {
      setSavingSku(null);
    }
  };

  const openCalendar = () => {
    setViewMonth(parsePriceDateKey(priceDate));
    setCalendarOpen(true);
  };

  return (
    <View className="flex-1 bg-slate-50">
      <AppStatusBar />
      <View
        className="border-b border-slate-200 bg-white pb-3"
        style={[{ paddingTop: insets.top + 12 }, shellStyle('wide')]}>
        <View className="flex-row items-center justify-between px-1">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-100"
            onPress={() => navigation.goBack()}>
            <Icon color={colors.textPrimary} name="chevron-back" size={22} />
          </Pressable>
          <View className="flex-1 px-3">
            <Text className="text-center text-lg font-bold text-slate-900">Daily prices</Text>
            <Text className="mt-0.5 text-center text-xs text-slate-500">
              Set prices by date · shown to customers for that day
            </Text>
          </View>
          <View className="h-11 w-11" />
        </View>

        <View style={styles.dateBar}>
          <Pressable
            style={styles.dateNavBtn}
            onPress={() => setPriceDate(current => shiftPriceDateKey(current, -1))}>
            <Icon color={colors.textPrimary} name="chevron-back" size={18} />
          </Pressable>
          <Pressable style={styles.dateCenter} onPress={openCalendar}>
            <Icon color={colors.primary} name="calendar-outline" size={16} />
            <View className="ml-2">
              <Text style={styles.dateLabel}>{formatPriceDateLabel(priceDate)}</Text>
              <Text style={styles.dateSub}>{formatPriceDateLong(priceDate)}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.dateNavBtn}
            onPress={() => setPriceDate(current => shiftPriceDateKey(current, 1))}>
            <Icon color={colors.textPrimary} name="chevron-forward" size={18} />
          </Pressable>
        </View>

        {!isToday ? (
          <Pressable
            style={styles.todayChip}
            onPress={() => setPriceDate(toPriceDateKey())}>
            <Text style={styles.todayChipText}>Jump to today</Text>
          </Pressable>
        ) : null}

        <View className="mt-3 flex-row gap-2 px-1">
          {TABS.map(tab => {
            const selected = tab.id === category;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setCategory(tab.id)}
                style={[styles.tab, selected && styles.tabSelected]}>
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-3 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Icon color="#94A3B8" name="search-outline" size={18} />
          <TextInput
            className="ml-2 flex-1 text-base text-slate-800"
            placeholder={`Search ${category}...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
          ListEmptyComponent={
            <Text className="mt-16 text-center text-slate-500">No products found</Text>
          }
          renderItem={({ item }) => {
            const dirty = Number(draftPrices[item.id]) !== item.price;
            const saving = savingSku === item.id;
            return (
              <View style={styles.row}>
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500">
                    /{item.unit} · {item.id}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="mr-1 text-sm font-semibold text-slate-500">₹</Text>
                  <TextInput
                    keyboardType="decimal-pad"
                    style={styles.priceInput}
                    value={draftPrices[item.id] ?? ''}
                    onChangeText={text =>
                      setDraftPrices(current => ({
                        ...current,
                        [item.id]: text.replace(/[^0-9.]/g, ''),
                      }))
                    }
                  />
                  <Pressable
                    disabled={saving || !dirty}
                    onPress={() => handleSave(item)}
                    style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}>
                    {saving ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.saveText}>Save</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal
        animationType="fade"
        transparent
        visible={calendarOpen}
        onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarOpen(false)}>
          <Pressable style={styles.calendarCard} onPress={event => event.stopPropagation()}>
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable
                onPress={() =>
                  setViewMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                }
                style={styles.dateNavBtn}>
                <Icon color={colors.textPrimary} name="chevron-back" size={18} />
              </Pressable>
              <Text className="text-base font-bold text-slate-900">
                {viewMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() =>
                  setViewMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))
                }
                style={styles.dateNavBtn}>
                <Icon color={colors.textPrimary} name="chevron-forward" size={18} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map(day => (
                <Text key={day} style={styles.weekLabel}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.monthGrid}>
              {monthCells.map((cell, index) => {
                if (!cell) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }
                const key = toPriceDateKey(cell);
                const selected = key === priceDate;
                const today = key === toPriceDateKey();
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.dayCell,
                      selected && styles.dayCellSelected,
                      today && !selected && styles.dayCellToday,
                    ]}
                    onPress={() => {
                      setPriceDate(key);
                      setCalendarOpen(false);
                    }}>
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        today && !selected && styles.dayTextToday,
                      ]}>
                      {cell.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dateBar: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  dateNavBtn: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dateCenter: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dateLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  dateSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1,
  },
  todayChip: {
    alignSelf: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  tab: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextSelected: {
    color: colors.white,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  priceInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'right',
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  calendarCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 360,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekLabel: {
    color: '#94A3B8',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: `${100 / 7}%` as `${number}%`,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  dayCellToday: {
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: '800',
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '800',
  },
});

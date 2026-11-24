import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  AdminBulkOrder,
  AdminBulkSummaryStats,
  updateAdminBulkOrderStatus,
} from '../../services/adminBulkOrderService';
import {
  fetchAllBulkCatalogProducts,
  setProductBulkAvailability,
  BulkCatalogProduct,
} from '../../services/adminBulkCatalogService';
import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';

type FilterType = 'all' | 'basket' | 'proposed' | 'pools';

interface Props {
  bottomPadding: number;
  bulkOrders: AdminBulkOrder[];
  stats: AdminBulkSummaryStats;
  isLoading: boolean;
  onRefresh: () => Promise<void> | void;
}

export function AdminBulkOrdersTab({
  bottomPadding,
  bulkOrders,
  stats,
  isLoading,
  onRefresh,
}: Props) {
  const { isTablet, contentMaxWidth, horizontalPadding } = useResponsiveLayout();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Manage Bulk Catalog Modal State
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [catalogItems, setCatalogItems] = useState<BulkCatalogProduct[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftQtys, setDraftQtys] = useState<Record<string, string>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Selected Bulk Order Detail Modal State (Popup on Eye Icon click)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<AdminBulkOrder | null>(null);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const items = await fetchAllBulkCatalogProducts();
      setCatalogItems(items);

      const dPrices: Record<string, string> = {};
      const dQtys: Record<string, string> = {};
      items.forEach(it => {
        dPrices[it.id] = String(it.wholesalePrice);
        dQtys[it.id] = String(it.minBulkQty);
      });
      setDraftPrices(dPrices);
      setDraftQtys(dQtys);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleOpenCatalogManager = () => {
    setManageModalVisible(true);
    loadCatalog();
  };

  const handleToggleBulk = async (item: BulkCatalogProduct, enabled: boolean) => {
    setCatalogItems(prev =>
      prev.map(p => (p.id === item.id ? { ...p, isBulkAvailable: enabled } : p)),
    );
    await setProductBulkAvailability(item.id, enabled, item.wholesalePrice, item.minBulkQty);
    setActionNotice(
      enabled
        ? `"${item.name}" is now declared Available for Resident Bulk Orders!`
        : `"${item.name}" removed from Resident Bulk Ordering.`,
    );
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleUpdatePrice = async (item: BulkCatalogProduct, newPriceStr: string) => {
    setDraftPrices(prev => ({ ...prev, [item.id]: newPriceStr }));
    const p = parseFloat(newPriceStr);
    if (!isNaN(p) && p > 0) {
      setCatalogItems(prev =>
        prev.map(x => (x.id === item.id ? { ...x, wholesalePrice: p } : x)),
      );
      await setProductBulkAvailability(item.id, item.isBulkAvailable, p, item.minBulkQty);
    }
  };

  const handleUpdateQty = async (item: BulkCatalogProduct, newQtyStr: string) => {
    setDraftQtys(prev => ({ ...prev, [item.id]: newQtyStr }));
    const q = parseInt(newQtyStr, 10);
    if (!isNaN(q) && q > 0) {
      setCatalogItems(prev =>
        prev.map(x => (x.id === item.id ? { ...x, minBulkQty: q } : x)),
      );
      await setProductBulkAvailability(item.id, item.isBulkAvailable, item.wholesalePrice, q);
    }
  };

  const filteredOrders = bulkOrders.filter(order => {
    // Filter type match
    if (activeFilter === 'basket' && order.status !== 'added_to_cart' && order.status !== 'confirmed') {
      return false;
    }
    if (activeFilter === 'proposed' && order.status !== 'proposed') {
      return false;
    }
    if (activeFilter === 'pools' && order.sourceType !== 'group_pool') {
      return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchProduct = order.productName.toLowerCase().includes(q);
      const matchSender =
        order.senderName.toLowerCase().includes(q) ||
        (order.senderFlat && order.senderFlat.toLowerCase().includes(q));
      const matchReceiver =
        (order.receiverName && order.receiverName.toLowerCase().includes(q)) ||
        (order.receiverFlat && order.receiverFlat.toLowerCase().includes(q));
      return matchProduct || matchSender || matchReceiver;
    }

    return true;
  });

  const handleStatusChange = async (
    order: AdminBulkOrder,
    newStatus: 'confirmed' | 'dispatched',
  ) => {
    if (order.sourceType === 'group_pool') {
      setActionNotice(`Group Pool for "${order.productName}" acknowledged!`);
      setTimeout(() => setActionNotice(null), 3500);
      return;
    }

    setUpdatingId(order.id);
    try {
      const success = await updateAdminBulkOrderStatus(order.id, newStatus);
      if (success) {
        order.status = newStatus;
        order.statusLabel = newStatus === 'confirmed' ? 'CONFIRMED BULK LOT ✅' : 'DISPATCHED 🚚';
        if (selectedOrderDetail && selectedOrderDetail.id === order.id) {
          setSelectedOrderDetail({ ...order, status: newStatus, statusLabel: order.statusLabel });
        }
        setActionNotice(
          newStatus === 'confirmed'
            ? `Bulk order for ${order.senderFlat} & ${order.receiverFlat} confirmed!`
            : `Order marked dispatched to society gate!`,
        );
        setTimeout(() => setActionNotice(null), 3500);
        onRefresh();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredCatalogItems = catalogItems.filter(p => {
    if (!catalogSearch.trim()) return true;
    const q = catalogSearch.toLowerCase().trim();
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      {/* Action Toast Notice */}
      {actionNotice ? (
        <View style={styles.actionNoticeBar}>
          <Icon color="#059669" name="checkmark-circle" size={18} />
          <Text style={styles.actionNoticeText}>{actionNotice}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={{
          paddingBottom: bottomPadding + 30,
          paddingHorizontal: horizontalPadding,
          alignSelf: 'center',
          width: '100%',
          maxWidth: isTablet ? contentMaxWidth : undefined,
        }}
        data={filteredOrders}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl colors={[colors.primary]} refreshing={isLoading} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {/* Header Title */}
            <View style={styles.headerHero}>
              <View style={styles.headerHeroLeft}>
                <View style={styles.liveTag}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveTagText}>LIVE CHAT & BULK ORDERS</Text>
                </View>
                <Text style={styles.heroTitle}>Bulk & Club Orders Hub</Text>
                <Text style={styles.heroSub}>
                  Live confirmed resident club orders & group buys from neighbour chats
                </Text>
              </View>
              <View style={styles.headerBtnGroup}>
                <Pressable
                  style={styles.manageCatalogBtn}
                  onPress={handleOpenCatalogManager}>
                  <Icon color="#FFFFFF" name="pricetags" size={14} />
                  <Text style={styles.manageCatalogBtnText}>Declare Bulk Items</Text>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  style={styles.refreshIconBtn}
                  onPress={() => onRefresh()}>
                  <Icon color={colors.primaryDark} name="sync-outline" size={18} />
                </Pressable>
              </View>
            </View>

            {/* Stats Metrics Cards Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF3' }]}>
                  <Icon color="#059669" name="cube" size={16} />
                </View>
                <Text style={styles.statNumber}>{stats.totalDeals}</Text>
                <Text style={styles.statLabel}>Total Bulk Deals</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Icon color="#2563EB" name="cart" size={16} />
                </View>
                <Text style={styles.statNumber}>{stats.confirmedCount}</Text>
                <Text style={styles.statLabel}>In Basket / Confirmed</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Icon color="#D97706" name="layers" size={16} />
                </View>
                <Text style={styles.statNumber}>{stats.totalUnitsClubbed}</Text>
                <Text style={styles.statLabel}>Units Clubbed</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: '#FDF2F8' }]}>
                  <Icon color="#DB2777" name="cash" size={16} />
                </View>
                <Text style={styles.statNumber}>₹{stats.totalWholesaleValue}</Text>
                <Text style={styles.statLabel}>Wholesale Value</Text>
              </View>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Icon color="#94A3B8" name="search" size={18} />
              <TextInput
                placeholder="Search flat no (e.g. A-101), resident name or product..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Icon color="#94A3B8" name="close-circle" size={18} />
                </Pressable>
              )}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              <Pressable
                style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
                onPress={() => setActiveFilter('all')}>
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'all' && styles.filterPillTextActive,
                  ]}>
                  All Deals ({stats.totalDeals})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterPill, activeFilter === 'basket' && styles.filterPillActive]}
                onPress={() => setActiveFilter('basket')}>
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'basket' && styles.filterPillTextActive,
                  ]}>
                  In Basket / Confirmed ({stats.confirmedCount})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterPill, activeFilter === 'proposed' && styles.filterPillActive]}
                onPress={() => setActiveFilter('proposed')}>
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'proposed' && styles.filterPillTextActive,
                  ]}>
                  Proposals ({stats.proposedCount})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterPill, activeFilter === 'pools' && styles.filterPillActive]}
                onPress={() => setActiveFilter('pools')}>
                <Text
                  style={[
                    styles.filterPillText,
                    activeFilter === 'pools' && styles.filterPillTextActive,
                  ]}>
                  Group Pools
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Icon color="#94A3B8" name="cube-outline" size={36} />
            </View>
            <Text style={styles.emptyTitle}>No Bulk Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              When residents create split orders in chat or join group buying pools, their bulk
              confirmations will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isConfirmed = item.status === 'confirmed';
          const isDispatched = item.status === 'dispatched';
          const isUpdating = updatingId === item.id;

          return (
            /* ULTRA CLEAN FEED CARD */
            <Pressable
              style={styles.cleanBulkCard}
              onPress={() => setSelectedOrderDetail(item)}>
              {/* Card Top Header */}
              <View style={styles.cleanCardHeader}>
                <View style={styles.cleanFlatsPill}>
                  <Icon color="#059669" name="home" size={12} />
                  <Text style={styles.cleanFlatText}>{item.senderFlat || 'Flat A'}</Text>
                  <Icon color="#94A3B8" name="swap-horizontal" size={13} />
                  <Text style={styles.cleanFlatText}>{item.receiverFlat || 'Flat B'}</Text>
                </View>

                <View style={styles.cardHeaderRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      isConfirmed && styles.statusBadgeConfirmed,
                      isDispatched && styles.statusBadgeDispatched,
                    ]}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isConfirmed && styles.statusBadgeTextConfirmed,
                        isDispatched && styles.statusBadgeTextDispatched,
                      ]}>
                      {item.statusLabel}
                    </Text>
                  </View>

                  {/* EYE ICON BUTTON */}
                  <Pressable
                    accessibilityLabel="View Full Bulk Order Details"
                    hitSlop={10}
                    style={styles.eyeBtn}
                    onPress={() => setSelectedOrderDetail(item)}>
                    <Icon color="#059669" name="eye" size={17} />
                  </Pressable>
                </View>
              </View>

              {/* Product & Value Row */}
              <View style={styles.cleanProductRow}>
                <View style={styles.cleanProductIconWrap}>
                  <Icon color={colors.primary} name="basket" size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cleanProductName}>{item.productName}</Text>
                  <Text style={styles.cleanProductSub}>
                    Bulk Lot: {item.totalQuantity} {item.productUnit} · ₹{item.unitPrice}/{item.productUnit}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cleanTotalPrice}>₹{item.totalPrice}</Text>
                  <Text style={styles.cleanTimeText}>{item.timestamp}</Text>
                </View>
              </View>

              {/* Split Summary Tag */}
              <View style={styles.cleanSplitSummaryTag}>
                <Text style={styles.cleanSplitSummaryText} numberOfLines={1}>
                  👤 {item.senderName} ({item.senderShareQty} {item.productUnit}) + 👥 {item.receiverName} ({item.receiverShareQty} {item.productUnit})
                </Text>
              </View>

              {/* Card Footer Quick Actions */}
              <View style={styles.cleanCardFooter}>
                {isUpdating ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <>
                    {!isConfirmed && !isDispatched && (
                      <Pressable
                        style={styles.cleanConfirmBtn}
                        onPress={() => handleStatusChange(item, 'confirmed')}>
                        <Icon color="#FFFFFF" name="checkmark-circle" size={13} />
                        <Text style={styles.cleanBtnText}>Confirm Bulk Lot</Text>
                      </Pressable>
                    )}

                    {isConfirmed && !isDispatched && (
                      <Pressable
                        style={styles.cleanDispatchBtn}
                        onPress={() => handleStatusChange(item, 'dispatched')}>
                        <Icon color="#FFFFFF" name="paper-plane" size={13} />
                        <Text style={styles.cleanBtnText}>Mark Dispatched</Text>
                      </Pressable>
                    )}

                    {isDispatched && (
                      <View style={styles.cleanDispatchedTag}>
                        <Icon color="#059669" name="checkmark-done" size={14} />
                        <Text style={styles.cleanDispatchedTagText}>Dispatched to Gate</Text>
                      </View>
                    )}

                    <Pressable
                      style={styles.cleanViewDetailsBtn}
                      onPress={() => setSelectedOrderDetail(item)}>
                      <Icon color="#0A5C3E" name="eye-outline" size={14} />
                      <Text style={styles.cleanViewDetailsText}>Full Details →</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {/* ----------------------------------------------------------- */}
      {/* 👁️ POPUP MODAL: DETAILED BULK CLUB ORDER BREAKDOWN */}
      {/* ----------------------------------------------------------- */}
      <Modal
        animationType="slide"
        transparent
        visible={Boolean(selectedOrderDetail)}
        onRequestClose={() => setSelectedOrderDetail(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalSheet}>
            <View style={styles.modalHandle} />

            {selectedOrderDetail ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.detailModalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.liveTag}>
                      <Icon color="#15803D" name="cube" size={12} />
                      <Text style={styles.liveTagText}>
                        {selectedOrderDetail.statusLabel}
                      </Text>
                    </View>
                    <Text style={styles.detailModalTitle}>Bulk Club Order Details</Text>
                    <Text style={styles.detailModalSub}>
                      Created {selectedOrderDetail.timestamp} · ID: {selectedOrderDetail.id.slice(0, 12)}...
                    </Text>
                  </View>
                  <Pressable hitSlop={8} onPress={() => setSelectedOrderDetail(null)}>
                    <Icon color="#94A3B8" name="close-circle" size={26} />
                  </Pressable>
                </View>

                {/* Product Overview Card */}
                <View style={styles.detailProductCard}>
                  <View style={styles.detailProductIconWrap}>
                    <Icon color={colors.primary} name="basket" size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.detailProductName}>{selectedOrderDetail.productName}</Text>
                    <Text style={styles.detailProductSub}>
                      Wholesale Rate: ₹{selectedOrderDetail.unitPrice}/{selectedOrderDetail.productUnit}
                    </Text>
                    <View style={styles.detailPriceRow}>
                      <Text style={styles.detailTotalQty}>
                        Combined Lot: {selectedOrderDetail.totalQuantity} {selectedOrderDetail.productUnit}
                      </Text>
                      <Text style={styles.detailTotalPrice}>
                        Total: ₹{selectedOrderDetail.totalPrice}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Connected Flats & Contact Breakdown */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionTitle}>CONNECTED RESIDENTS & PORTIONS</Text>

                  {/* Primary Initiator */}
                  <View style={styles.detailUserCard}>
                    <View style={styles.detailUserLeft}>
                      {selectedOrderDetail.senderAvatarUrl ? (
                        <Image source={{ uri: selectedOrderDetail.senderAvatarUrl }} style={styles.detailAvatar} />
                      ) : (
                        <View style={[styles.detailAvatarFallback, { backgroundColor: '#10B981' }]}>
                          <Text style={styles.detailAvatarFallbackText}>
                            {selectedOrderDetail.senderName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.detailUserName}>{selectedOrderDetail.senderName}</Text>
                        <Text style={styles.detailUserFlat}>
                          🏠 {selectedOrderDetail.senderFlat}
                        </Text>
                        {selectedOrderDetail.senderMobile ? (
                          <Text style={styles.detailUserPhone}>
                            📞 {selectedOrderDetail.senderMobile}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.detailUserShare}>
                      <Text style={styles.detailShareQty}>
                        {selectedOrderDetail.senderShareQty} {selectedOrderDetail.productUnit}
                      </Text>
                      <Text style={styles.detailSharePrice}>
                        ₹{selectedOrderDetail.senderSharePrice}
                      </Text>
                    </View>
                  </View>

                  {/* Neighbour / Partner */}
                  <View style={[styles.detailUserCard, { marginTop: 10 }]}>
                    <View style={styles.detailUserLeft}>
                      {selectedOrderDetail.receiverAvatarUrl ? (
                        <Image source={{ uri: selectedOrderDetail.receiverAvatarUrl }} style={styles.detailAvatar} />
                      ) : (
                        <View style={[styles.detailAvatarFallback, { backgroundColor: '#38BDF8' }]}>
                          <Text style={styles.detailAvatarFallbackText}>
                            {selectedOrderDetail.receiverName?.charAt(0).toUpperCase() || 'N'}
                          </Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.detailUserName}>{selectedOrderDetail.receiverName}</Text>
                        <Text style={styles.detailUserFlat}>
                          👥 {selectedOrderDetail.receiverFlat}
                        </Text>
                        {selectedOrderDetail.receiverMobile ? (
                          <Text style={styles.detailUserPhone}>
                            📞 {selectedOrderDetail.receiverMobile}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.detailUserShare}>
                      <Text style={styles.detailShareQty}>
                        {selectedOrderDetail.receiverShareQty} {selectedOrderDetail.productUnit}
                      </Text>
                      <Text style={styles.detailSharePrice}>
                        ₹{selectedOrderDetail.receiverSharePrice}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pool Members (if Group Pool) */}
                {selectedOrderDetail.poolMembers && selectedOrderDetail.poolMembers.length > 0 && (
                  <View style={styles.poolMembersDetailBox}>
                    <Text style={styles.poolMembersTitle}>Joined Pool Members ({selectedOrderDetail.poolMembers.length}):</Text>
                    {selectedOrderDetail.poolMembers.map((m, idx) => (
                      <View key={idx} style={styles.poolMemberRow}>
                        <Text style={styles.poolMemberName}>• {m.userName} ({m.userFlat})</Text>
                        <Text style={styles.poolMemberQty}>{m.quantity} {selectedOrderDetail.productUnit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Status Update Actions inside Modal */}
                <View style={styles.detailModalActions}>
                  {selectedOrderDetail.status !== 'confirmed' && selectedOrderDetail.status !== 'dispatched' && (
                    <Pressable
                      style={styles.modalConfirmBtn}
                      onPress={() => handleStatusChange(selectedOrderDetail, 'confirmed')}>
                      <Icon color="#FFFFFF" name="checkmark-circle" size={18} />
                      <Text style={styles.modalConfirmBtnText}>Confirm Bulk Lot Order</Text>
                    </Pressable>
                  )}

                  {selectedOrderDetail.status === 'confirmed' && (
                    <Pressable
                      style={styles.modalDispatchBtn}
                      onPress={() => handleStatusChange(selectedOrderDetail, 'dispatched')}>
                      <Icon color="#FFFFFF" name="paper-plane" size={18} />
                      <Text style={styles.modalDispatchBtnText}>Mark Dispatched to Gate</Text>
                    </Pressable>
                  )}

                  {selectedOrderDetail.status === 'dispatched' && (
                    <View style={styles.modalDispatchedTagBox}>
                      <Icon color="#059669" name="checkmark-done-circle" size={18} />
                      <Text style={styles.modalDispatchedTagText}>Dispatched to Society Gate</Text>
                    </View>
                  )}

                  <Pressable
                    style={styles.modalCloseBtn}
                    onPress={() => setSelectedOrderDetail(null)}>
                    <Text style={styles.modalCloseBtnText}>Close Details</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------------------------- */}
      {/* ADMIN DECLARE BULK ITEMS MODAL (CONTROLS CUSTOMER AVAILABILITY) */}
      {/* ----------------------------------------------------------- */}
      <Modal
        animationType="slide"
        transparent
        visible={manageModalVisible}
        onRequestClose={() => setManageModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Declare Available Bulk Items</Text>
                <Text style={styles.modalSubtitle}>
                  Only products enabled here will be available for residents to split & order in chat.
                </Text>
              </View>
              <Pressable hitSlop={8} onPress={() => setManageModalVisible(false)}>
                <Icon color="#94A3B8" name="close-circle" size={24} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.catalogSearchBar}>
              <Icon color="#94A3B8" name="search" size={16} />
              <TextInput
                placeholder="Search products in catalog..."
                placeholderTextColor="#94A3B8"
                style={styles.catalogSearchInput}
                value={catalogSearch}
                onChangeText={setCatalogSearch}
              />
            </View>

            {/* List of Catalog Items */}
            {loadingCatalog ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={{ marginTop: 8, fontSize: 12, color: '#64748B' }}>Loading products...</Text>
              </View>
            ) : (
              <FlatList
                contentContainerStyle={{ paddingBottom: 20 }}
                data={filteredCatalogItems}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  return (
                    <View style={[styles.catalogItemRow, item.isBulkAvailable && styles.catalogItemRowActive]}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.catalogItemName}>{item.name}</Text>
                          {item.isBulkAvailable && (
                            <View style={styles.activePill}>
                              <Text style={styles.activePillText}>BULK ACTIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.catalogItemSub}>
                          Retail: ₹{item.retailPrice}/{item.unit}
                        </Text>

                        {/* Wholesale Price & Min Qty edit row when active */}
                        {item.isBulkAvailable ? (
                          <View style={styles.catalogPriceInputsRow}>
                            <View style={styles.priceInputWrap}>
                              <Text style={styles.inputLabel}>Wholesale ₹/{item.unit}:</Text>
                              <TextInput
                                keyboardType="numeric"
                                style={styles.priceInput}
                                value={draftPrices[item.id] ?? String(item.wholesalePrice)}
                                onBlur={() => {
                                  const cur = draftPrices[item.id] ?? '';
                                  const num = parseFloat(cur);
                                  if (isNaN(num) || num <= 0) {
                                    setDraftPrices(prev => ({
                                      ...prev,
                                      [item.id]: String(item.wholesalePrice || Math.round(item.retailPrice * 0.8)),
                                    }));
                                  }
                                }}
                                onChangeText={txt => handleUpdatePrice(item, txt)}
                              />
                            </View>
                            <View style={styles.priceInputWrap}>
                              <Text style={styles.inputLabel}>Min Bulk {item.unit}:</Text>
                              <TextInput
                                keyboardType="numeric"
                                style={styles.priceInput}
                                value={draftQtys[item.id] ?? String(item.minBulkQty)}
                                onBlur={() => {
                                  const cur = draftQtys[item.id] ?? '';
                                  const num = parseInt(cur, 10);
                                  if (isNaN(num) || num <= 0) {
                                    setDraftPrices(prev => ({
                                      ...prev,
                                      [item.id]: String(item.minBulkQty || 2),
                                    }));
                                  }
                                }}
                                onChangeText={txt => handleUpdateQty(item, txt)}
                              />
                            </View>
                          </View>
                        ) : null}
                      </View>

                      {/* Enable Switch */}
                      <View style={{ alignItems: 'center' }}>
                        <Switch
                          thumbColor={item.isBulkAvailable ? colors.primary : '#CBD5E1'}
                          trackColor={{ false: '#E2E8F0', true: '#DCFCE7' }}
                          value={item.isBulkAvailable}
                          onValueChange={val => handleToggleBulk(item, val)}
                        />
                        <Text style={{ fontSize: 9, color: item.isBulkAvailable ? '#059669' : '#94A3B8', fontWeight: '700', marginTop: 2 }}>
                          {item.isBulkAvailable ? 'ON' : 'OFF'}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            <Pressable
              style={styles.saveModalBtn}
              onPress={() => setManageModalVisible(false)}>
              <Text style={styles.saveModalBtnText}>Done / Save Declarations</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    flex: 1,
  },
  actionNoticeBar: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#86EFAC',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionNoticeText: {
    color: '#065F46',
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
  },
  headerHero: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  headerHeroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  headerBtnGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  manageCatalogBtn: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  manageCatalogBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  liveTag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    backgroundColor: '#16A34A',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  liveTagText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
  },
  heroSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  refreshIconBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: '47%',
    padding: 12,
  },
  statIconWrap: {
    alignItems: 'center',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    marginBottom: 6,
    width: 28,
  },
  statNumber: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 12.5,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterPillText: {
    color: '#64748B',
    fontSize: 11.5,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 20,
    padding: 28,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    marginBottom: 12,
    width: 64,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },

  /* ULTRA CLEAN FEED CARD STYLES */
  cleanBulkCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    padding: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cleanCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  cardHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cleanFlatsPill: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cleanFlatText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  eyeBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#A7F3D0',
    borderRadius: 8,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusBadgeConfirmed: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusBadgeDispatched: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  statusBadgeText: {
    color: '#1E40AF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusBadgeTextConfirmed: {
    color: '#15803D',
  },
  statusBadgeTextDispatched: {
    color: '#475569',
  },
  cleanProductRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 4,
  },
  cleanProductIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  cleanProductName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  cleanProductSub: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 1,
  },
  cleanTotalPrice: {
    color: '#0A5C3E',
    fontSize: 14,
    fontWeight: '800',
  },
  cleanTimeText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  cleanSplitSummaryTag: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cleanSplitSummaryText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '600',
  },
  cleanCardFooter: {
    alignItems: 'center',
    borderTopColor: '#F1F5F9',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
  },
  cleanConfirmBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cleanDispatchBtn: {
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cleanBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  cleanDispatchedTag: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  cleanDispatchedTagText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  cleanViewDetailsBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cleanViewDetailsText: {
    color: '#0A5C3E',
    fontSize: 11,
    fontWeight: '700',
  },

  /* POPUP DETAILS MODAL STYLES */
  detailModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 18,
  },
  detailModalHeader: {
    alignItems: 'flex-start',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  detailModalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  detailModalSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  detailProductCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 14,
    padding: 12,
  },
  detailProductIconWrap: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  detailProductName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  detailProductSub: {
    color: '#64748B',
    fontSize: 11.5,
    marginTop: 2,
  },
  detailPriceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailTotalQty: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  detailTotalPrice: {
    color: '#0A5C3E',
    fontSize: 14,
    fontWeight: '800',
  },
  detailSectionBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  detailSectionTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailUserCard: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  detailUserLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  detailAvatar: {
    borderRadius: 999,
    height: 36,
    width: 36,
  },
  detailAvatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  detailAvatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  detailUserName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  detailUserFlat: {
    color: '#475569',
    fontSize: 11,
    marginTop: 1,
  },
  detailUserPhone: {
    color: '#0284C7',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  detailUserShare: {
    alignItems: 'flex-end',
  },
  detailShareQty: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  detailSharePrice: {
    color: '#0A5C3E',
    fontSize: 11.5,
    fontWeight: '700',
  },
  poolMembersDetailBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginTop: 12,
    padding: 12,
  },
  poolMembersTitle: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  poolMemberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  poolMemberName: {
    color: '#78350F',
    fontSize: 11,
  },
  poolMemberQty: {
    color: '#78350F',
    fontSize: 11,
    fontWeight: '700',
  },
  detailModalActions: {
    gap: 8,
    marginTop: 18,
    paddingBottom: 10,
  },
  modalConfirmBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalDispatchBtn: {
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalDispatchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 10,
  },
  modalCloseBtnText: {
    color: '#475569',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalDispatchedTagBox: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modalDispatchedTagText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '800',
  },

  /* DECLARE BULK CATALOG MODAL STYLES */
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 16,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 36,
  },
  modalHeader: {
    alignItems: 'flex-start',
    borderBottomColor: '#F1F5F9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  catalogSearchBar: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginVertical: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catalogSearchInput: {
    color: '#0F172A',
    flex: 1,
    fontSize: 12,
    paddingVertical: 0,
  },
  catalogItemRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    padding: 10,
  },
  catalogItemRowActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  catalogItemName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  catalogItemSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  activePillText: {
    color: '#15803D',
    fontSize: 8.5,
    fontWeight: '800',
  },
  catalogPriceInputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  priceInputWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  inputLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '600',
  },
  priceInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 6,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    width: 48,
  },
  saveModalBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 12,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

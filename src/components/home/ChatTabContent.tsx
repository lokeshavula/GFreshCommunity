import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { colors } from '../../theme/colors';
import { useResponsiveLayout } from '../../utils/layout';
import { supabase } from '../../lib/supabase';
import {
  ChatConversation,
  ChatGroupDealAttachment,
  ChatProductAttachment,
  ChatSplitOrderAttachment,
  Neighbour,
  NeighbourChatMessage,
} from '../../types/neighbourChat';
import {
  acceptNeighbourConnection,
  fetchCommunityNeighbours,
  fetchConversationMessages,
  fetchDatabaseShareableProducts,
  fetchUserConversations,
  markConversationAsRead,
  sendChatMessage,
  sendNeighbourConnectionRequest,
} from '../../services/neighbourChatService';
import { fetchActiveGroupPools } from '../../services/groupBuyingService';
import { addToCart } from '../../services/cartService';
import { getCurrentUser } from '../../services/userService';
import { GroupBuyingPool } from '../../types/groupBuying';

type Props = {
  bottomPadding?: number;
  userName?: string;
  householdLabel?: string | null;
  onOpenOrders?: () => void;
  onOpenPrices?: () => void;
  onOpenRfid?: () => void;
  onOpenCategories?: () => void;
  onOpenCart?: () => void;
  onUnreadCountChange?: (count: number) => void;
};

type ActiveSegment = 'chats' | 'group_pools';

type CustomToastState = {
  visible: boolean;
  type: 'success' | 'info' | 'sent' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ChatTabContent({
  bottomPadding = 120,
  userName = 'Resident',
  householdLabel,
  onOpenOrders,
  onOpenPrices,
  onOpenRfid,
  onOpenCategories,
  onOpenCart,
  onUnreadCountChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const { shellStyle, isTablet, pageMaxWidth } = useResponsiveLayout();
  const messageListRef = useRef<FlatList>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeSegment, setActiveSegment] = useState<ActiveSegment>('chats');
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);

  // Database states
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [neighbours, setNeighbours] = useState<Neighbour[]>([]);
  const [activeMessages, setActiveMessages] = useState<NeighbourChatMessage[]>([]);
  const [shareableProducts, setShareableProducts] = useState<ChatProductAttachment[]>([]);
  const [groupPools, setGroupPools] = useState<GroupBuyingPool[]>([]);

  // Custom in-app notification toast state & animation
  const [toast, setToast] = useState<CustomToastState>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });
  const toastAnimY = useRef(new Animated.Value(-120)).current;
  const toastAnimOpacity = useRef(new Animated.Value(0)).current;

  // Add Flat Modal & Search State
  const [addFlatModalVisible, setAddFlatModalVisible] = useState(false);
  const [neighbourSearch, setNeighbourSearch] = useState('');
  const [selectedTowerFilter, setSelectedTowerFilter] = useState('All');
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);

  // Active chat state
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [productPickerVisible, setProductPickerVisible] = useState(false);

  // Split / Club Order Modal state
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [selectedSplitProduct, setSelectedSplitProduct] = useState<ChatProductAttachment | null>(null);
  const [splitTotalQty, setSplitTotalQty] = useState(2);
  const [splitMyQty, setSplitMyQty] = useState(1);

  // Helper to open Split Order Modal with a product
  const handleOpenSplitModal = (
    product: ChatProductAttachment,
    defaultTotal = 2,
    defaultMy = 1,
  ) => {
    setSelectedSplitProduct(product);
    setSplitTotalQty(defaultTotal);
    setSplitMyQty(defaultMy);
    setSplitModalVisible(true);
  };

  // Helper to send a split order into the active chat
  const handleSendSplitOrder = async (
    product: ChatProductAttachment,
    totalQty: number,
    myQty: number,
    status: 'proposed' | 'accepted' | 'added_to_cart',
  ) => {
    if (!selectedConversation || !currentUserId) return;

    const splitData: ChatSplitOrderAttachment = {
      id: `split_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productUnit: product.unit,
      unitPrice: product.price,
      totalQuantity: totalQty,
      totalPrice: totalQty * product.price,
      myShareQty: myQty,
      mySharePrice: myQty * product.price,
      neighbourShareQty: totalQty - myQty,
      neighbourSharePrice: (totalQty - myQty) * product.price,
      senderFlat: householdLabel || undefined,
      receiverFlat: selectedConversation.neighbour?.flatNumber || undefined,
      status,
    };

    const textMsg =
      status === 'added_to_cart'
        ? `🤝 Added ${myQty} ${product.unit} split share of ${product.name} (₹${myQty * product.price}) to basket!`
        : `🤝 Want to split ${totalQty} ${product.unit} of ${product.name}? (${myQty} ${product.unit} for me, ${totalQty - myQty} ${product.unit} for you)`;

    const newMsg = await sendChatMessage({
      conversationId: selectedConversation.id,
      senderId: currentUserId,
      senderName: userName || 'You',
      receiverId: selectedConversation.neighbour?.id,
      text: textMsg,
      messageType: 'split_order',
      splitOrder: splitData,
    });

    if (newMsg) {
      setActiveMessages(prev => [...prev, newMsg]);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: `🤝 Split Order: ${product.name}`, lastMessageTime: 'Just now' }
            : c,
        ),
      );
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Dismiss custom in-app notification with slide up animation
  const dismissCustomToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(toastAnimY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastAnimOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(prev => ({ ...prev, visible: false }));
    });
  }, [toastAnimY, toastAnimOpacity]);

  // Helper to show styled custom in-app notification with smooth spring animation
  const showCustomToast = useCallback(
    (
      type: 'success' | 'info' | 'sent' | 'error',
      title: string,
      message: string,
      actionLabel?: string,
      onAction?: () => void,
    ) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToast({
        visible: true,
        type,
        title,
        message,
        actionLabel,
        onAction,
      });

      // Animate in
      toastAnimY.setValue(-100);
      toastAnimOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(toastAnimY, {
          toValue: 0,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(toastAnimOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      toastTimeoutRef.current = setTimeout(() => {
        dismissCustomToast();
      }, 4500);
    },
    [dismissCustomToast, toastAnimY, toastAnimOpacity],
  );

  // Load all data from DB
  const loadDatabaseData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const [convs, neighs, prods, pools] = await Promise.all([
        fetchUserConversations(user.id),
        fetchCommunityNeighbours(user.id, user.communityId),
        fetchDatabaseShareableProducts(),
        fetchActiveGroupPools(),
      ]);

      setConversations(convs);
      setNeighbours(neighs);
      setShareableProducts(prods);
      setGroupPools(pools);

      // Compute total unread count (messages + incoming requests)
      const totalUnread =
        convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0) +
        neighs.filter(n => n.status === 'incoming').length;
      onUnreadCountChange?.(totalUnread);
    } catch (error) {
      console.warn('[ChatTabContent] loadDatabaseData error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [onUnreadCountChange]);

  useFocusEffect(
    useCallback(() => {
      loadDatabaseData();
    }, [loadDatabaseData]),
  );

  // Realtime subscription for incoming messages & connection changes
  useEffect(() => {
    if (!currentUserId || !supabase) return;

    const channel = supabase
      .channel(`chat_channel_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gfm_neighbour_messages' },
        payload => {
          const newRow = payload.new as any;
          if (newRow && selectedConversation && newRow.conversation_id === selectedConversation.id) {
            if (newRow.sender_id !== currentUserId) {
              markConversationAsRead(selectedConversation.id, currentUserId);
            }
            fetchConversationMessages(selectedConversation.id, currentUserId).then(msgs => {
              setActiveMessages(msgs);
              setTimeout(() => {
                messageListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            });
          } else {
            loadDatabaseData();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gfm_neighbour_connections' },
        () => {
          loadDatabaseData();
        },
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [currentUserId, selectedConversation, loadDatabaseData]);

  // Load messages when a conversation is selected & mark as read
  useEffect(() => {
    if (!selectedConversation || !currentUserId) return;

    // Mark active conversation messages as read immediately
    markConversationAsRead(selectedConversation.id, currentUserId);
    setConversations(prev =>
      prev.map(c => (c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c)),
    );

    let isSubscribed = true;
    fetchConversationMessages(selectedConversation.id, currentUserId).then(msgs => {
      if (isSubscribed) {
        setActiveMessages(msgs);
        setTimeout(() => {
          messageListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [selectedConversation, currentUserId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDatabaseData();
  };

  // Send a text message to DB
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend || !selectedConversation || !currentUserId || isSending) return;

    setIsSending(true);
    if (!customText) setChatInput('');

    const newMsg = await sendChatMessage({
      conversationId: selectedConversation.id,
      senderId: currentUserId,
      senderName: userName || 'You',
      receiverId: selectedConversation.neighbour?.id,
      text: textToSend,
      messageType: 'text',
    });

    if (newMsg) {
      setActiveMessages(prev => [...prev, newMsg]);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: textToSend, lastMessageTime: 'Just now' }
            : c,
        ),
      );
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    setIsSending(false);
  };

  // Share a DB product card into the chat
  const handleShareProduct = async (product: ChatProductAttachment) => {
    if (!selectedConversation || !currentUserId) return;

    setProductPickerVisible(false);

    const shareMsg = await sendChatMessage({
      conversationId: selectedConversation.id,
      senderId: currentUserId,
      senderName: userName || 'You',
      receiverId: selectedConversation.neighbour?.id,
      text: `Hey, look at this deal on ${product.name} on G-Fresh! Shall we club our order?`,
      messageType: 'product_share',
      product,
    });

    if (shareMsg) {
      setActiveMessages(prev => [...prev, shareMsg]);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: `🏷️ Shared deal: ${product.name}`, lastMessageTime: 'Just now' }
            : c,
        ),
      );
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Connect with neighbour in DB / Send connection request
  const handleConnectNeighbour = async (neighbour: Neighbour) => {
    if (!currentUserId) {
      showCustomToast('info', 'Sign in required', 'Please sign in to connect with neighbours.');
      return;
    }

    if (neighbour.status === 'connected') {
      // Open direct chat immediately
      const convId = [currentUserId, neighbour.id].sort().join('_');
      let existingConv = conversations.find(c => c.id === convId);
      if (!existingConv) {
        existingConv = {
          id: convId,
          type: 'direct',
          neighbour,
          title: neighbour.fullName,
          subtitle: `Flat ${neighbour.flatNumber}`,
          tower: neighbour.tower,
          lastMessage: 'Start conversation with your neighbour',
          lastMessageTime: '',
          unreadCount: 0,
          isOnline: neighbour.isOnline,
        };
        setConversations(prev => [existingConv!, ...prev]);
      }
      setAddFlatModalVisible(false);
      setSelectedConversation(existingConv);
      return;
    }

    if (neighbour.status === 'incoming') {
      setConnectingUserId(neighbour.id);
      const ok = await acceptNeighbourConnection(currentUserId, neighbour.id);
      setConnectingUserId(null);

      if (ok) {
        setNeighbours(prev =>
          prev.map(n => (n.id === neighbour.id ? { ...n, status: 'connected' } : n)),
        );

        showCustomToast(
          'success',
          'Connected! 🎉',
          `You are now connected with ${neighbour.fullName} (${neighbour.flatNumber}).`,
          'Message →',
          () => {
            const convId = [currentUserId, neighbour.id].sort().join('_');
            let existingConv = conversations.find(c => c.id === convId);
            if (!existingConv) {
              existingConv = {
                id: convId,
                type: 'direct',
                neighbour: { ...neighbour, status: 'connected' },
                title: neighbour.fullName,
                subtitle: `Flat ${neighbour.flatNumber}`,
                tower: neighbour.tower,
                lastMessage: 'Start conversation with your neighbour',
                lastMessageTime: '',
                unreadCount: 0,
                isOnline: neighbour.isOnline,
              };
              setConversations(prev => [existingConv!, ...prev]);
            }
            setAddFlatModalVisible(false);
            setSelectedConversation(existingConv);
          },
        );

        loadDatabaseData();
      }
      return;
    }

    // Send connection request to the target neighbour
    setConnectingUserId(neighbour.id);
    const result = await sendNeighbourConnectionRequest(currentUserId, neighbour.id);
    setConnectingUserId(null);

    if (result.success) {
      setNeighbours(prev =>
        prev.map(n => (n.id === neighbour.id ? { ...n, status: result.status } : n)),
      );

      if (result.status === 'connected') {
        showCustomToast(
          'success',
          'Connected! 🎉',
          `You are now connected with ${neighbour.fullName} (${neighbour.flatNumber})!`,
          'Message →',
          () => {
            const convId = [currentUserId, neighbour.id].sort().join('_');
            let existingConv = conversations.find(c => c.id === convId);
            if (!existingConv) {
              existingConv = {
                id: convId,
                type: 'direct',
                neighbour: { ...neighbour, status: 'connected' },
                title: neighbour.fullName,
                subtitle: `Flat ${neighbour.flatNumber}`,
                tower: neighbour.tower,
                lastMessage: 'Start conversation with your neighbour',
                lastMessageTime: '',
                unreadCount: 0,
                isOnline: neighbour.isOnline,
              };
              setConversations(prev => [existingConv!, ...prev]);
            }
            setAddFlatModalVisible(false);
            setSelectedConversation(existingConv);
          },
        );
        loadDatabaseData();
      } else {
        showCustomToast(
          'sent',
          'Request Sent 📨',
          `Connection request sent to ${neighbour.fullName} (Flat ${neighbour.flatNumber}).`,
        );
      }
    } else {
      showCustomToast('error', 'Notice', 'Could not send request. Please check connection.');
    }
  };

  // Filtered neighbours for the Add Flat popup search
  const filteredNeighbours = neighbours.filter(n => {
    const matchesTower =
      selectedTowerFilter === 'All' || n.tower.toLowerCase().includes(selectedTowerFilter.toLowerCase());
    const query = neighbourSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      n.fullName.toLowerCase().includes(query) ||
      n.flatNumber.toLowerCase().includes(query) ||
      n.tower.toLowerCase().includes(query) ||
      (n.phone && n.phone.includes(query));
    return matchesTower && matchesSearch;
  });

  const towerOptions = ['All', ...Array.from(new Set(neighbours.map(n => n.tower).filter(Boolean)))];
  const incomingRequests = neighbours.filter(n => n.status === 'incoming');

  // Helper renderer for floating in-app notification toast
  const renderCustomToast = () => {
    if (!toast.visible) return null;

    const iconName =
      toast.type === 'success'
        ? 'checkmark-circle'
        : toast.type === 'sent'
        ? 'paper-plane'
        : toast.type === 'error'
        ? 'alert-circle'
        : 'information-circle';

    const iconColor =
      toast.type === 'success'
        ? '#22C55E'
        : toast.type === 'sent'
        ? '#38BDF8'
        : toast.type === 'error'
        ? '#EF4444'
        : colors.primary;

    return (
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.customToastWrap,
          {
            top: insets.top + (Platform.OS === 'ios' ? 8 : 12),
            opacity: toastAnimOpacity,
            transform: [{ translateY: toastAnimY }],
          },
        ]}>
        <View style={styles.customToastInner}>
          <View style={[styles.customToastIconBg, { backgroundColor: `${iconColor}22` }]}>
            <Icon color={iconColor} name={iconName} size={22} />
          </View>

          <View style={styles.customToastTextWrap}>
            <Text numberOfLines={1} style={styles.customToastTitle}>
              {toast.title}
            </Text>
            <Text numberOfLines={2} style={styles.customToastMessage}>
              {toast.message}
            </Text>
          </View>

          {toast.actionLabel && (
            <Pressable
              style={styles.customToastActionBtn}
              onPress={() => {
                dismissCustomToast();
                toast.onAction?.();
              }}>
              <Text style={styles.customToastActionText}>{toast.actionLabel}</Text>
            </Pressable>
          )}

          <Pressable
            hitSlop={10}
            style={styles.customToastCloseBtn}
            onPress={dismissCustomToast}>
            <Icon color="#94A3B8" name="close" size={18} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  // ----------------------------------------------------
  // RENDER: ACTIVE DIRECT CONVERSATION SCREEN
  // ----------------------------------------------------
  if (selectedConversation) {
    const isDirect = selectedConversation.type === 'direct';
    const neighbour = selectedConversation.neighbour;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={[styles.container, { backgroundColor: colors.surface }]}>
        {renderCustomToast()}

        {/* Chat Top Header */}
        <View style={[styles.chatHeader, { paddingTop: insets.top + 10 }]}>
          <View style={[shellStyle('wide'), styles.chatHeaderContent]}>
            <Pressable
              hitSlop={8}
              style={styles.chatBackBtn}
              onPress={() => setSelectedConversation(null)}>
              <Icon color={colors.textPrimary} name="arrow-back" size={22} />
            </Pressable>

            <View style={styles.chatHeaderAvatarWrap}>
              {isDirect ? (
                neighbour?.avatarUrl ? (
                  <View style={styles.avatarImgWrap}>
                    <Image source={{ uri: neighbour.avatarUrl }} style={styles.avatarImg} />
                    {neighbour.isOnline ? <View style={styles.onlineDot} /> : null}
                  </View>
                ) : (
                  <View style={styles.avatarInitials}>
                    <Text style={styles.avatarInitialsText}>
                      {selectedConversation.title.charAt(0).toUpperCase()}
                    </Text>
                    {neighbour?.isOnline ? <View style={styles.onlineDot} /> : null}
                  </View>
                )
              ) : (
                <View style={[styles.avatarInitials, { backgroundColor: '#ECFDF3' }]}>
                  <Icon color={colors.primary} name="people" size={18} />
                </View>
              )}
            </View>

            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                {selectedConversation.title}
              </Text>
              <View className="flex-row items-center">
                <Text style={styles.chatHeaderSubtitle}>
                  {selectedConversation.subtitle || selectedConversation.tower}
                </Text>
                {isDirect && (
                  <Text style={styles.onlineStatusText}>
                    {' '}· {neighbour?.isOnline ? 'Active in Society' : 'Offline'}
                  </Text>
                )}
              </View>
            </View>

            {/* Direct contact actions */}
            {isDirect && neighbour?.phone ? (
              <View className="flex-row items-center gap-2">
                <Pressable
                  style={styles.headerActionBtn}
                  onPress={() =>
                    Linking.openURL(
                      `https://wa.me/91${neighbour.phone}?text=${encodeURIComponent(
                        `Hi ${neighbour.fullName}! Connecting from G-Fresh Community.`,
                      )}`,
                    )
                  }>
                  <Icon color="#25D366" name="logo-whatsapp" size={18} />
                </Pressable>
                <Pressable
                  style={styles.headerActionBtn}
                  onPress={() => Linking.openURL(`tel:${neighbour.phone}`)}>
                  <Icon color={colors.primary} name="call-outline" size={18} />
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        {/* Message Feed */}
        <FlatList
          ref={messageListRef}
          contentContainerStyle={[
            styles.messageFeed,
            shellStyle('wide'),
            { paddingBottom: bottomPadding + 80 },
          ]}
          data={activeMessages}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyFeed}>
              <View style={styles.emptyFeedIcon}>
                <Icon color={colors.primary} name="chatbubble-ellipses-outline" size={32} />
              </View>
              <Text style={styles.emptyFeedTitle}>No messages yet</Text>
              <Text style={styles.emptyFeedSub}>
                Say hello to {selectedConversation.title} or share a fresh product deal to club your order!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMine = item.isMine;
            return (
              <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowNeighbour]}>
                {!isMine && (
                  item.senderAvatarUrl ? (
                    <Image source={{ uri: item.senderAvatarUrl }} style={styles.senderAvatarMiniImage} />
                  ) : (
                    <View style={styles.senderAvatarMini}>
                      <Text style={styles.senderAvatarMiniText}>
                        {item.senderName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )
                )}
                <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleNeighbour]}>
                  {!isMine && (
                    <Text style={styles.senderNameLabel}>
                      {item.senderName} {item.senderFlat ? `· Flat ${item.senderFlat}` : ''}
                    </Text>
                  )}

                  {/* Standard Text */}
                  <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextNeighbour]}>
                    {item.text}
                  </Text>

                  {/* Embedded Product Card */}
                  {item.product ? (
                    <View style={styles.sharedProductCard}>
                      <View style={styles.sharedProductHeader}>
                        <Icon color={colors.primaryDark} name="pricetag" size={13} />
                        <Text style={styles.sharedProductBadge}>G-FRESH COMMUNITY DEAL</Text>
                        {item.product.discountPercent ? (
                          <View style={styles.discountBadgeMini}>
                            <Text style={styles.discountBadgeMiniText}>
                              {item.product.discountPercent}% OFF
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.sharedProductName}>{item.product.name}</Text>
                      {item.product.subtitle ? (
                        <Text style={styles.sharedProductSub}>{item.product.subtitle}</Text>
                      ) : null}

                      <View style={styles.sharedProductPriceRow}>
                        <Text style={styles.sharedProductPrice}>
                          ₹{item.product.price}
                          <Text style={styles.sharedProductUnit}>/{item.product.unit}</Text>
                        </Text>
                        {item.product.originalPrice ? (
                          <Text style={styles.sharedProductOriginalPrice}>
                            ₹{item.product.originalPrice}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.sharedProductActions}>
                        <Pressable
                          style={styles.splitBtn}
                          onPress={() => {
                            if (item.product) {
                              handleOpenSplitModal(item.product, 2, 1);
                            }
                          }}>
                          <Icon color={colors.white} name="people" size={14} />
                          <Text style={styles.splitBtnText}>Split / Club Order 🤝</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {/* Embedded Interactive Split / Club Order Card */}
                  {item.splitOrder ? (
                    <View style={styles.sharedSplitCard}>
                      <View style={styles.sharedSplitHeader}>
                        <View style={styles.sharedSplitBadge}>
                          <Icon color="#0A5C3E" name="people" size={13} />
                          <Text style={styles.sharedSplitBadgeText}>CLUB / SPLIT ORDER</Text>
                        </View>
                        <View style={styles.sharedSplitStatusPill}>
                          <Text style={styles.sharedSplitStatusText}>
                            {item.splitOrder.status === 'added_to_cart' ? 'IN BASKET 🛒' : 'ACTIVE DEAL'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.sharedSplitTitle}>{item.splitOrder.productName}</Text>
                      <Text style={styles.sharedSplitSub}>
                        Wholesale Rate: ₹{item.splitOrder.unitPrice}/{item.splitOrder.productUnit} · Total {item.splitOrder.totalQuantity} {item.splitOrder.productUnit}
                      </Text>

                      {/* Split Portion Comparison */}
                      <View style={styles.sharedSplitBreakdown}>
                        <View style={styles.splitUserPortion}>
                          <Text style={styles.splitPortionLabel}>👤 Sender Share</Text>
                          <Text style={styles.splitPortionVal}>
                            {item.splitOrder.myShareQty} {item.splitOrder.productUnit} (₹{item.splitOrder.mySharePrice})
                          </Text>
                        </View>
                        <View style={styles.splitDividerLine} />
                        <View style={styles.splitUserPortion}>
                          <Text style={styles.splitPortionLabel}>👥 Neighbour Share</Text>
                          <Text style={styles.splitPortionVal}>
                            {item.splitOrder.neighbourShareQty} {item.splitOrder.productUnit} (₹{item.splitOrder.neighbourSharePrice})
                          </Text>
                        </View>
                      </View>

                      <View style={styles.sharedSplitActionRow}>
                        <Pressable
                          style={styles.splitViewDetailsBtn}
                          onPress={() => {
                            const prod: ChatProductAttachment = {
                              id: item.splitOrder!.productId,
                              name: item.splitOrder!.productName,
                              unit: item.splitOrder!.productUnit,
                              price: item.splitOrder!.unitPrice,
                            };
                            handleOpenSplitModal(
                              prod,
                              item.splitOrder!.totalQuantity,
                              item.splitOrder!.myShareQty,
                            );
                          }}>
                          <Icon color={colors.white} name="options" size={14} />
                          <Text style={styles.splitViewDetailsBtnText}>View Split Details & Add 🛒</Text>
                        </Pressable>
                        {onOpenCart && (
                          <Pressable
                            style={styles.splitCartBtn}
                            onPress={() => onOpenCart()}>
                            <Icon color={colors.primaryDark} name="cart-outline" size={14} />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.msgFooter}>
                    <Text style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeNeighbour]}>
                      {item.timestamp}
                    </Text>
                    {isMine && <Icon color={colors.white} name="checkmark-done" size={12} style={{ marginLeft: 4 }} />}
                  </View>
                </View>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Bar with Product Share */}
        <View
          style={[
            styles.inputWrap,
            {
              bottom: bottomPadding - 10,
              left: 0,
              right: 0,
              ...(isTablet ? { alignSelf: 'center', maxWidth: pageMaxWidth, width: '100%' } : null),
            },
          ]}>
          {/* Quick Prompts */}
          <ScrollView
            horizontal
            contentContainerStyle={styles.quickPromptsRow}
            showsHorizontalScrollIndicator={false}>
            <Pressable
              style={styles.quickPromptChip}
              onPress={() => handleSendMessage('Want to split a bulk box for today’s delivery?')}>
              <Text style={styles.quickPromptChipText}>📦 Split bulk box?</Text>
            </Pressable>
            <Pressable
              style={styles.quickPromptChip}
              onPress={() => handleSendMessage('Are you placing an order on G-Fresh right now?')}>
              <Text style={styles.quickPromptChipText}>🛒 Ordering right now?</Text>
            </Pressable>
            <Pressable
              style={styles.quickPromptChip}
              onPress={() => handleSendMessage('Did your morning slot delivery arrive?')}>
              <Text style={styles.quickPromptChipText}>🚚 Delivery status?</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.inputCard}>
            {/* Share Product Button */}
            <Pressable
              accessibilityLabel="Share Product Deal"
              style={styles.attachBtn}
              onPress={() => setProductPickerVisible(true)}>
              <Icon color={colors.primary} name="pricetag" size={20} />
            </Pressable>

            <TextInput
              placeholder="Message neighbour or discuss products..."
              placeholderTextColor="#94A3B8"
              returnKeyType="send"
              style={styles.chatTextInput}
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={() => handleSendMessage()}
            />

            <Pressable
              disabled={!chatInput.trim() || isSending}
              style={[
                styles.sendBtn,
                { backgroundColor: chatInput.trim() ? colors.primary : '#E2E8F0' },
              ]}
              onPress={() => handleSendMessage()}>
              <Icon color={chatInput.trim() ? colors.white : '#94A3B8'} name="arrow-up" size={18} />
            </Pressable>
          </View>
        </View>

        {/* Dynamic Database Product Share Picker Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={productPickerVisible}
          onRequestClose={() => setProductPickerVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHandle} />
              <View className="flex-row items-center justify-between pb-3">
                <View>
                  <Text style={styles.modalTitle}>Share a Fresh Item Deal</Text>
                  <Text style={styles.modalSubtitle}>
                    Propose a split or group order from the live catalog
                  </Text>
                </View>
                <Pressable hitSlop={8} onPress={() => setProductPickerVisible(false)}>
                  <Icon color="#94A3B8" name="close-circle" size={24} />
                </Pressable>
              </View>

              <FlatList
                data={shareableProducts}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                  <View className="py-12 items-center justify-center">
                    <Text className="text-sm text-slate-500">No active products found in catalog.</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable style={styles.productPickerRow} onPress={() => handleShareProduct(item)}>
                    <View style={styles.productPickerIconWrap}>
                      <Icon color={colors.primary} name="basket" size={22} />
                    </View>
                    <View style={styles.productPickerInfo}>
                      <Text style={styles.productPickerName}>{item.name}</Text>
                      <Text style={styles.productPickerSub}>{item.subtitle || `Per ${item.unit}`}</Text>
                      <View className="flex-row items-center mt-1">
                        <Text style={styles.productPickerPrice}>
                          ₹{item.price}/{item.unit}
                        </Text>
                        {item.discountPercent ? (
                          <View style={styles.discountPill}>
                            <Text style={styles.discountPillText}>{item.discountPercent}% OFF</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.shareActionPill}>
                      <Text style={styles.shareActionPillText}>Share</Text>
                      <Icon color={colors.primary} name="arrow-forward" size={12} />
                    </View>
                  </Pressable>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* INTERACTIVE SPLIT / CLUB ORDER CONFIGURATION MODAL */}
        {/* ---------------------------------------------------- */}
        <Modal
          animationType="slide"
          transparent
          visible={splitModalVisible}
          onRequestClose={() => setSplitModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.splitModalSheet, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHandle} />

              {/* Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center">
                    <View style={styles.splitHeaderIconWrap}>
                      <Icon color="#0A5C3E" name="people" size={18} />
                    </View>
                    <Text style={styles.splitModalTitle}>Split & Club Order</Text>
                  </View>
                  <Text style={styles.splitModalSub}>
                    Club order with {selectedConversation.title} for bulk rate & free delivery
                  </Text>
                </View>
                <Pressable hitSlop={8} onPress={() => setSplitModalVisible(false)}>
                  <Icon color="#94A3B8" name="close-circle" size={24} />
                </Pressable>
              </View>

              {selectedSplitProduct ? (
                <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {/* How Split & Club Order Works - Process Note */}
                  <View style={styles.splitProcessNoteCard}>
                    <View style={styles.splitProcessNoteHeader}>
                      <View style={styles.splitProcessNoteIconWrap}>
                        <Icon color="#047857" name="bulb" size={15} />
                      </View>
                      <Text style={styles.splitProcessNoteTitle}>How Split & Club Order Works</Text>
                      <View style={styles.splitProcessBadge}>
                        <Text style={styles.splitProcessBadgeText}>Quick Guide</Text>
                      </View>
                    </View>

                    <View style={styles.splitProcessSteps}>
                      <View style={styles.splitProcessStepItem}>
                        <View style={styles.splitProcessStepNum}>
                          <Text style={styles.splitProcessStepNumText}>1</Text>
                        </View>
                        <Text style={styles.splitProcessStepText}>
                          <Text style={styles.splitProcessStepBold}>Choose Bulk Quantity: </Text>
                          Select combined wholesale units to unlock maximum discounts & free delivery.
                        </Text>
                      </View>

                      <View style={styles.splitProcessStepItem}>
                        <View style={styles.splitProcessStepNum}>
                          <Text style={styles.splitProcessStepNumText}>2</Text>
                        </View>
                        <Text style={styles.splitProcessStepText}>
                          <Text style={styles.splitProcessStepBold}>Set Your Share: </Text>
                          Pick the portion you want. Your neighbor's share and exact costs calculate live.
                        </Text>
                      </View>

                      <View style={styles.splitProcessStepItem}>
                        <View style={styles.splitProcessStepNum}>
                          <Text style={styles.splitProcessStepNumText}>3</Text>
                        </View>
                        <Text style={styles.splitProcessStepText}>
                          <Text style={styles.splitProcessStepBold}>Add to Basket or Propose: </Text>
                          Add your share directly to your basket, or send the split deal to chat to order together!
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Product Overview Card */}
                  <View style={styles.splitProductCard}>
                    <View style={styles.splitProductIconWrap}>
                      <Icon color={colors.primary} name="basket" size={24} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text style={styles.splitProductName}>{selectedSplitProduct.name}</Text>
                      <Text style={styles.splitProductSub}>
                        {selectedSplitProduct.subtitle || `Wholesale deal · ₹${selectedSplitProduct.price}/${selectedSplitProduct.unit}`}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text style={styles.splitPriceHighlight}>
                          ₹{selectedSplitProduct.price}/{selectedSplitProduct.unit}
                        </Text>
                        {selectedSplitProduct.originalPrice ? (
                          <Text style={styles.splitOriginalPrice}>
                            ₹{selectedSplitProduct.originalPrice}
                          </Text>
                        ) : null}
                        <View style={styles.splitSaveBadge}>
                          <Text style={styles.splitSaveBadgeText}>CLUB RATE</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Quantity Stepper */}
                  <View style={styles.splitSectionCard}>
                    <Text style={styles.splitSectionTitle}>Total Bulk Quantity to Order</Text>
                    <Text style={styles.splitSectionDesc}>
                      Select total combined units you and {selectedConversation.title} will share:
                    </Text>
                    <View style={styles.stepperRow}>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => {
                          if (splitTotalQty > 2) {
                            const nextTotal = splitTotalQty - 1;
                            setSplitTotalQty(nextTotal);
                            setSplitMyQty(Math.max(1, Math.floor(nextTotal / 2)));
                          }
                        }}>
                        <Icon color="#1E293B" name="remove" size={18} />
                      </Pressable>
                      <Text style={styles.stepperValue}>
                        {splitTotalQty} <Text style={{ fontSize: 13, color: '#64748B' }}>{selectedSplitProduct.unit}</Text>
                      </Text>
                      <Pressable
                        style={styles.stepperBtn}
                        onPress={() => {
                          const nextTotal = splitTotalQty + 1;
                          setSplitTotalQty(nextTotal);
                          setSplitMyQty(Math.ceil(nextTotal / 2));
                        }}>
                        <Icon color="#1E293B" name="add" size={18} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Split Breakdown Details */}
                  <View style={styles.splitBreakdownCard}>
                    <Text style={styles.splitSectionTitle}>Portion & Cost Breakdown</Text>

                    {/* Your Portion */}
                    <View style={styles.breakdownRow}>
                      <View className="flex-row items-center">
                        <View style={[styles.avatarDot, { backgroundColor: '#10B981' }]} />
                        <View className="ml-2">
                          <Text style={styles.breakdownName}>Your Share (You)</Text>
                          <Text style={styles.breakdownQty}>
                            {splitMyQty} {selectedSplitProduct.unit}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.breakdownCost}>
                        ₹{splitMyQty * selectedSplitProduct.price}
                      </Text>
                    </View>

                    {/* Neighbour Portion */}
                    <View style={styles.breakdownRow}>
                      <View className="flex-row items-center">
                        <View style={[styles.avatarDot, { backgroundColor: '#38BDF8' }]} />
                        <View className="ml-2">
                          <Text style={styles.breakdownName}>{selectedConversation.title}'s Share</Text>
                          <Text style={styles.breakdownQty}>
                            {splitTotalQty - splitMyQty} {selectedSplitProduct.unit}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.breakdownCost}>
                        ₹{(splitTotalQty - splitMyQty) * selectedSplitProduct.price}
                      </Text>
                    </View>

                    {/* Total Combined */}
                    <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                      <Text style={styles.breakdownTotalLabel}>Total Combined Order</Text>
                      <Text style={styles.breakdownTotalVal}>
                        ₹{splitTotalQty * selectedSplitProduct.price}
                      </Text>
                    </View>
                  </View>

                  {/* Actions inside Modal */}
                  <View style={{ marginTop: 16, gap: 10 }}>
                    <Pressable
                      style={styles.addShareCartBtn}
                      onPress={async () => {
                        if (!selectedSplitProduct) return;
                        try {
                          await addToCart({
                            productId: selectedSplitProduct.id,
                            name: `${selectedSplitProduct.name} (Split Order)`,
                            subtitle: `Clubbed with ${selectedConversation.title}`,
                            price: selectedSplitProduct.price,
                            unit: selectedSplitProduct.unit,
                            quantity: splitMyQty,
                          });

                          await handleSendSplitOrder(
                            selectedSplitProduct,
                            splitTotalQty,
                            splitMyQty,
                            'added_to_cart',
                          );
                          setSplitModalVisible(false);

                          showCustomToast(
                            'success',
                            'Added to Basket! 🛒',
                            `${splitMyQty} ${selectedSplitProduct.unit} of ${selectedSplitProduct.name} added to your cart.`,
                            'View Cart →',
                            () => onOpenCart?.(),
                          );
                        } catch {
                          showCustomToast('error', 'Cart Error', 'Could not add split order to cart.');
                        }
                      }}>
                      <Icon color={colors.white} name="cart" size={18} />
                      <Text style={styles.addShareCartBtnText}>
                        Add My Share to Basket (₹{splitMyQty * selectedSplitProduct.price})
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.proposeSplitBtn}
                      onPress={async () => {
                        if (!selectedSplitProduct) return;
                        await handleSendSplitOrder(
                          selectedSplitProduct,
                          splitTotalQty,
                          splitMyQty,
                          'proposed',
                        );
                        setSplitModalVisible(false);
                        showCustomToast(
                          'sent',
                          'Proposal Sent 📨',
                          `Split order proposal sent to ${selectedConversation.title}.`,
                        );
                      }}>
                      <Icon color="#0A5C3E" name="paper-plane" size={16} />
                      <Text style={styles.proposeSplitBtnText}>Send Split Proposal to Chat</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  // ----------------------------------------------------
  // RENDER: MAIN NEIGHBOUR HUB / CONVERSATIONS & GROUPS
  // ----------------------------------------------------
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {renderCustomToast()}

      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={[shellStyle('wide'), styles.headerContent]}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View style={styles.headerIconWrap}>
                <Icon color={colors.primary} name="people" size={22} />
              </View>
              <View className="ml-3 flex-1">
                <Text style={styles.headerTitle}>Neighbour Hub</Text>
                <View className="flex-row items-center mt-0.5">
                  <Icon color={colors.accent} name="location-sharp" size={12} />
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {householdLabel ?? 'Your Society Community'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ADD FLAT POPUP BUTTON */}
            <Pressable
              style={styles.addNeighbourHeaderBtn}
              onPress={() => setAddFlatModalVisible(true)}>
              <Icon color={colors.primaryDark} name="person-add" size={16} />
              <Text style={styles.addNeighbourHeaderBtnText}>+ Add Flat</Text>
            </Pressable>
          </View>

          {/* Segment Selector */}
          <View style={styles.segmentBar}>
            <Pressable
              style={[styles.segmentBtn, activeSegment === 'chats' && styles.segmentBtnActive]}
              onPress={() => setActiveSegment('chats')}>
              <Text
                style={[
                  styles.segmentBtnText,
                  activeSegment === 'chats' && styles.segmentBtnTextActive,
                ]}>
                Messages
              </Text>
              {conversations.reduce((acc, c) => acc + c.unreadCount, 0) > 0 ? (
                <View style={styles.unreadBadgeMini}>
                  <Text style={styles.unreadBadgeMiniText}>
                    {conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              style={[
                styles.segmentBtn,
                activeSegment === 'group_pools' && styles.segmentBtnActive,
              ]}
              onPress={() => setActiveSegment('group_pools')}>
              <Text
                style={[
                  styles.segmentBtnText,
                  activeSegment === 'group_pools' && styles.segmentBtnTextActive,
                ]}>
                Group Pools 🛒 ({groupPools.length})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="mt-3 text-xs text-slate-500">Loading community data from database...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            shellStyle('wide'),
            { paddingBottom: bottomPadding + 30 },
            isTablet ? { alignSelf: 'center', maxWidth: pageMaxWidth, width: '100%' } : null,
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}>
          {/* SEGMENT 1: CONVERSATIONS LIST */}
          {activeSegment === 'chats' && (
            <View>
              {/* Incoming Requests Banner (if any) */}
              {incomingRequests.length > 0 && (
                <View style={styles.incomingBanner}>
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View style={styles.incomingBadgeIcon}>
                        <Icon color="#22C55E" name="person-add" size={16} />
                      </View>
                      <Text style={styles.incomingBannerTitle}>
                        {incomingRequests.length} Incoming Request{incomingRequests.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => setAddFlatModalVisible(true)}>
                      <Text style={styles.incomingViewAllText}>View All</Text>
                    </Pressable>
                  </View>

                  {incomingRequests.slice(0, 2).map(req => (
                    <View key={req.id} style={styles.incomingRowCard}>
                      {req.avatarUrl ? (
                        <Image source={{ uri: req.avatarUrl }} style={styles.incomingAvatarImg} />
                      ) : (
                        <View style={styles.incomingAvatar}>
                          <Text style={styles.incomingAvatarText}>{req.fullName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1">
                        <Text style={styles.incomingName}>{req.fullName}</Text>
                        <Text style={styles.incomingFlat}>Flat {req.flatNumber} · {req.tower}</Text>
                      </View>
                      <Pressable
                        style={styles.acceptBtnMini}
                        onPress={() => handleConnectNeighbour(req)}>
                        <Text style={styles.acceptBtnMiniText}>Accept</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Quick banner to connect */}
              <Pressable
                style={styles.bannerConnect}
                onPress={() => setAddFlatModalVisible(true)}>
                <View style={styles.bannerConnectIcon}>
                  <Icon color={colors.primary} name="people-circle" size={24} />
                </View>
                <View className="ml-3 flex-1">
                  <Text style={styles.bannerConnectTitle}>Add Flat & Connect Neighbours</Text>
                  <Text style={styles.bannerConnectSub}>
                    Browse {neighbours.length} registered flats in your society to message & club orders.
                  </Text>
                </View>
                <Icon color={colors.primary} name="chevron-forward" size={18} />
              </Pressable>

              <Text style={styles.sectionTitle}>Conversations</Text>
              {conversations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon color="#94A3B8" name="chatbubble-ellipses-outline" size={36} />
                  <Text style={styles.emptyTitle}>No active conversations</Text>
                  <Text style={styles.emptySub}>
                    Tap "+ Add Flat" to find registered neighbours in your society and start clubbing orders!
                  </Text>
                  <Pressable
                    style={styles.emptyAddBtn}
                    onPress={() => setAddFlatModalVisible(true)}>
                    <Icon color={colors.white} name="person-add" size={16} />
                    <Text style={styles.emptyAddBtnText}>Browse Society Flats</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.conversationsList}>
                  {conversations.map(conv => {
                    const isGroup = conv.type === 'group';
                    return (
                      <Pressable
                        key={conv.id}
                        style={styles.convCard}
                        onPress={() => setSelectedConversation(conv)}>
                        <View style={styles.convAvatarWrap}>
                          {isGroup ? (
                            <View style={[styles.convAvatar, { backgroundColor: '#ECFDF3' }]}>
                              <Icon color={colors.primary} name="people" size={22} />
                            </View>
                          ) : conv.neighbour?.avatarUrl ? (
                            <View style={styles.convAvatarImgWrap}>
                              <Image source={{ uri: conv.neighbour.avatarUrl }} style={styles.convAvatarImg} />
                              {conv.neighbour.isOnline ? <View style={styles.convOnlineDot} /> : null}
                            </View>
                          ) : (
                            <View style={styles.convAvatar}>
                              <Text style={styles.convAvatarText}>
                                {conv.title.charAt(0).toUpperCase()}
                              </Text>
                              {conv.neighbour?.isOnline ? <View style={styles.convOnlineDot} /> : null}
                            </View>
                          )}
                        </View>

                        <View style={styles.convInfo}>
                          <View className="flex-row items-center justify-between mb-1">
                            <View className="flex-row items-center flex-1 pr-2">
                              <Text style={styles.convTitle} numberOfLines={1}>
                                {conv.title}
                              </Text>
                              {conv.neighbour?.flatNumber ? (
                                <View style={styles.flatPill}>
                                  <Text style={styles.flatPillText}>{conv.neighbour.flatNumber}</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.convTime}>{conv.lastMessageTime}</Text>
                          </View>

                          <View className="flex-row items-center justify-between">
                            <Text style={styles.convLastMessage} numberOfLines={1}>
                              {conv.lastMessage}
                            </Text>
                            {conv.unreadCount > 0 ? (
                              <View style={styles.unreadPill}>
                                <Text style={styles.unreadPillText}>{conv.unreadCount}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* SEGMENT 2: GROUP BUY POOLS FROM DATABASE */}
          {activeSegment === 'group_pools' && (
            <View>
              <View style={styles.groupPoolsHero}>
                <Icon color={colors.primaryDark} name="bag-check" size={28} />
                <Text style={styles.groupPoolsHeroTitle}>Society Bulk Group Pools</Text>
                <Text style={styles.groupPoolsHeroSub}>
                  Club orders with your block neighbours to unlock farm wholesale prices on bulk crates and bags!
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Active Group Buying Pools</Text>
              {groupPools.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon color="#94A3B8" name="bag-outline" size={36} />
                  <Text style={styles.emptyTitle}>No active group pools</Text>
                  <Text style={styles.emptySub}>
                    Check back soon for new community group buying crates and bulk bags.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {groupPools.map(pool => (
                    <View key={pool.id} style={styles.poolCard}>
                      <View className="flex-row items-center justify-between mb-2">
                        <View style={styles.poolBadge}>
                          <Text style={styles.poolBadgeText}>GROUP DEAL · {pool.closesAtLabel}</Text>
                        </View>
                        <Text style={styles.poolSlotsText}>
                          {pool.filledSlots}/{pool.totalSlots} slots joined
                        </Text>
                      </View>

                      <Text style={styles.poolTitle}>
                        {pool.emoji} {pool.title}
                      </Text>
                      <Text style={styles.poolSub}>{pool.subtitle}</Text>

                      <View className="flex-row items-baseline mt-2 mb-3">
                        <Text style={styles.poolPrice}>₹{pool.groupPrice}</Text>
                        <Text style={styles.poolOriginalPrice}>₹{pool.originalPrice}</Text>
                        <Text style={styles.poolPerKg}> ({pool.unit})</Text>
                      </View>

                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(100, (pool.filledSlots / pool.totalSlots) * 100)}%`,
                            },
                          ]}
                        />
                      </View>

                      <Pressable
                        style={styles.joinPoolButton}
                        onPress={() => {
                          const conv = conversations.find(c => c.id === 'group_society_all');
                          if (conv) setSelectedConversation(conv);
                        }}>
                        <Text style={styles.joinPoolButtonText}>Open Community Chat & Club Order</Text>
                        <Icon color={colors.white} name="arrow-forward" size={14} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ---------------------------------------------------- */}
      {/* ADD FLAT POPUP MODAL (ALL REGISTERED USERS & SEARCH) */}
      {/* ---------------------------------------------------- */}
      <Modal
        animationType="slide"
        transparent
        visible={addFlatModalVisible}
        onRequestClose={() => setAddFlatModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          {renderCustomToast()}

          <View style={[styles.addFlatSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />

            {/* Modal Header */}
            <View className="flex-row items-center justify-between pb-3">
              <View className="flex-1 pr-2">
                <Text style={styles.modalTitle}>Add Flat & Connect Neighbours</Text>
                <Text style={styles.modalSubtitle}>
                  {neighbours.length} registered residents in your society
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                style={styles.modalCloseBtn}
                onPress={() => setAddFlatModalVisible(false)}>
                <Icon color="#64748B" name="close" size={22} />
              </Pressable>
            </View>

            {/* Search Bar in Popup */}
            <View style={styles.popupSearchBar}>
              <Icon color="#94A3B8" name="search" size={18} />
              <TextInput
                placeholder="Search flat number (e.g. B-402, 105) or name..."
                placeholderTextColor="#94A3B8"
                style={styles.popupSearchInput}
                value={neighbourSearch}
                onChangeText={setNeighbourSearch}
              />
              {neighbourSearch ? (
                <Pressable hitSlop={8} onPress={() => setNeighbourSearch('')}>
                  <Icon color="#94A3B8" name="close-circle" size={18} />
                </Pressable>
              ) : null}
            </View>

            {/* Tower Filter Chips */}
            {towerOptions.length > 1 && (
              <View style={styles.towerFilterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {towerOptions.map(tower => (
                    <Pressable
                      key={tower}
                      style={[
                        styles.towerChip,
                        selectedTowerFilter === tower && styles.towerChipActive,
                      ]}
                      onPress={() => setSelectedTowerFilter(tower)}>
                      <Text
                        style={[
                          styles.towerChipText,
                          selectedTowerFilter === tower && styles.towerChipTextActive,
                        ]}>
                        {tower}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Residents List */}
            <FlatList
              data={filteredNeighbours}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon color="#94A3B8" name="people-outline" size={36} />
                  <Text style={styles.emptyTitle}>No matching residents</Text>
                  <Text style={styles.emptySub}>
                    No registered user found for &quot;{neighbourSearch}&quot;.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isConnected = item.status === 'connected';
                const isPending = item.status === 'pending';
                const isIncoming = item.status === 'incoming';
                const isConnectingThis = connectingUserId === item.id;

                return (
                  <View style={styles.neighbourRowCard}>
                    {item.avatarUrl ? (
                      <View style={styles.neighbourAvatarImgWrap}>
                        <Image source={{ uri: item.avatarUrl }} style={styles.neighbourAvatarImg} />
                        {item.isOnline ? <View style={styles.convOnlineDot} /> : null}
                      </View>
                    ) : (
                      <View style={styles.neighbourAvatar}>
                        <Text style={styles.neighbourAvatarText}>
                          {item.fullName.charAt(0).toUpperCase()}
                        </Text>
                        {item.isOnline ? <View style={styles.convOnlineDot} /> : null}
                      </View>
                    )}

                    <View style={styles.neighbourInfo}>
                      <Text style={styles.neighbourName}>{item.fullName}</Text>
                      <View className="flex-row items-center mt-0.5">
                        {item.flatNumber ? (
                          <View style={styles.flatPillSmall}>
                            <Text style={styles.flatPillSmallText}>{item.flatNumber}</Text>
                          </View>
                        ) : null}
                        <Text style={styles.towerNameText}>· {item.tower}</Text>
                      </View>
                    </View>

                    {/* CONNECT BUTTON WITH REAL-TIME REQUEST DISPATCH */}
                    <Pressable
                      disabled={isConnectingThis || isPending}
                      style={[
                        styles.connectActionBtn,
                        isConnected && styles.connectBtnConnected,
                        isPending && styles.connectBtnPending,
                        isIncoming && styles.connectBtnIncoming,
                      ]}
                      onPress={() => handleConnectNeighbour(item)}>
                      {isConnectingThis ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <>
                          <Icon
                            color={
                              isConnected
                                ? colors.primaryDark
                                : isPending
                                ? '#64748B'
                                : colors.white
                            }
                            name={
                              isConnected
                                ? 'chatbubble-ellipses'
                                : isPending
                                ? 'time-outline'
                                : isIncoming
                                ? 'checkmark-circle'
                                : 'person-add'
                            }
                            size={14}
                          />
                          <Text
                            style={[
                              styles.connectActionBtnText,
                              isConnected && styles.connectBtnTextConnected,
                              isPending && styles.connectBtnTextPending,
                            ]}>
                            {isConnected
                              ? 'Message'
                              : isPending
                              ? 'Requested'
                              : isIncoming
                              ? 'Accept'
                              : 'Connect'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  headerIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
  },
  addNeighbourHeaderBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#A7F3D0',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addNeighbourHeaderBtnText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentBar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    flexDirection: 'row',
    marginTop: 12,
    padding: 3,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  segmentBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentBtnTextActive: {
    color: colors.primaryDark,
  },
  unreadBadgeMini: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    height: 16,
    justifyContent: 'center',
    marginLeft: 4,
    minWidth: 16,
    paddingHorizontal: 3,
  },
  unreadBadgeMiniText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  incomingBanner: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  incomingBadgeIcon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    marginRight: 8,
    width: 24,
  },
  incomingBannerTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  incomingViewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  incomingRowCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    padding: 10,
  },
  incomingAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  incomingAvatarText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  incomingName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  incomingFlat: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  acceptBtnMini: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  acceptBtnMiniText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bannerConnect: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 12,
  },
  bannerConnectIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  bannerConnectTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
  },
  bannerConnectSub: {
    color: '#166534',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
    marginLeft: 2,
  },
  conversationsList: {
    gap: 8,
  },
  convCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  convAvatarWrap: {
    position: 'relative',
  },
  convAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  convAvatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  convOnlineDot: {
    backgroundColor: '#22C55E',
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    bottom: -1,
    height: 12,
    position: 'absolute',
    right: -1,
    width: 12,
  },
  convInfo: {
    flex: 1,
    marginLeft: 12,
  },
  convTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  flatPill: {
    backgroundColor: '#ECFDF3',
    borderRadius: 6,
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flatPillText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  convTime: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  convLastMessage: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  unreadPill: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
  },
  unreadPillText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyAddBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyAddBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  // Tower Filter
  towerFilterRow: {
    marginBottom: 8,
  },
  towerChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  towerChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  towerChipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  towerChipTextActive: {
    color: colors.white,
  },
  neighbourRowCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  neighbourAvatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40,
  },
  neighbourAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  neighbourInfo: {
    flex: 1,
    marginLeft: 12,
  },
  neighbourName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  flatPillSmall: {
    backgroundColor: '#ECFDF3',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  flatPillSmallText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  towerNameText: {
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 4,
  },
  connectActionBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 4,
    minWidth: 80,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  connectActionBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  connectBtnConnected: {
    backgroundColor: '#ECFDF3',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  connectBtnTextConnected: {
    color: colors.primaryDark,
  },
  connectBtnPending: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
  },
  connectBtnTextPending: {
    color: '#64748B',
  },
  connectBtnIncoming: {
    backgroundColor: '#22C55E',
  },

  // Group Pools Segment
  groupPoolsHero: {
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    padding: 18,
    textAlign: 'center',
  },
  groupPoolsHeroTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  groupPoolsHeroSub: {
    color: '#166534',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  poolCard: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  poolBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  poolBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
  },
  poolSlotsText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  poolTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  poolSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  poolPrice: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  poolOriginalPrice: {
    color: '#94A3B8',
    fontSize: 13,
    marginLeft: 6,
    textDecorationLine: 'line-through',
  },
  poolPerKg: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 6,
  },
  joinPoolButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
  },
  joinPoolButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  // -----------------------
  // CHAT VIEW STYLES
  // -----------------------
  chatHeader: {
    backgroundColor: colors.white,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 10,
  },
  chatHeaderContent: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  chatBackBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  chatHeaderAvatarWrap: {
    marginLeft: 4,
    position: 'relative',
  },
  avatarInitials: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarInitialsText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  onlineDot: {
    backgroundColor: '#22C55E',
    borderColor: colors.white,
    borderRadius: 999,
    borderWidth: 2,
    bottom: -1,
    height: 10,
    position: 'absolute',
    right: -1,
    width: 10,
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatHeaderTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  chatHeaderSubtitle: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '700',
  },
  onlineStatusText: {
    color: '#64748B',
    fontSize: 11,
  },
  headerActionBtn: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  messageFeed: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyFeedIcon: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    marginBottom: 12,
    width: 64,
  },
  emptyFeedTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyFeedSub: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowNeighbour: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  senderAvatarMini: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    marginBottom: 4,
    marginRight: 6,
    width: 24,
  },
  senderAvatarMiniImage: {
    borderRadius: 999,
    height: 24,
    marginBottom: 4,
    marginRight: 6,
    width: 24,
  },
  senderAvatarMiniText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  avatarImgWrap: {
    borderRadius: 999,
    height: 38,
    position: 'relative',
    width: 38,
  },
  avatarImg: {
    borderRadius: 999,
    height: 38,
    width: 38,
  },
  convAvatarImgWrap: {
    borderRadius: 999,
    height: 46,
    position: 'relative',
    width: 46,
  },
  convAvatarImg: {
    borderRadius: 999,
    height: 46,
    width: 46,
  },
  incomingAvatarImg: {
    borderRadius: 999,
    height: 40,
    width: 40,
  },
  neighbourAvatarImgWrap: {
    borderRadius: 999,
    height: 40,
    position: 'relative',
    width: 40,
  },
  neighbourAvatarImg: {
    borderRadius: 999,
    height: 40,
    width: 40,
  },
  msgBubble: {
    borderRadius: 18,
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgBubbleMine: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
  },
  msgBubbleNeighbour: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  senderNameLabel: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextMine: {
    color: colors.white,
  },
  msgTextNeighbour: {
    color: colors.textPrimary,
  },
  msgFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  msgTime: {
    fontSize: 10,
  },
  msgTimeMine: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  msgTimeNeighbour: {
    color: '#94A3B8',
  },

  // Shared Product Card in Bubble
  sharedProductCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  sharedProductHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  sharedProductBadge: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  discountBadgeMini: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    marginLeft: 'auto',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  discountBadgeMiniText: {
    color: '#92400E',
    fontSize: 9,
    fontWeight: '800',
  },
  sharedProductName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  sharedProductSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  sharedProductPriceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    marginTop: 4,
  },
  sharedProductPrice: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  sharedProductUnit: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
  },
  sharedProductOriginalPrice: {
    color: '#94A3B8',
    fontSize: 11,
    marginLeft: 6,
    textDecorationLine: 'line-through',
  },
  sharedProductActions: {
    marginTop: 8,
  },
  splitBtn: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 7,
  },
  splitBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  // Chat Input Bar
  inputWrap: {
    paddingHorizontal: 16,
    position: 'absolute',
    zIndex: 90,
  },
  quickPromptsRow: {
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  quickPromptChip: {
    backgroundColor: colors.white,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickPromptChipText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  inputCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 8,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  attachBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    marginRight: 6,
    width: 34,
  },
  chatTextInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
  },
  sendBtn: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    marginLeft: 6,
    width: 34,
  },

  // Modals
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  addFlatSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 36,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  popupSearchBar: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  popupSearchInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 4,
  },
  productPickerRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  productPickerIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  productPickerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productPickerName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  productPickerSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  productPickerPrice: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  discountPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  discountPillText: {
    color: '#92400E',
    fontSize: 9,
    fontWeight: '800',
  },
  shareActionPill: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#A7F3D0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shareActionPillText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },

  // Custom In-App Toast Styling
  customToastWrap: {
    left: 12,
    position: 'absolute',
    right: 12,
    zIndex: 999999,
  },
  // Shared Split Order in-chat styling
  sharedSplitCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderRadius: 14,
    borderWidth: 1.2,
    marginTop: 8,
    padding: 12,
  },
  sharedSplitHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sharedSplitBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  sharedSplitBadgeText: {
    color: '#0A5C3E',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sharedSplitStatusPill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sharedSplitStatusText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
  },
  sharedSplitTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  sharedSplitSub: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },
  sharedSplitBreakdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 8,
    padding: 8,
  },
  splitUserPortion: {
    flex: 1,
  },
  splitDividerLine: {
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    width: 1,
  },
  splitPortionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  splitPortionVal: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 2,
  },
  sharedSplitActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  splitViewDetailsBtn: {
    alignItems: 'center',
    backgroundColor: '#0A5C3E',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  splitViewDetailsBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  splitCartBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#86EFAC',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  // Split Modal Styles
  splitModalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  splitHeaderIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 8,
    height: 28,
    justifyContent: 'center',
    marginRight: 6,
    width: 28,
  },
  splitModalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  splitModalSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  splitProductCard: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 12,
  },
  splitProductIconWrap: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  splitProductName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  splitProductSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  splitPriceHighlight: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  splitOriginalPrice: {
    color: '#94A3B8',
    fontSize: 12,
    marginLeft: 6,
    textDecorationLine: 'line-through',
  },
  splitSaveBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    marginLeft: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  splitSaveBadgeText: {
    color: '#92400E',
    fontSize: 9,
    fontWeight: '800',
  },
  splitSectionCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  splitSectionTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  splitSectionDesc: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  stepperRow: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperBtn: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepperValue: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  splitBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  avatarDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  breakdownName: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
  },
  breakdownQty: {
    color: colors.textSecondary,
    fontSize: 10.5,
  },
  breakdownCost: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  breakdownTotalRow: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  breakdownTotalLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownTotalVal: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  addShareCartBtn: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    elevation: 4,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  addShareCartBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  proposeSplitBtn: {
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderColor: '#86EFAC',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  proposeSplitBtnText: {
    color: '#0A5C3E',
    fontSize: 13,
    fontWeight: '700',
  },
  splitProcessNoteCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  splitProcessNoteHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  splitProcessNoteIconWrap: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    marginRight: 6,
    width: 24,
  },
  splitProcessNoteTitle: {
    color: '#065F46',
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
  },
  splitProcessBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderRadius: 999,
    borderWidth: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  splitProcessBadgeText: {
    color: '#047857',
    fontSize: 9.5,
    fontWeight: '800',
  },
  splitProcessSteps: {
    gap: 6,
  },
  splitProcessStepItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  splitProcessStepNum: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 999,
    height: 16,
    justifyContent: 'center',
    marginRight: 7,
    marginTop: 1.5,
    width: 16,
  },
  splitProcessStepNumText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  splitProcessStepText: {
    color: '#334155',
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  splitProcessStepBold: {
    color: '#0F172A',
    fontWeight: '700',
  },
});


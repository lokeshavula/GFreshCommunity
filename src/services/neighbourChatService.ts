import { supabase } from '../lib/supabase';
import {
  ChatConversation,
  ChatGroupDealAttachment,
  ChatProductAttachment,
  Neighbour,
  NeighbourChatMessage,
  NeighbourConnectionStatus,
} from '../types/neighbourChat';
import { fetchPopularProducts } from './productService';
import { fetchActiveGroupPools } from './groupBuyingService';
import { Product } from '../types/product';
import { getErrorMessage } from '../utils/errorMessage';

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderFlat?: string;
  receiverId?: string;
  text: string;
  messageType?: 'text' | 'product_share' | 'group_deal_share' | 'split_order';
  product?: ChatProductAttachment;
  groupDeal?: ChatGroupDealAttachment;
  splitOrder?: import('../types/neighbourChat').ChatSplitOrderAttachment;
}

/**
 * Fetch all registered society neighbours from gfm_users table in database
 */
export async function fetchCommunityNeighbours(
  currentUserId: string,
  communityId?: string | null,
): Promise<Neighbour[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from('gfm_users')
      .select('id, full_name, block_number, flat_no, mobile_number, avatar_url, tower, community_id, created_at')
      .neq('id', currentUserId);

    if (communityId) {
      query = query.or(`community_id.eq.${communityId},community_id.is.null`);
    }

    let { data: users, error: userError } = await query;
    if (userError || !users || users.length === 0) {
      // Fallback: fetch all registered residents
      const { data: allUsers } = await supabase
        .from('gfm_users')
        .select('id, full_name, block_number, flat_no, mobile_number, avatar_url, tower, community_id, created_at')
        .neq('id', currentUserId);
      if (allUsers && allUsers.length > 0) {
        users = allUsers;
      }
    }

    // Fetch connections for current user
    const { data: connections } = await supabase
      .from('gfm_neighbour_connections')
      .select('id, user_id_1, user_id_2, status')
      .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);

    const connMap = new Map<string, { id: string; status: NeighbourConnectionStatus; isInitiator: boolean }>();
    if (connections) {
      for (const conn of connections) {
        const otherId = conn.user_id_1 === currentUserId ? conn.user_id_2 : conn.user_id_1;
        const isInitiator = conn.user_id_1 === currentUserId;
        let status: NeighbourConnectionStatus = 'not_connected';

        if (conn.status === 'connected') {
          status = 'connected';
        } else if (conn.status === 'pending') {
          status = isInitiator ? 'pending' : 'incoming';
        }

        connMap.set(otherId, { id: conn.id, status, isInitiator });
      }
    }

    return (users || []).map(u => {
      const connInfo = connMap.get(u.id);
      return {
        id: u.id,
        fullName: u.full_name || 'Resident',
        tower: u.tower || u.block_number || 'Block A',
        flatNumber: u.flat_no || '',
        avatarUrl: u.avatar_url,
        status: connInfo?.status || 'not_connected',
        isOnline: true,
        phone: u.mobile_number,
      };
    });
  } catch (error) {
    console.warn('[neighbourChatService] fetchCommunityNeighbours error:', getErrorMessage(error));
    return [];
  }
}

/**
 * Fetch chat conversations for the current user from database
 */
export async function fetchUserConversations(currentUserId: string): Promise<ChatConversation[]> {
  if (!supabase) return [];

  try {
    // 1. Fetch connected neighbours
    const neighbours = await fetchCommunityNeighbours(currentUserId);
    const connectedNeighbours = neighbours.filter(n => n.status === 'connected');

    // 2. Fetch messages to compute latest preview and unread counts
    const { data: messages, error } = await supabase
      .from('gfm_neighbour_messages')
      .select('conversation_id, sender_id, text, message_type, product_data, is_read, created_at')
      .order('created_at', { ascending: false });

    const lastMsgMap = new Map<string, { text: string; time: string }>();
    const unreadCountMap = new Map<string, number>();

    if (!error && messages) {
      for (const m of messages) {
        if (!lastMsgMap.has(m.conversation_id)) {
          let text = m.text;
          if (m.message_type === 'product_share' && m.product_data?.name) {
            text = `🏷️ Shared deal: ${m.product_data.name}`;
          }
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          lastMsgMap.set(m.conversation_id, { text, time });
        }

        // Count unread messages sent by the other party
        if (m.is_read === false && m.sender_id !== currentUserId) {
          const prev = unreadCountMap.get(m.conversation_id) || 0;
          unreadCountMap.set(m.conversation_id, prev + 1);
        }
      }
    }

    // Direct conversations with connected neighbours
    const directConvs: ChatConversation[] = connectedNeighbours.map(n => {
      const convId = [currentUserId, n.id].sort().join('_');
      const last = lastMsgMap.get(convId);
      return {
        id: convId,
        type: 'direct',
        neighbour: n,
        title: n.fullName,
        subtitle: `Flat ${n.flatNumber}`,
        tower: n.tower,
        lastMessage: last?.text || 'Start conversation with your neighbour',
        lastMessageTime: last?.time || '',
        unreadCount: unreadCountMap.get(convId) || 0,
        isOnline: n.isOnline,
      };
    });

    // Society community group channel
    const societyGroupConv: ChatConversation = {
      id: 'group_society_all',
      type: 'group',
      title: 'Society Fresh Harvest & Orders 🌿',
      subtitle: 'All residents community group',
      tower: 'All Towers',
      lastMessage: lastMsgMap.get('group_society_all')?.text || 'Welcome to the society community order group!',
      lastMessageTime: lastMsgMap.get('group_society_all')?.time || '',
      unreadCount: unreadCountMap.get('group_society_all') || 0,
      membersCount: neighbours.length + 1,
    };

    return [societyGroupConv, ...directConvs];
  } catch (error) {
    console.warn('[neighbourChatService] fetchUserConversations error:', getErrorMessage(error));
    return [];
  }
}

/**
 * Mark messages in a conversation as read for the current user
 */
export async function markConversationAsRead(
  conversationId: string,
  currentUserId: string,
): Promise<void> {
  if (!supabase || !conversationId || !currentUserId) return;

  try {
    await supabase
      .from('gfm_neighbour_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false);
  } catch (error) {
    console.warn('[neighbourChatService] markConversationAsRead error:', getErrorMessage(error));
  }
}

/**
 * Fetch total unread message count and incoming request count for current user
 */
export async function fetchUnreadChatCount(currentUserId: string): Promise<number> {
  if (!supabase || !currentUserId) return 0;

  try {
    // 1. Fetch unread messages sent by others in user's direct conversations
    const { data: unreadMessages, error: msgError } = await supabase
      .from('gfm_neighbour_messages')
      .select('id, conversation_id, sender_id')
      .neq('sender_id', currentUserId)
      .eq('is_read', false);

    let unreadMsgCount = 0;
    if (!msgError && unreadMessages) {
      unreadMsgCount = unreadMessages.filter(
        m => m.conversation_id.includes(currentUserId) || m.conversation_id === 'group_society_all',
      ).length;
    }

    // 2. Fetch pending incoming connection requests for this resident
    const { data: incomingReqs, error: reqError } = await supabase
      .from('gfm_neighbour_connections')
      .select('id')
      .eq('user_id_2', currentUserId)
      .eq('status', 'pending');

    const incomingCount = !reqError && incomingReqs ? incomingReqs.length : 0;

    return unreadMsgCount + incomingCount;
  } catch (error) {
    console.warn('[neighbourChatService] fetchUnreadChatCount error:', getErrorMessage(error));
    return 0;
  }
}

/**
 * Fetch messages for a specific conversation from database
 */
export async function fetchConversationMessages(
  conversationId: string,
  currentUserId: string,
): Promise<NeighbourChatMessage[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('gfm_neighbour_messages')
      .select('id, conversation_id, sender_id, text, message_type, product_data, group_deal_data, created_at, gfm_users:sender_id(full_name, flat_no, avatar_url)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[neighbourChatService] fetchConversationMessages:', error.message);
      return [];
    }

    return (data || []).map((row: any) => {
      const senderUser = Array.isArray(row.gfm_users) ? row.gfm_users[0] : row.gfm_users;
      const isSplitOrder = row.message_type === 'split_order';
      return {
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        senderName: row.sender_id === currentUserId ? 'You' : senderUser?.full_name || 'Neighbour',
        senderFlat: senderUser?.flat_no,
        senderAvatarUrl: senderUser?.avatar_url || null,
        text: row.text,
        timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMine: row.sender_id === currentUserId,
        messageType: row.message_type || 'text',
        product: !isSplitOrder ? row.product_data || undefined : undefined,
        groupDeal: row.group_deal_data || undefined,
        splitOrder: isSplitOrder ? row.product_data || undefined : undefined,
      };
    });
  } catch (error) {
    console.warn('[neighbourChatService] fetchConversationMessages error:', getErrorMessage(error));
    return [];
  }
}

/**
 * Send a message into database
 */
export async function sendChatMessage(payload: SendMessagePayload): Promise<NeighbourChatMessage | null> {
  if (!supabase) return null;

  try {
    const isSplit = payload.messageType === 'split_order';
    const insertRow = {
      conversation_id: payload.conversationId,
      sender_id: payload.senderId,
      receiver_id: payload.receiverId || null,
      text: payload.text,
      message_type: payload.messageType || 'text',
      product_data: isSplit ? payload.splitOrder || null : payload.product || null,
      group_deal_data: payload.groupDeal || null,
    };

    const { data, error } = await supabase
      .from('gfm_neighbour_messages')
      .insert(insertRow)
      .select('id, conversation_id, sender_id, text, message_type, product_data, group_deal_data, created_at')
      .single();

    if (error) {
      console.warn('[neighbourChatService] sendChatMessage error:', error.message);
      return null;
    }

    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderId: data.sender_id,
      senderName: payload.senderName || 'You',
      senderFlat: payload.senderFlat,
      text: data.text,
      timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
      messageType: (data.message_type as any) || 'text',
      product: !isSplit ? data.product_data || undefined : undefined,
      groupDeal: data.group_deal_data || undefined,
      splitOrder: isSplit ? data.product_data || undefined : undefined,
    };
  } catch (error) {
    console.warn('[neighbourChatService] sendChatMessage exception:', getErrorMessage(error));
    return null;
  }
}

/**
 * Send connection request to a neighbour in database
 */
export async function sendNeighbourConnectionRequest(
  currentUserId: string,
  targetUserId: string,
): Promise<{ success: boolean; status: NeighbourConnectionStatus }> {
  if (!supabase) return { success: false, status: 'not_connected' };

  try {
    // Check if an existing connection exists in either orientation
    const { data: existing, error: findError } = await supabase
      .from('gfm_neighbour_connections')
      .select('id, user_id_1, user_id_2, status')
      .or(
        `and(user_id_1.eq.${currentUserId},user_id_2.eq.${targetUserId}),and(user_id_1.eq.${targetUserId},user_id_2.eq.${currentUserId})`,
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === 'connected') {
        return { success: true, status: 'connected' };
      }
      if (existing.user_id_1 === targetUserId && existing.status === 'pending') {
        // Target user had already sent a request to current user -> mutual accept!
        await supabase
          .from('gfm_neighbour_connections')
          .update({ status: 'connected', updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        return { success: true, status: 'connected' };
      }
      return { success: true, status: 'pending' };
    }

    // Insert new request from current user to target user
    const { error } = await supabase.from('gfm_neighbour_connections').insert({
      user_id_1: currentUserId,
      user_id_2: targetUserId,
      status: 'pending',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('[neighbourChatService] sendNeighbourConnectionRequest error:', error.message);
      return { success: false, status: 'not_connected' };
    }

    return { success: true, status: 'pending' };
  } catch (error) {
    console.warn('[neighbourChatService] sendNeighbourConnectionRequest exception:', getErrorMessage(error));
    return { success: false, status: 'not_connected' };
  }
}

/**
 * Accept connection request from a neighbour in database
 */
export async function acceptNeighbourConnection(
  currentUserId: string,
  targetUserId: string,
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('gfm_neighbour_connections')
      .update({ status: 'connected', updated_at: new Date().toISOString() })
      .or(
        `and(user_id_1.eq.${currentUserId},user_id_2.eq.${targetUserId}),and(user_id_1.eq.${targetUserId},user_id_2.eq.${currentUserId})`,
      );

    if (error) {
      console.warn('[neighbourChatService] acceptNeighbourConnection:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[neighbourChatService] acceptNeighbourConnection error:', getErrorMessage(error));
    return false;
  }
}

/**
 * Fetch real dynamic products from database that ADMIN declared available for bulk/split orders
 */
export async function fetchDatabaseShareableProducts(): Promise<ChatProductAttachment[]> {
  try {
    const { fetchAdminDeclaredBulkProducts } = await import('./adminBulkCatalogService');
    const bulkItems = await fetchAdminDeclaredBulkProducts();
    return bulkItems.map(p => {
      const discountPct =
        p.retailPrice > 0 && p.retailPrice > p.wholesalePrice
          ? Math.round(((p.retailPrice - p.wholesalePrice) / p.retailPrice) * 100)
          : 15;
      return {
        id: p.id,
        name: p.name,
        subtitle: p.subtitle || `Admin Bulk Rate · Min ${p.minBulkQty} ${p.unit}`,
        price: p.wholesalePrice,
        unit: p.unit,
        discountPercent: discountPct,
        originalPrice: p.retailPrice,
      };
    });
  } catch {
    return [];
  }
}


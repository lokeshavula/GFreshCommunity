import { supabase } from '../lib/supabase';
import { fetchActiveGroupPools } from './groupBuyingService';
import { ChatSplitOrderAttachment } from '../types/neighbourChat';

export interface AdminBulkOrder {
  id: string;
  conversationId?: string;
  sourceType: 'split_order' | 'group_pool';
  productId: string;
  productName: string;
  productUnit: string;
  unitPrice: number;
  totalQuantity: number;
  totalPrice: number;

  // Primary Initiator / Sender
  senderId: string;
  senderName: string;
  senderFlat?: string;
  senderMobile?: string;
  senderAvatarUrl?: string | null;
  senderShareQty: number;
  senderSharePrice: number;

  // Neighbour / Partner
  receiverId?: string;
  receiverName?: string;
  receiverFlat?: string;
  receiverMobile?: string;
  receiverAvatarUrl?: string | null;
  receiverShareQty: number;
  receiverSharePrice: number;

  status: 'added_to_cart' | 'proposed' | 'confirmed' | 'dispatched' | 'cancelled';
  statusLabel: string;
  createdAt: string;
  timestamp: string;
  rawMessageText?: string;

  // Group buying pool members (if source is pool)
  poolMembers?: {
    userId: string;
    userName: string;
    userFlat?: string;
    quantity: number;
    joinedAt: string;
  }[];
}

export interface AdminBulkSummaryStats {
  totalDeals: number;
  confirmedCount: number;
  proposedCount: number;
  totalUnitsClubbed: number;
  totalWholesaleValue: number;
}

function formatRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}

export async function fetchAdminBulkOrders(): Promise<{
  orders: AdminBulkOrder[];
  stats: AdminBulkSummaryStats;
}> {
  if (!supabase) {
    return {
      orders: [],
      stats: {
        totalDeals: 0,
        confirmedCount: 0,
        proposedCount: 0,
        totalUnitsClubbed: 0,
        totalWholesaleValue: 0,
      },
    };
  }

  try {
    // 1. Fetch all split_order messages from gfm_neighbour_messages
    const { data: messages, error: msgErr } = await supabase
      .from('gfm_neighbour_messages')
      .select('*')
      .eq('message_type', 'split_order')
      .order('created_at', { ascending: false });

    if (msgErr) {
      console.warn('[adminBulkOrderService] fetch messages error:', msgErr.message);
    }

    // 2. Fetch all registered users to enrich flat/contact info
    const { data: users } = await supabase
      .from('gfm_users')
      .select('id, full_name, flat_no, block_number, mobile_number, avatar_url, tower');

    const userMap = new Map<string, any>();
    if (users) {
      users.forEach(u => userMap.set(u.id, u));
    }

    // 3. Fetch connections to resolve receiver user IDs if not in message
    const { data: connections } = await supabase
      .from('gfm_neighbour_connections')
      .select('id, user_id_1, user_id_2');

    const connMap = new Map<string, { u1: string; u2: string }>();
    if (connections) {
      connections.forEach(c => connMap.set(c.id, { u1: c.user_id_1, u2: c.user_id_2 }));
    }

    const bulkList: AdminBulkOrder[] = [];

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const split: ChatSplitOrderAttachment | undefined = msg.product_data;
        if (!split) continue;

        const sender = userMap.get(msg.sender_id);
        let receiverId: string | undefined;

        if (msg.conversation_id && connMap.has(msg.conversation_id)) {
          const conn = connMap.get(msg.conversation_id)!;
          receiverId = conn.u1 === msg.sender_id ? conn.u2 : conn.u1;
        }

        const receiver = receiverId ? userMap.get(receiverId) : undefined;

        const senderFlat =
          split.senderFlat ||
          (sender
            ? `${sender.tower || sender.block_number ? `Tower ${sender.tower || sender.block_number} ` : ''}Flat ${sender.flat_no || ''}`.trim()
            : msg.sender_flat || 'Resident Flat');

        const receiverFlat =
          split.receiverFlat ||
          (receiver
            ? `${receiver.tower || receiver.block_number ? `Tower ${receiver.tower || receiver.block_number} ` : ''}Flat ${receiver.flat_no || ''}`.trim()
            : 'Neighbour Flat');

        const rawStatus = (split.status || 'proposed') as AdminBulkOrder['status'];
        let statusLabel = 'PROPOSED DEAL';
        if (rawStatus === 'added_to_cart') statusLabel = 'CONFIRMED IN BASKET 🛒';
        if (rawStatus === 'confirmed') statusLabel = 'CONFIRMED BULK LOT ✅';
        if (rawStatus === 'dispatched') statusLabel = 'DISPATCHED 🚚';

        bulkList.push({
          id: msg.id,
          conversationId: msg.conversation_id,
          sourceType: 'split_order',
          productId: split.productId,
          productName: split.productName,
          productUnit: split.productUnit || 'units',
          unitPrice: Number(split.unitPrice || 0),
          totalQuantity: Number(split.totalQuantity || (split.myShareQty + split.neighbourShareQty)),
          totalPrice: Number(split.totalPrice || (split.mySharePrice + split.neighbourSharePrice)),

          senderId: msg.sender_id,
          senderName: msg.sender_name || sender?.full_name || 'Resident',
          senderFlat,
          senderMobile: sender?.mobile_number,
          senderAvatarUrl: sender?.avatar_url,
          senderShareQty: Number(split.myShareQty || 1),
          senderSharePrice: Number(split.mySharePrice || 0),

          receiverId,
          receiverName: receiver?.full_name || 'Connected Neighbour',
          receiverFlat,
          receiverMobile: receiver?.mobile_number,
          receiverAvatarUrl: receiver?.avatar_url,
          receiverShareQty: Number(split.neighbourShareQty || 1),
          receiverSharePrice: Number(split.neighbourSharePrice || 0),

          status: rawStatus,
          statusLabel,
          createdAt: msg.created_at,
          timestamp: formatRelativeTime(msg.created_at),
          rawMessageText: msg.text,
        });
      }
    }

    // 4. Also fetch active Group Buying Pools to enrich bulk hub
    try {
      const activePools = await fetchActiveGroupPools();
      for (const pool of activePools) {
        if (pool.members && pool.members.length > 0) {
          const totalUnits = pool.members.reduce((acc, m) => acc + m.quantity, 0);
          const firstMember = pool.members[0];

          bulkList.push({
            id: `pool_${pool.id}`,
            sourceType: 'group_pool',
            productId: pool.id,
            productName: `${pool.emoji || '📦'} ${pool.title}`,
            productUnit: pool.unit || 'units',
            unitPrice: pool.groupPrice,
            totalQuantity: totalUnits,
            totalPrice: totalUnits * pool.groupPrice,

            senderId: firstMember.userId,
            senderName: `${firstMember.userName} & ${pool.members.length - 1} other residents`,
            senderFlat: firstMember.userFlat,
            senderShareQty: firstMember.quantity,
            senderSharePrice: firstMember.quantity * pool.groupPrice,

            receiverShareQty: totalUnits - firstMember.quantity,
            receiverSharePrice: (totalUnits - firstMember.quantity) * pool.groupPrice,

            status: 'confirmed',
            statusLabel: `GROUP POOL (${pool.filledSlots}/${pool.totalSlots} SLOTS)`,
            createdAt: new Date().toISOString(),
            timestamp: 'Active Pool',
            poolMembers: pool.members,
          });
        }
      }
    } catch {
      // optional group pool integration
    }

    // 5. Calculate summary metrics
    const totalDeals = bulkList.length;
    const confirmedCount = bulkList.filter(
      b => b.status === 'added_to_cart' || b.status === 'confirmed' || b.sourceType === 'group_pool',
    ).length;
    const proposedCount = bulkList.filter(b => b.status === 'proposed').length;
    const totalUnitsClubbed = bulkList.reduce((acc, b) => acc + b.totalQuantity, 0);
    const totalWholesaleValue = bulkList.reduce((acc, b) => acc + b.totalPrice, 0);

    return {
      orders: bulkList,
      stats: {
        totalDeals,
        confirmedCount,
        proposedCount,
        totalUnitsClubbed,
        totalWholesaleValue,
      },
    };
  } catch (error: any) {
    console.warn('[adminBulkOrderService] error:', error?.message);
    return {
      orders: [],
      stats: {
        totalDeals: 0,
        confirmedCount: 0,
        proposedCount: 0,
        totalUnitsClubbed: 0,
        totalWholesaleValue: 0,
      },
    };
  }
}

export async function updateAdminBulkOrderStatus(
  messageId: string,
  newStatus: 'confirmed' | 'dispatched' | 'cancelled',
): Promise<boolean> {
  if (!supabase || messageId.startsWith('pool_')) return false;

  try {
    const { data: currentMsg } = await supabase
      .from('gfm_neighbour_messages')
      .select('product_data')
      .eq('id', messageId)
      .maybeSingle();

    if (!currentMsg) return false;

    const updatedProductData = {
      ...(currentMsg.product_data || {}),
      status: newStatus,
    };

    const { error } = await supabase
      .from('gfm_neighbour_messages')
      .update({ product_data: updatedProductData })
      .eq('id', messageId);

    return !error;
  } catch {
    return false;
  }
}

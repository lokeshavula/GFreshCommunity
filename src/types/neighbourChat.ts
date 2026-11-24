import { Product } from './product';

export type NeighbourConnectionStatus = 'connected' | 'pending' | 'incoming' | 'not_connected';

export interface Neighbour {
  id: string;
  fullName: string;
  tower: string; // e.g. "Tower A", "Block B"
  flatNumber: string; // e.g. "A-402", "B-105"
  avatarUrl?: string | null;
  status: NeighbourConnectionStatus;
  isOnline: boolean;
  lastSeen?: string;
  phone?: string;
}

export type MessageType = 'text' | 'product_share' | 'group_deal_share' | 'split_order';

export interface ChatProductAttachment {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  unit: string;
  image?: string;
  discountPercent?: number;
  originalPrice?: number;
}

export interface ChatGroupDealAttachment {
  id: string;
  title: string;
  item: string;
  targetQuantity: string;
  groupPrice: number;
  originalPrice: number;
  currentJoined: number;
  maxSlots: number;
  discountBadge: string;
}

export interface ChatSplitOrderAttachment {
  id: string;
  productId: string;
  productName: string;
  productUnit: string;
  unitPrice: number;
  totalQuantity: number;
  totalPrice: number;
  myShareQty: number;
  mySharePrice: number;
  neighbourShareQty: number;
  neighbourSharePrice: number;
  senderFlat?: string;
  receiverFlat?: string;
  status: 'proposed' | 'accepted' | 'added_to_cart';
}

export interface NeighbourChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderFlat?: string;
  senderAvatarUrl?: string | null;
  text: string;
  timestamp: string;
  isMine: boolean;
  messageType: MessageType;
  product?: ChatProductAttachment;
  groupDeal?: ChatGroupDealAttachment;
  splitOrder?: ChatSplitOrderAttachment;
}

export interface ChatConversation {
  id: string;
  type: 'direct' | 'group';
  neighbour?: Neighbour;
  title: string;
  subtitle?: string;
  tower?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
  membersCount?: number;
}

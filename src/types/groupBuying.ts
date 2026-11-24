export type GroupPoolStatus = 'active' | 'locked' | 'dispatched' | 'completed';

export interface GroupBuyingMember {
  userId: string;
  userName: string;
  userFlat?: string;
  quantity: number;
  joinedAt: string;
}

export interface GroupBuyingPool {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  imageUrl?: string | null;
  unit: string; // e.g. "5kg Box", "10kg Bag", "2kg Crate"
  originalPrice: number; // e.g. 650
  groupPrice: number; // e.g. 450
  totalSlots: number; // e.g. 20
  filledSlots: number; // e.g. 16
  minOrderQty: number; // 1
  maxOrderQtyPerUser: number; // e.g. 4
  status: GroupPoolStatus;
  targetDeliveryDate: string;
  closesAtLabel: string; // e.g. "Today 9:00 PM"
  members: GroupBuyingMember[];
  userJoinedQuantity: number; // 0 if user hasn't joined
}

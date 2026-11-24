export type AccountStatus =
  | 'REGISTERED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'DEACTIVATED';

export type GfmCommunity = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

export type GfmCommunityRow = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
  created_at: string;
};

export type HouseholdStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type GfmHouseholdRow = {
  id: string;
  community_id: string | null;
  tower: string;
  flat_number: string;
  primary_user_id: string | null;
  status: HouseholdStatus;
  created_at: string;
  updated_at: string;
};

export type GfmHousehold = {
  id: string;
  communityId: string | null;
  communityName?: string | null;
  tower: string;
  flatNumber: string;
  primaryUserId: string | null;
  primaryUserName?: string | null;
  primaryUserMobile?: string | null;
  primaryUserEmail?: string | null;
  status: HouseholdStatus;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdResolveResult = {
  household: GfmHousehold;
  created: boolean;
  existingPrimaryName?: string | null;
};

export type UpdateHouseholdInput = {
  tower?: string;
  flatNumber?: string;
  communityId?: string | null;
  status?: HouseholdStatus;
  primaryUserId?: string | null;
};

export type HouseholdMemberRole = 'PRIMARY' | 'ADULT' | 'CHILD';

export type HouseholdMemberStatus = 'ACTIVE' | 'REMOVED';

export type GfmHouseholdMemberRow = {
  id: string;
  household_id: string;
  user_id?: string | null;
  display_name: string;
  mobile_number?: string | null;
  role: HouseholdMemberRole;
  can_order: boolean;
  can_manage_members: boolean;
  status: HouseholdMemberStatus;
  added_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type GfmHouseholdMember = {
  id: string;
  householdId: string;
  userId?: string | null;
  displayName: string;
  mobileNumber?: string | null;
  role: HouseholdMemberRole;
  canOrder: boolean;
  canManageMembers: boolean;
  status: HouseholdMemberStatus;
  addedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AddHouseholdMemberByMobileInput = {
  householdId: string;
  mobileNumber: string;
  role: Exclude<HouseholdMemberRole, 'PRIMARY'>;
  addedByUserId?: string | null;
};

export type AddHouseholdChildMemberInput = {
  householdId: string;
  displayName: string;
  canOrder?: boolean;
  addedByUserId?: string | null;
};

export type UpdateHouseholdMemberInput = {
  role?: HouseholdMemberRole;
  canOrder?: boolean;
  canManageMembers?: boolean;
  displayName?: string;
};

export type GfmUserRow = {
  id: string;
  full_name: string;
  mobile_number: string;
  block_number: string;
  flat_no: string;
  password: string;
  avatar_url?: string | null;
  is_admin?: boolean;
  email?: string | null;
  community_id?: string | null;
  household_id?: string | null;
  tower?: string | null;
  account_status?: AccountStatus;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  created_at: string;
};

export type GfmUser = {
  id: string;
  fullName: string;
  mobileNumber: string;
  blockNumber: string;
  flatNo: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  email?: string | null;
  communityId?: string | null;
  communityName?: string | null;
  tower?: string | null;
  householdId?: string | null;
  household?: GfmHousehold | null;
  householdMember?: GfmHouseholdMember | null;
  accountStatus: AccountStatus;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  createdAt?: string;
};

export type AdminUser = {
  id: string;
  fullName: string;
  mobileNumber: string;
};

export type GfmOrderItem = {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  unit?: string;
  quantity: number;
  image?: string;
};

export type GfmOrderRow = {
  id: string;
  order_id: string;
  user_id: string;
  customer_name: string;
  mobile_number: string;
  block_number: string;
  flat_no: string;
  items: GfmOrderItem[];
  delivery_slot: string;
  delivery_time: string;
  instructions: string;
  ordered_at: string;
  status: string;
  status_updated_at: string;
};

export type GfmOrder = {
  id: string;
  orderId: string;
  userId: string;
  customerName: string;
  mobileNumber: string;
  blockNumber: string;
  flatNo: string;
  items: GfmOrderItem[];
  deliverySlot: string;
  deliveryTime: string;
  instructions: string;
  orderedAt: string;
  status: string;
  statusUpdatedAt: string;
};

export type CreateOrderInput = {
  items: GfmOrderItem[];
  deliverySlot: string;
  deliveryTime: string;
  instructions?: string;
};

export type RegisterUserInput = {
  fullName: string;
  mobileNumber: string;
  email?: string;
  communityId: string;
  tower: string;
  blockNumber: string;
  flatNo: string;
  password: string;
};

export type PendingUserRow = GfmUser & {
  createdAt: string;
  communityName?: string | null;
};

export type ApprovalAction = 'APPROVE' | 'REJECT' | 'REQUEST_INFO';

export type DeliveryType = 'ON_DEMAND' | 'WEEKLY' | 'MONTHLY';

export type DeliverySlotPreference = 'MORNING' | 'EVENING';

export type DeliveryScheduleStatus = 'ACTIVE' | 'PAUSED';

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type GfmDeliveryScheduleRow = {
  id: string;
  user_id: string;
  household_id?: string | null;
  delivery_type: DeliveryType;
  preferred_weekday?: Weekday | null;
  preferred_month_day?: number | null;
  preferred_slot: DeliverySlotPreference;
  notes?: string | null;
  status: DeliveryScheduleStatus;
  created_at: string;
  updated_at: string;
};

export type GfmDeliverySchedule = {
  id: string;
  userId: string;
  householdId?: string | null;
  deliveryType: DeliveryType;
  preferredWeekday?: Weekday | null;
  preferredMonthDay?: number | null;
  preferredSlot: DeliverySlotPreference;
  notes?: string | null;
  status: DeliveryScheduleStatus;
  createdAt: string;
  updatedAt: string;
};

export type UpsertDeliveryScheduleInput = {
  userId: string;
  householdId?: string | null;
  deliveryType: DeliveryType;
  preferredWeekday?: Weekday | null;
  preferredMonthDay?: number | null;
  preferredSlot: DeliverySlotPreference;
  notes?: string | null;
  status: DeliveryScheduleStatus;
};

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'packing'
  | 'ready'
  | 'arriving'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

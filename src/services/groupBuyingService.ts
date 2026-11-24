import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './userService';
import { GroupBuyingPool, GroupBuyingMember } from '../types/groupBuying';

const STORAGE_KEYS = {
  USER_JOINS: 'gfm_group_buying_user_joins_cache',
};

const DEFAULT_GROUP_POOLS: GroupBuyingPool[] = [
  {
    id: 'pool_mangoes_5kg',
    title: 'Alphonso Mangoes Crate',
    subtitle: 'Ratnagiri Farm Direct Grade-A',
    emoji: '🥭',
    unit: '5kg Crate',
    originalPrice: 850,
    groupPrice: 599,
    totalSlots: 20,
    filledSlots: 14,
    minOrderQty: 1,
    maxOrderQtyPerUser: 4,
    status: 'active',
    targetDeliveryDate: 'Tomorrow, 7:00 AM',
    closesAtLabel: 'Tonight 9:00 PM',
    members: [
      { userId: 'u1', userName: 'Priya Sharma', userFlat: 'Tower A-402', quantity: 2, joinedAt: '2h ago' },
      { userId: 'u2', userName: 'Rajesh Verma', userFlat: 'Tower B-701', quantity: 3, joinedAt: '1h ago' },
      { userId: 'u3', userName: 'Ananya Iyer', userFlat: 'Tower C-104', quantity: 1, joinedAt: '30m ago' },
    ],
    userJoinedQuantity: 0,
  },
  {
    id: 'pool_coconuts_6pack',
    title: 'Tender Coconut 6-Pack',
    subtitle: 'Pollachi Sweet Water Coconuts',
    emoji: '🥥',
    unit: '6 Pieces',
    originalPrice: 360,
    groupPrice: 240,
    totalSlots: 15,
    filledSlots: 11,
    minOrderQty: 1,
    maxOrderQtyPerUser: 3,
    status: 'active',
    targetDeliveryDate: 'Tomorrow, 7:00 AM',
    closesAtLabel: 'Tonight 9:00 PM',
    members: [
      { userId: 'u4', userName: 'Vikram Mehta', userFlat: 'Tower D-302', quantity: 2, joinedAt: '3h ago' },
      { userId: 'u5', userName: 'Sneha Reddy', userFlat: 'Tower A-1004', quantity: 2, joinedAt: '2h ago' },
    ],
    userJoinedQuantity: 0,
  },
  {
    id: 'pool_onions_10kg',
    title: 'Nasik Red Onions Sack',
    subtitle: 'Fresh Harvest Grade-1 Red Onions',
    emoji: '🧅',
    unit: '10kg Sack',
    originalPrice: 420,
    groupPrice: 290,
    totalSlots: 25,
    filledSlots: 19,
    minOrderQty: 1,
    maxOrderQtyPerUser: 3,
    status: 'active',
    targetDeliveryDate: 'Tomorrow, 7:00 AM',
    closesAtLabel: 'Tonight 9:00 PM',
    members: [
      { userId: 'u6', userName: 'Amit Patel', userFlat: 'Tower B-201', quantity: 2, joinedAt: '4h ago' },
      { userId: 'u7', userName: 'Kavita Rao', userFlat: 'Tower C-805', quantity: 1, joinedAt: '1h ago' },
    ],
    userJoinedQuantity: 0,
  },
  {
    id: 'pool_apples_5kg',
    title: 'Himachal Royal Apple Box',
    subtitle: 'Shimla Orchard Crisp Apples',
    emoji: '🍎',
    unit: '5kg Box',
    originalPrice: 950,
    groupPrice: 680,
    totalSlots: 15,
    filledSlots: 15,
    minOrderQty: 1,
    maxOrderQtyPerUser: 3,
    status: 'locked',
    targetDeliveryDate: 'Tomorrow, 7:00 AM',
    closesAtLabel: 'Slots Full',
    members: [
      { userId: 'u8', userName: 'Deepak Joshi', userFlat: 'Tower A-602', quantity: 2, joinedAt: '5h ago' },
      { userId: 'u9', userName: 'Sunita Das', userFlat: 'Tower B-1102', quantity: 2, joinedAt: '3h ago' },
    ],
    userJoinedQuantity: 0,
  },
];

function toDbRow(pool: GroupBuyingPool) {
  return {
    id: pool.id,
    title: pool.title,
    subtitle: pool.subtitle,
    emoji: pool.emoji,
    unit: pool.unit,
    original_price: pool.originalPrice,
    group_price: pool.groupPrice,
    total_slots: pool.totalSlots,
    filled_slots: pool.filledSlots,
    min_order_qty: pool.minOrderQty,
    max_order_qty: pool.maxOrderQtyPerUser,
    status: pool.status,
    target_delivery_date: pool.targetDeliveryDate,
    closes_at_label: pool.closesAtLabel,
    members: pool.members,
  };
}

async function getUserJoins(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_JOINS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {};
}

async function saveUserJoin(poolId: string, qty: number): Promise<void> {
  try {
    const map = await getUserJoins();
    if (qty > 0) {
      map[poolId] = qty;
    } else {
      delete map[poolId];
    }
    await AsyncStorage.setItem(STORAGE_KEYS.USER_JOINS, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Fetch all active community group pools from database or default active deals
 */
export async function fetchActiveGroupPools(): Promise<GroupBuyingPool[]> {
  const userJoins = await getUserJoins();

  if (supabase) {
    try {
      const { data: dbPools, error } = await supabase
        .from('gfm_group_buying_pools')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && dbPools && dbPools.length > 0) {
        return dbPools.map((row: any) => {
          const userQty = userJoins[row.id] || 0;
          const filledSlots = Number(row.filled_slots || 0);
          const totalSlots = Number(row.total_slots || 10);
          const isLocked = filledSlots >= totalSlots;

          return {
            id: row.id,
            title: row.title || 'Group Buying Deal',
            subtitle: row.subtitle || '',
            emoji: row.emoji || '📦',
            unit: row.unit || 'pack',
            originalPrice: Number(row.original_price || 0),
            groupPrice: Number(row.group_price || row.price || 0),
            totalSlots,
            filledSlots,
            minOrderQty: Number(row.min_order_qty || 1),
            maxOrderQtyPerUser: Number(row.max_order_qty || 5),
            status: isLocked ? 'locked' : (row.status || 'active'),
            targetDeliveryDate: row.target_delivery_date || 'Upcoming Delivery',
            closesAtLabel: row.closes_at_label || 'Limited Community Slots',
            members: Array.isArray(row.members) ? row.members : [],
            userJoinedQuantity: userQty,
          };
        });
      }

      // If database returned 0 rows, try inserting default pools into database
      if (!error && (!dbPools || dbPools.length === 0)) {
        try {
          const rowsToInsert = DEFAULT_GROUP_POOLS.map(toDbRow);
          await supabase.from('gfm_group_buying_pools').insert(rowsToInsert);
        } catch {
          // ignore seeding error
        }
      }
    } catch (error) {
      console.warn('[groupBuyingService] fetchActiveGroupPools DB error:', error);
    }
  }

  // Fallback to active community pools if Supabase is offline or empty
  return DEFAULT_GROUP_POOLS.map(pool => ({
    ...pool,
    userJoinedQuantity: userJoins[pool.id] || 0,
  }));
}

/**
 * Join or update quantity in a group buying pool
 */
export async function joinGroupPool(
  poolId: string,
  quantity: number,
): Promise<GroupBuyingPool> {
  const user = await getCurrentUser();
  const userJoins = await getUserJoins();
  const prevUserQty = userJoins[poolId] || 0;

  let poolRow: any = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('gfm_group_buying_pools')
        .select('*')
        .eq('id', poolId)
        .maybeSingle();

      if (!error && data) {
        poolRow = data;
      }
    } catch {
      // ignore
    }
  }

  const fallback = DEFAULT_GROUP_POOLS.find(p => p.id === poolId) || DEFAULT_GROUP_POOLS[0];
  const totalSlots = Number(poolRow?.total_slots ?? fallback.totalSlots);
  const currentFilled = Number(poolRow?.filled_slots ?? fallback.filledSlots);
  const remainingSlotsBeforeUser = totalSlots - (currentFilled - prevUserQty);

  if (quantity > remainingSlotsBeforeUser) {
    throw new Error(`Only ${remainingSlotsBeforeUser} slots remaining in this pool.`);
  }

  const qtyDifference = quantity - prevUserQty;
  const newFilledSlots = Math.min(totalSlots, Math.max(0, currentFilled + qtyDifference));

  const rawMembers = poolRow ? (Array.isArray(poolRow.members) ? poolRow.members : []) : fallback.members;
  const updatedMembers: GroupBuyingMember[] = [...rawMembers];
  const memberIdx = updatedMembers.findIndex(m => m.userId === (user?.id || 'current_user'));

  if (quantity > 0) {
    const memberObj: GroupBuyingMember = {
      userId: user?.id || 'current_user',
      userName: user?.fullName || 'Resident',
      userFlat: user?.blockNumber ? `Tower ${user.blockNumber} ${user.flatNo || ''}`.trim() : 'Apartment',
      quantity,
      joinedAt: 'Just now',
    };

    if (memberIdx >= 0) {
      updatedMembers[memberIdx] = memberObj;
    } else {
      updatedMembers.unshift(memberObj);
    }
  } else if (memberIdx >= 0) {
    updatedMembers.splice(memberIdx, 1);
  }

  const newStatus = newFilledSlots >= totalSlots ? 'locked' : 'active';

  if (supabase && poolRow) {
    try {
      await supabase
        .from('gfm_group_buying_pools')
        .update({
          filled_slots: newFilledSlots,
          status: newStatus,
          members: updatedMembers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolId);
    } catch (err) {
      console.warn('[groupBuyingService] join update DB error:', err);
    }
  }

  await saveUserJoin(poolId, quantity);

  return {
    id: poolId,
    title: poolRow?.title || fallback.title,
    subtitle: poolRow?.subtitle || fallback.subtitle,
    emoji: poolRow?.emoji || fallback.emoji,
    unit: poolRow?.unit || fallback.unit,
    originalPrice: Number(poolRow?.original_price ?? fallback.originalPrice),
    groupPrice: Number(poolRow?.group_price ?? fallback.groupPrice),
    totalSlots,
    filledSlots: newFilledSlots,
    minOrderQty: Number(poolRow?.min_order_qty ?? fallback.minOrderQty),
    maxOrderQtyPerUser: Number(poolRow?.max_order_qty ?? fallback.maxOrderQtyPerUser),
    status: newStatus,
    targetDeliveryDate: poolRow?.target_delivery_date || fallback.targetDeliveryDate,
    closesAtLabel: poolRow?.closes_at_label || fallback.closesAtLabel,
    members: updatedMembers,
    userJoinedQuantity: quantity,
  };
}

/**
 * Leave a group pool
 */
export async function leaveGroupPool(poolId: string): Promise<GroupBuyingPool> {
  return joinGroupPool(poolId, 0);
}


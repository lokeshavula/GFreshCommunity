import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './userService';
import {
  DemandItemStatus,
  DemandPollItem,
  DemandPollSummary,
  DemandSuggestion,
  DemandVote,
} from '../types/demandPoll';

const STORAGE_KEYS = {
  POLL_ITEMS: 'gfm_demand_poll_items_cache',
  USER_VOTES: 'gfm_demand_user_votes_cache',
  SUGGESTIONS: 'gfm_demand_suggestions_cache',
};

function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

function formatTargetDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
  const dayNum = d.getDate();
  const monthName = d.toLocaleDateString('en-IN', { month: 'short' });
  return `Tomorrow, ${dayNum} ${monthName} (${dayName})`;
}

const DEFAULT_STARTER_ITEMS: DemandPollItem[] = [
  {
    id: 'starter-1',
    title: 'Mangoes (Banganapalli)',
    subtitle: 'Farm-fresh sweet harvest directly from orchards',
    emoji: '🥭',
    category: 'fruits',
    targetDate: getTomorrowDateString(),
    voteCount: 45,
    status: 'active',
    estimatedPrice: 120,
    unit: 'kg',
    orderTargetQty: '80 kg',
  },
  {
    id: 'starter-2',
    title: 'Avocado (Hass Fresh)',
    subtitle: 'Creamy high-grade Hass avocados',
    emoji: '🥑',
    category: 'fruits',
    targetDate: getTomorrowDateString(),
    voteCount: 38,
    status: 'active',
    estimatedPrice: 90,
    unit: 'piece',
    orderTargetQty: '40 pcs',
  },
  {
    id: 'starter-3',
    title: 'Fresh Fish (Seer / Vanjaram)',
    subtitle: 'Morning sea catch • Sliced & cleaned fresh',
    emoji: '🐟',
    category: 'seafood',
    targetDate: getTomorrowDateString(),
    voteCount: 72,
    status: 'active',
    estimatedPrice: 450,
    unit: 'kg',
    orderTargetQty: '35 kg',
  },
  {
    id: 'starter-4',
    title: 'Fresh Tiger Prawns',
    subtitle: 'Ocean fresh catch • Deveined & packed',
    emoji: '🦐',
    category: 'seafood',
    targetDate: getTomorrowDateString(),
    voteCount: 95,
    status: 'active',
    estimatedPrice: 380,
    unit: '500g',
    orderTargetQty: '50 packs',
  },
];

async function getLocalPollItems(): Promise<DemandPollItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.POLL_ITEMS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return DEFAULT_STARTER_ITEMS;
}

async function saveLocalPollItems(items: DemandPollItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.POLL_ITEMS, JSON.stringify(items));
  } catch {
    // ignore
  }
}

async function getLocalUserVotes(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_VOTES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {};
}

async function saveLocalUserVote(targetDate: string, pollItemId: string | null): Promise<void> {
  try {
    const votes = await getLocalUserVotes();
    if (pollItemId) {
      votes[targetDate] = pollItemId;
    } else {
      delete votes[targetDate];
    }
    await AsyncStorage.setItem(STORAGE_KEYS.USER_VOTES, JSON.stringify(votes));
  } catch {
    // ignore
  }
}

/**
 * Fetch the active demand poll for tomorrow (or specified date)
 */
export async function fetchActiveDemandPoll(date?: string): Promise<DemandPollSummary> {
  const targetDate = date || getTomorrowDateString();
  const user = await getCurrentUser();
  const userId = user?.id;

  let items: DemandPollItem[] = [];
  let userVotedItemId: string | null = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('gfm_demand_polls')
        .select('*')
        .eq('target_date', targetDate)
        .order('vote_count', { ascending: false });

      if (!error && data && data.length > 0) {
        items = data.map(row => ({
          id: row.id,
          title: row.title,
          subtitle: row.subtitle,
          emoji: row.emoji || '📦',
          category: row.category || 'fruits',
          imageUrl: row.image_url,
          targetDate: row.target_date,
          voteCount: Number(row.vote_count) || 0,
          status: (row.status as DemandItemStatus) || 'active',
          estimatedPrice: row.estimated_price ? Number(row.estimated_price) : undefined,
          unit: row.unit || 'kg',
          orderTargetQty: row.order_target_qty,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }

      if (userId) {
        const { data: voteData } = await supabase
          .from('gfm_demand_votes')
          .select('poll_item_id')
          .eq('user_id', userId)
          .eq('target_date', targetDate)
          .maybeSingle();

        if (voteData) {
          userVotedItemId = voteData.poll_item_id;
        }
      }
    } catch (err) {
      console.warn('[demandPollService] Supabase load fallback:', err);
    }
  }

  // Fallback to local items if remote table empty
  if (items.length === 0) {
    items = await getLocalPollItems();
    // Update target dates to match current tomorrow
    items = items.map(item => ({ ...item, targetDate }));
  }

  if (!userVotedItemId) {
    const localVotes = await getLocalUserVotes();
    userVotedItemId = localVotes[targetDate] || null;
  }

  // Map hasUserVoted
  items = items.map(item => ({
    ...item,
    hasUserVoted: item.id === userVotedItemId,
  }));

  const totalVotes = items.reduce((sum, it) => sum + it.voteCount, 0);

  return {
    items,
    totalVotes,
    userVotedItemId,
    targetDate,
    targetDateLabel: formatTargetDateLabel(targetDate),
    cutoffTimeLabel: '10:00 PM Tonight',
    isPollClosed: false,
  };
}

/**
 * Cast or switch a user's vote for tomorrow's item
 */
export async function castDemandVote(pollItemId: string): Promise<DemandPollSummary> {
  const summary = await fetchActiveDemandPoll();
  const targetDate = summary.targetDate;
  const user = await getCurrentUser();
  const userId = user?.id || 'anonymous_user';

  const prevVotedItemId = summary.userVotedItemId;
  const isRevotingSame = prevVotedItemId === pollItemId;

  let newVotedItemId: string | null = null;
  let updatedItems = summary.items.map(it => ({ ...it }));

  if (isRevotingSame) {
    // Unvote
    newVotedItemId = null;
    updatedItems = updatedItems.map(it =>
      it.id === pollItemId ? { ...it, voteCount: Math.max(0, it.voteCount - 1) } : it,
    );
  } else {
    // Switch vote or new vote
    newVotedItemId = pollItemId;
    updatedItems = updatedItems.map(it => {
      if (it.id === pollItemId) {
        return { ...it, voteCount: it.voteCount + 1 };
      }
      if (it.id === prevVotedItemId) {
        return { ...it, voteCount: Math.max(0, it.voteCount - 1) };
      }
      return it;
    });
  }

  // Sort by vote count descending
  updatedItems.sort((a, b) => b.voteCount - a.voteCount);

  // Save to local cache
  await saveLocalPollItems(updatedItems);
  await saveLocalUserVote(targetDate, newVotedItemId);

  // Remote Supabase sync
  const client = supabase;
  if (client && user) {
    try {
      if (prevVotedItemId) {
        const prevItem = updatedItems.find(i => i.id === prevVotedItemId);
        if (prevItem) {
          await client.from('gfm_demand_polls').update({ vote_count: prevItem.voteCount }).eq('id', prevVotedItemId);
        }
      }

      if (newVotedItemId) {
        const newItem = updatedItems.find(i => i.id === newVotedItemId);
        if (newItem) {
          await client.from('gfm_demand_polls').update({ vote_count: newItem.voteCount }).eq('id', newVotedItemId);
        }

        // Insert or upsert vote row
        await client.from('gfm_demand_votes').upsert(
          {
            user_id: user.id,
            poll_item_id: newVotedItemId,
            target_date: targetDate,
          },
          { onConflict: 'user_id,target_date' },
        );
      } else if (prevVotedItemId) {
        // Delete vote row
        await client
          .from('gfm_demand_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('target_date', targetDate);
      }
    } catch (err) {
      console.warn('[demandPollService] Remote vote sync fallback:', err);
    }
  }

  const finalItems = updatedItems.map(it => ({
    ...it,
    hasUserVoted: it.id === newVotedItemId,
  }));
  const totalVotes = finalItems.reduce((sum, it) => sum + it.voteCount, 0);

  return {
    ...summary,
    items: finalItems,
    totalVotes,
    userVotedItemId: newVotedItemId,
  };
}

/**
 * Submit custom resident request suggestion
 */
export async function submitDemandSuggestion(
  itemTitle: string,
  note?: string,
): Promise<DemandSuggestion> {
  const user = await getCurrentUser();
  const userId = user?.id || 'guest_user';
  const userName = user?.fullName || 'Community Resident';
  const userMobile = user?.mobileNumber || '';

  const newSuggestion: DemandSuggestion = {
    id: 'sug_' + Date.now(),
    userId,
    userName,
    userMobile,
    itemTitle: itemTitle.trim(),
    note: note?.trim(),
    upvotes: 1,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  // Local storage
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
    const list: DemandSuggestion[] = raw ? JSON.parse(raw) : [];
    list.unshift(newSuggestion);
    await AsyncStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(list));
  } catch {
    // ignore
  }

  // Remote Supabase sync
  if (supabase && user) {
    try {
      await supabase.from('gfm_demand_suggestions').insert({
        user_id: user.id,
        user_name: userName,
        user_mobile: userMobile,
        item_title: itemTitle.trim(),
        note: note?.trim() || null,
        upvotes: 1,
        status: 'pending',
      });
    } catch {
      // ignore
    }
  }

  return newSuggestion;
}

/**
 * Fetch resident suggestions for Admin
 */
export async function fetchDemandSuggestions(): Promise<DemandSuggestion[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('gfm_demand_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map(row => ({
          id: row.id,
          userId: row.user_id,
          userName: row.user_name,
          userMobile: row.user_mobile,
          itemTitle: row.item_title,
          note: row.note,
          upvotes: Number(row.upvotes) || 1,
          status: row.status,
          createdAt: row.created_at,
        }));
      }
    } catch {
      // fallback
    }
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  return [
    {
      id: 'mock-sug-1',
      userId: 'u1',
      userName: 'Suresh Kumar (Flat 402)',
      userMobile: '+91 98765 43210',
      itemTitle: 'Fresh Tender Coconuts (Pollachi)',
      note: 'Please bring fresh heavy water coconuts tomorrow morning!',
      upvotes: 8,
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'mock-sug-2',
      userId: 'u2',
      userName: 'Pooja Reddy (Tower B 1201)',
      userMobile: '+91 98765 12345',
      itemTitle: 'Organic Red Dragonfruit',
      note: 'Looking for antioxidant fruits for kids.',
      upvotes: 5,
      status: 'pending',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

/**
 * Admin: Update procurement status of a poll item ('ordered' | 'procured' | 'arrived' | 'active')
 */
export async function updateDemandItemStatus(
  pollItemId: string,
  status: DemandItemStatus,
): Promise<DemandPollItem> {
  const localItems = await getLocalPollItems();
  const updated = localItems.map(it => (it.id === pollItemId ? { ...it, status } : it));
  await saveLocalPollItems(updated);

  if (supabase) {
    try {
      await supabase
        .from('gfm_demand_polls')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', pollItemId);
    } catch {
      // ignore
    }
  }

  const result = updated.find(it => it.id === pollItemId);
  if (!result) throw new Error('Item not found');
  return result;
}

/**
 * Admin: Create or update a demand poll option
 */
export async function createDemandPollItem(item: Partial<DemandPollItem>): Promise<DemandPollItem> {
  const targetDate = item.targetDate || getTomorrowDateString();
  const newItem: DemandPollItem = {
    id: item.id || 'poll_' + Date.now(),
    title: item.title?.trim() || 'New Item',
    subtitle: item.subtitle?.trim() || '',
    emoji: item.emoji || '📦',
    category: item.category || 'fruits',
    targetDate,
    voteCount: item.voteCount ?? 0,
    status: item.status || 'active',
    estimatedPrice: item.estimatedPrice,
    unit: item.unit || 'kg',
    orderTargetQty: item.orderTargetQty || '',
  };

  const localItems = await getLocalPollItems();
  const idx = localItems.findIndex(it => it.id === newItem.id);
  if (idx >= 0) {
    localItems[idx] = newItem;
  } else {
    localItems.push(newItem);
  }
  await saveLocalPollItems(localItems);

  if (supabase) {
    try {
      await supabase.from('gfm_demand_polls').upsert({
        id: newItem.id.startsWith('poll_') ? undefined : newItem.id,
        title: newItem.title,
        subtitle: newItem.subtitle,
        emoji: newItem.emoji,
        category: newItem.category,
        target_date: targetDate,
        vote_count: newItem.voteCount,
        status: newItem.status,
        estimated_price: newItem.estimatedPrice,
        unit: newItem.unit,
        order_target_qty: newItem.orderTargetQty,
      });
    } catch {
      // ignore
    }
  }

  return newItem;
}

/**
 * Admin: Delete a demand poll option
 */
export async function deleteDemandPollItem(pollItemId: string): Promise<void> {
  const localItems = await getLocalPollItems();
  const filtered = localItems.filter(it => it.id !== pollItemId);
  await saveLocalPollItems(filtered);

  if (supabase) {
    try {
      await supabase.from('gfm_demand_polls').delete().eq('id', pollItemId);
    } catch {
      // ignore
    }
  }
}

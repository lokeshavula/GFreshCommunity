export type DemandItemStatus = 'active' | 'ordered' | 'procured' | 'arrived';

export interface DemandPollItem {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  category: string; // 'fruits' | 'vegetables' | 'seafood' | 'meat' | 'staples'
  imageUrl?: string | null;
  targetDate: string; // YYYY-MM-DD
  voteCount: number;
  status: DemandItemStatus;
  estimatedPrice?: number;
  unit?: string;
  orderTargetQty?: string; // e.g. "50 kg" or "30 boxes"
  hasUserVoted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DemandVote {
  id: string;
  pollItemId: string;
  userId: string;
  targetDate: string;
  createdAt: string;
}

export interface DemandSuggestion {
  id: string;
  userId: string;
  userName: string;
  userMobile?: string;
  itemTitle: string;
  note?: string;
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface DemandPollSummary {
  items: DemandPollItem[];
  totalVotes: number;
  userVotedItemId: string | null;
  targetDate: string;
  targetDateLabel: string; // e.g. "Tomorrow, 3 Sep"
  cutoffTimeLabel: string; // e.g. "10:00 PM Tonight"
  isPollClosed: boolean;
}

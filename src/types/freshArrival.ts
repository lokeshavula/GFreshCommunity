export type FreshArrivalItem = {
  id: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  categoryEmoji: string;
  imageUrl: string;
  price?: number;
  unit?: string;
  productId?: string | null;
  stockQuantityLabel?: string | null;
  badgeText?: string;
  arrivedAt: string;
  createdAt: string;
  expiresAt?: string | null;
  isActive: boolean;
};

export type FreshArrivalRow = {
  id: string;
  title: string;
  subtitle: string | null;
  category_tag: string;
  category_emoji: string;
  image_url: string;
  price: number | null;
  unit: string | null;
  product_id: string | null;
  stock_quantity_label: string | null;
  badge_text: string | null;
  arrived_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  created_at: string;
};

export type CreateFreshArrivalInput = {
  title: string;
  subtitle?: string;
  categoryTag: string;
  categoryEmoji: string;
  imageUrl: string;
  price?: number;
  unit?: string;
  productId?: string | null;
  stockQuantityLabel?: string;
  badgeText?: string;
  arrivedAt?: string;
};

export type FreshArrivalPreset = {
  id: string;
  title: string;
  subtitle: string;
  categoryTag: string;
  categoryEmoji: string;
  suggestedPrice: number;
  unit: string;
  badgeText: string;
  stockQuantityLabel: string;
  imageUrl: string;
};

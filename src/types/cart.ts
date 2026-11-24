export type CartItem = {
  id: string;
  productId: string;
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  image: string | number | null;
  quantity: number;
};

export type CartItemRow = {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  image_url: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type AddToCartInput = {
  productId: string;
  name: string;
  subtitle?: string;
  price: number;
  unit?: string;
  image?: string | number | null;
  quantity?: number;
};

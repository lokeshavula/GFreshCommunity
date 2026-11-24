export type FavouriteItem = {
  id: string;
  productId: string;
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  image: string | number | null;
};

export type FavouriteRow = {
  id: string;
  user_id: string;
  product_id: string;
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  image_url: string | null;
  created_at: string;
};

export type FavouriteProductInput = {
  productId: string;
  name: string;
  subtitle?: string;
  price: number;
  unit?: string;
  image?: string | number | null;
};

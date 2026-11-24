export type Product = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  image: string | number | null;
  /** Optional remote gallery (front / side / back). */
  galleryImages?: Array<string | number | null>;
};

export type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
  subtitle: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  image_front_url?: string | null;
  image_side_url?: string | null;
  image_back_url?: string | null;
  category_slug: string | null;
  is_popular: boolean | null;
  is_active: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductImageSet = {
  main: string | null;
  front: string | null;
  side: string | null;
  back: string | null;
};

export type PriceCategorySlug = 'vegetables' | 'fruits';

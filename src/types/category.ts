export type CategoryItem = {
  id: string;
  name: string;
  image: string | number | null;
  price?: number | null;
  parentId?: string | null;
};

export type CategorySection = {
  id: string;
  title: string;
  image?: string | number | null;
  items: CategoryItem[];
};

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  section_id: string | null;
  section_title: string | null;
  parent_id: string | null;
  image_url: string | null;
  price: number | null;
  sort_order: number | null;
};

export type CreateMainSectionInput = {
  name: string;
  imageUrl: string | null;
};

export type CreateCategoryItemInput = {
  parentId: string;
  name: string;
  price: number;
  imageUrl: string | null;
};

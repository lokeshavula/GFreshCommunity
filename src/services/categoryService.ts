import { FALLBACK_CATEGORY_SECTIONS } from '../data/fallbackCategories';
import { supabase } from '../lib/supabase';
import {
  CategoryItem,
  CategoryRow,
  CategorySection,
  CreateCategoryItemInput,
  CreateMainSectionInput,
} from '../types/category';
import { getErrorMessage } from '../utils/errorMessage';
import { resolveImage } from '../utils/localAssets';
import { uniqueSlug } from '../utils/slugify';

function mapRowToItem(row: CategoryRow): CategoryItem {
  return {
    id: row.id,
    name: row.name,
    image: resolveImage(row.image_url),
    price: row.price,
    parentId: row.parent_id,
  };
}

function mapRowToSection(row: CategoryRow): CategorySection {
  return {
    id: row.id,
    title: row.name,
    image: resolveImage(row.image_url),
    items: [],
  };
}

async function fetchAllCategoryRows(): Promise<CategoryRow[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(getErrorMessage(error, 'Failed to load categories.'));
  }

  return (data ?? []) as CategoryRow[];
}

function isMainSection(row: CategoryRow): boolean {
  return row.parent_id == null;
}

function getLocalMainSections(): CategorySection[] {
  return FALLBACK_CATEGORY_SECTIONS.map(section => ({
    ...section,
    items: section.items.map(item => ({ ...item })),
  }));
}

function findLocalSection(sectionId: string): CategorySection | undefined {
  return getLocalMainSections().find(
    section => section.id === sectionId || section.items.some(item => item.id === sectionId),
  );
}

export async function fetchMainSections(): Promise<CategorySection[]> {
  return getLocalMainSections();
}

export function getSectionItemsSync(sectionId: string): CategoryItem[] {
  for (const section of FALLBACK_CATEGORY_SECTIONS) {
    if (section.id === sectionId) {
      return section.items.map(item => ({ ...item }));
    }
    const match = section.items.find(item => item.id === sectionId);
    if (match) {
      return section.items.map(item => ({ ...item }));
    }
  }
  return [];
}

export async function fetchSectionItems(sectionId: string): Promise<CategoryItem[]> {
  return getSectionItemsSync(sectionId);
}

export async function fetchCategorySections(): Promise<CategorySection[]> {
  return getLocalMainSections();
}

export async function fetchAdminCategorySections(): Promise<CategorySection[]> {
  const rows = await fetchAllCategoryRows();
  const mains = rows.filter(isMainSection);

  if (!mains.length) {
    return [];
  }

  return mains.map(main => ({
    ...mapRowToSection(main),
    items: rows.filter(row => row.parent_id === main.id).map(mapRowToItem),
  }));
}

export async function fetchCategoryItems(): Promise<CategoryItem[]> {
  const rows = await fetchAllCategoryRows();
  return rows.map(mapRowToItem);
}

async function getNextSortOrder(parentId: string | null): Promise<number> {
  if (!supabase) {
    return 1;
  }

  let query = supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data } = await query;
  const current = data?.[0]?.sort_order;
  return current != null ? Number(current) + 1 : 1;
}

export async function createMainSection(input: CreateMainSectionInput): Promise<CategoryRow> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const slug = uniqueSlug(input.name);
  const sortOrder = await getNextSortOrder(null);

  const { data, error } = await supabase
    .from('categories')
    .insert({
      slug,
      name: input.name.trim(),
      parent_id: null,
      section_id: slug,
      section_title: input.name.trim(),
      image_url: input.imageUrl,
      price: null,
      sort_order: sortOrder,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Failed to create main section.'));
  }

  return data as CategoryRow;
}

export async function createCategoryItem(input: CreateCategoryItemInput): Promise<CategoryRow> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const localSection = findLocalSection(input.parentId);
  const { data: parent, error: parentError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', input.parentId)
    .is('parent_id', null)
    .maybeSingle();

  const sectionName = parent?.name ?? localSection?.title;
  if (!sectionName) {
    throw new Error('Section not found.');
  }

  if (parentError) {
    throw new Error(getErrorMessage(parentError, 'Failed to load section.'));
  }

  const slug = uniqueSlug(`${sectionName}-${input.name}`);
  const sortOrder = await getNextSortOrder(parent?.id ?? null);

  const { data, error } = await supabase
    .from('categories')
    .insert({
      slug,
      name: input.name.trim(),
      parent_id: parent?.id ?? null,
      section_id: input.parentId,
      section_title: sectionName,
      image_url: input.imageUrl,
      price: input.price,
      sort_order: sortOrder,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'Failed to create category item.'));
  }

  return data as CategoryRow;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase.from('categories').delete().eq('id', categoryId);

  if (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete category.'));
  }
}

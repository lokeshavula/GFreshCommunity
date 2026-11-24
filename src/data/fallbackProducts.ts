import {
  DAIRY_PRODUCTS,
  FRUIT_PRODUCTS,
  VEGETABLE_PRODUCTS,
} from './categoryProducts';
import { Product } from '../types/product';

function byId(list: Product[], id: string): Product {
  const found = list.find(item => item.id === id);
  if (!found) {
    throw new Error(`Missing popular product seed: ${id}`);
  }
  return { ...found };
}

/** Home popular rail — matches quick commerce catalog with vegetables, fruits & dairy */
export const FALLBACK_POPULAR_PRODUCTS: Product[] = [
  byId(VEGETABLE_PRODUCTS, 'veg-tomato'),
  byId(FRUIT_PRODUCTS, 'fruit-watermelon'),
  byId(VEGETABLE_PRODUCTS, 'veg-carrot'),
  byId(FRUIT_PRODUCTS, 'fruit-grapes'),
  byId(FRUIT_PRODUCTS, 'fruit-apple'),
  byId(VEGETABLE_PRODUCTS, 'veg-broccoli'),
  byId(DAIRY_PRODUCTS, 'dairy-paneer'),
  byId(DAIRY_PRODUCTS, 'dairy-milk-toned'),
  byId(DAIRY_PRODUCTS, 'dairy-curd'),
];

export const FALLBACK_PRODUCTS: Product[] = FALLBACK_POPULAR_PRODUCTS;

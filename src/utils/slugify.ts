export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(base: string): string {
  const slug = slugify(base);
  return slug ? `${slug}-${Date.now().toString(36)}` : `category-${Date.now().toString(36)}`;
}

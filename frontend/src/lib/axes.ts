/**
 * The matrix axes, in one place.
 *
 * WHY THIS FILE EXISTS. The App grouped its scenario dropdown into `optgroup` per category and the
 * focus route shipped the same twenty scenarios as one flat ungrouped list, because the ordering and
 * the labels lived inside Tool.tsx where the other surface could not reach them. Two surfaces
 * offering the same one-of-N choice in two different shapes is the drift ADR-0071 clause 7 is about,
 * and the fix is not to copy the maps across, it is to have one.
 *
 * The label map is typed against the order array, so an axis added to the bake without a label here
 * fails the type check rather than rendering its raw repo slug as a group heading in both languages,
 * which is exactly what `campaign` did.
 */

export const CATEGORY_ORDER = [
  'reference',
  'feed',
  'yard',
  'landform',
  'campaign',
  'operations',
  'physics',
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];

export const CATEGORY: Record<Category, { en: string; es: string }> = {
  reference: { en: 'Reference', es: 'Referencia' },
  feed: { en: 'Feed structure', es: 'Estructura de alimentación' },
  yard: { en: 'Yard and routing', es: 'Patio y ruteo' },
  landform: { en: 'Landform', es: 'Relieve' },
  campaign: { en: 'Campaign', es: 'Campaña' },
  operations: { en: 'Operating choices', es: 'Decisiones operativas' },
  physics: { en: 'Physics', es: 'Física' },
};

/** The axis label in one language, falling back to the slug only for a value outside the union. */
export function axisLabel(key: string, lang: 'en' | 'es'): string {
  return (CATEGORY as Record<string, { en: string; es: string }>)[key]?.[lang] ?? key;
}

/** Group a list of scenarios into the axis order, dropping axes the bake did not produce. */
export function byAxis<T extends { category?: string }>(items: T[]): { key: Category; items: T[] }[] {
  return CATEGORY_ORDER.map((key) => ({
    key,
    items: items.filter((s) => (s.category ?? 'physics') === key),
  })).filter((g) => g.items.length > 0);
}

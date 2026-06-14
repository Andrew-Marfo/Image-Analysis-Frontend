import type { FieldValue, ImdbFieldKey, Product } from '../types/imdb';
import { LOW_CONFIDENCE_THRESHOLD } from '../types/imdb';
import { COLUMN_BY_KEY, IMDB_FIELD_KEYS } from './columns';

/**
 * A field is flagged for review when it carries a non-empty, low-confidence
 * value, OR when an expected column came back empty (a likely miss). Manually
 * edited fields are trusted and never flagged.
 */
export function isFlagged(key: ImdbFieldKey, field: FieldValue): boolean {
  if (field.edited) return false;
  const hasValue = field.value.trim().length > 0;
  if (hasValue) return field.confidence <= LOW_CONFIDENCE_THRESHOLD;
  return COLUMN_BY_KEY[key].expected; // expected-but-empty → flag
}

/** Count of flagged fields in a product. */
export function flaggedCount(product: Product): number {
  return IMDB_FIELD_KEYS.reduce(
    (n, key) => n + (isFlagged(key, product.fields[key]) ? 1 : 0),
    0,
  );
}

/** Count of filled (non-empty) fields in a product. */
export function filledCount(product: Product): number {
  return IMDB_FIELD_KEYS.reduce(
    (n, key) => n + (product.fields[key].value.trim() ? 1 : 0),
    0,
  );
}

export interface ConfidenceTone {
  label: string;
  dot: string;
  text: string;
  bg: string;
}

/** Map a 0..1 confidence to a UI tone. */
export function confidenceTone(field: FieldValue): ConfidenceTone {
  if (!field.value.trim()) {
    return { label: 'Empty', dot: 'bg-slate-300', text: 'text-slate-400', bg: '' };
  }
  if (field.edited) {
    return { label: 'Edited', dot: 'bg-brand-500', text: 'text-brand-700', bg: '' };
  }
  if (field.confidence <= LOW_CONFIDENCE_THRESHOLD) {
    return { label: 'Low', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' };
  }
  if (field.confidence < 0.85) {
    return { label: 'Medium', dot: 'bg-sky-400', text: 'text-sky-700', bg: '' };
  }
  return { label: 'High', dot: 'bg-emerald-400', text: 'text-emerald-700', bg: '' };
}

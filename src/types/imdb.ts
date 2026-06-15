/**
 * Core data model for the Image-to-IMDB tool.
 *
 * The IMDB (Item Master Database) record has 13 attributes. The ground-truth
 * Excel file is authoritative for column names and order — see `IMDB_COLUMNS`
 * in `src/lib/columns.ts`, which is the single source of truth for export.
 */

/** Stable internal keys for each of the 13 IMDB attributes. */
export type ImdbFieldKey =
  | 'ITEM_NAME'
  | 'BARCODE'
  | 'MANUFACTURER'
  | 'BRAND'
  | 'WEIGHT'
  | 'PACKAGING_TYPE'
  | 'COUNTRY'
  | 'VARIANT'
  | 'TYPE'
  | 'FRAGRANCE_FLAVOR'
  | 'PROMOTION'
  | 'ADDONS'
  | 'TAGLINE';

/** A single extracted attribute value plus extraction metadata. */
export interface FieldValue {
  /** Current value shown/exported. Empty string means "not confidently known". */
  value: string;
  /** Model confidence in the original extraction, 0..1. */
  confidence: number;
  /** True once a human has manually changed the value. */
  edited: boolean;
}

/** One uploaded image belonging to a product. */
export interface ProductImage {
  id: string;
  fileName: string;
  /** Object URL for in-browser preview (revoked on cleanup). */
  previewUrl: string;
  /** The underlying file, kept for upload to the real backend later. */
  file: File;
  /** Image-tag id parsed from the filename (e.g. "S221234199"), if any. */
  tag?: string;
}

export type ProductStatus = 'pending' | 'extracting' | 'done' | 'error';

/** A product = a group of images (3–4 angles) resolving to one IMDB row. */
export interface Product {
  id: string;
  /** Human-friendly label derived from the image group (e.g. filename prefix). */
  groupKey: string;
  images: ProductImage[];
  fields: Record<ImdbFieldKey, FieldValue>;
  status: ProductStatus;
  /** Error message when status === 'error'. */
  error?: string;
  /** True once the user has reviewed/approved this row. */
  reviewed: boolean;
  /** Backend DB record id (set after successful extraction). */
  recordId?: number;
  /** Backend session id (set after successful extraction). */
  sessionId?: number;
  /** Duplicate candidates detected automatically at upload time. */
  dedupCandidates?: import('../api/client').MergeCandidate[];
}

/** The three steps of the upload → preview/edit → export workflow. */
export type WorkflowStep = 'upload' | 'review' | 'export';

/** Confidence at or below this threshold is flagged for human review. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

/** Build an empty FieldValue. */
export function emptyField(): FieldValue {
  return { value: '', confidence: 0, edited: false };
}

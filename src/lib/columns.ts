import type { ImdbFieldKey } from '../types/imdb';

export interface ColumnDef {
  /** Internal stable key. */
  key: ImdbFieldKey;
  /**
   * Exact header used in CSV/XLSX export. Must match the ground-truth Excel
   * column names. (The ground-truth sheet labels packaging as "PACKAGING TYPE";
   * change `header` here if the official sheet differs — this is the one place.)
   */
  header: string;
  /** Short label for the UI. */
  label: string;
  /** Example value to show as a placeholder hint when editing. */
  example: string;
  /** Whether a value is generally expected (drives "missing" highlighting). */
  expected: boolean;
}

/**
 * The 14 IMDB columns, in the exact order required for submission output.
 * This array is the single source of truth for both the UI grid and export.
 */
export const IMDB_COLUMNS: ColumnDef[] = [
  { key: 'ITEM_NAME',        header: 'ITEM_NAME',        label: 'Item name',         example: 'BLUE BAND 250G PLASTIC TUB SPREAD', expected: true  },
  { key: 'BARCODE',          header: 'BARCODE',          label: 'Barcode',           example: '6034000482027',                    expected: true  },
  { key: 'MANUFACTURER',     header: 'MANUFACTURER',     label: 'Manufacturer',      example: 'UPFIELD',                          expected: true  },
  { key: 'BRAND',            header: 'BRAND',            label: 'Brand',             example: 'BLUE BAND',                        expected: true  },
  { key: 'WEIGHT',           header: 'WEIGHT',           label: 'Weight',            example: '250G',                             expected: true  },
  { key: 'PACKAGING_TYPE',   header: 'PACKAGING TYPE',   label: 'Packaging type',    example: 'TUB',                              expected: true  },
  { key: 'COUNTRY',          header: 'COUNTRY',          label: 'Country',           example: 'GHANA',                            expected: true  },
  { key: 'CATEGORY_TYPE',    header: 'CATEGORY_TYPE',    label: 'Category type',     example: 'Spreads',                          expected: true  },
  { key: 'SEGMENT_TYPE',     header: 'SEGMENT_TYPE',     label: 'Segment type',      example: 'Mainstream',                       expected: false },
  { key: 'VARIANT_TYPE',     header: 'VARIANT_TYPE',     label: 'Variant',           example: 'ORIGINAL',                         expected: false },
  { key: 'FRAGRANCE_FLAVOR', header: 'FRAGRANCE_FLAVOR', label: 'Fragrance / flavor',example: 'RICH',                             expected: false },
  { key: 'PROMOTION',        header: 'PROMOTION',        label: 'Promotion',         example: '50% OFF',                          expected: false },
  { key: 'ADDONS',           header: 'ADDONS',           label: 'Add-ons',           example: 'SPOON INCLUDED',                   expected: false },
  { key: 'TAGLINE',          header: 'TAGLINE',          label: 'Tagline',           example: 'Good food, good life',             expected: false },
];

/** Ordered list of internal field keys. */
export const IMDB_FIELD_KEYS: ImdbFieldKey[] = IMDB_COLUMNS.map((c) => c.key);

/** Lookup a column definition by key. */
export const COLUMN_BY_KEY: Record<ImdbFieldKey, ColumnDef> = Object.fromEntries(
  IMDB_COLUMNS.map((c) => [c.key, c]),
) as Record<ImdbFieldKey, ColumnDef>;

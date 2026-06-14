import type { ImdbFieldKey } from '../types/imdb';
import { IMDB_FIELD_KEYS } from '../lib/columns';
import type { ExtractedField, ExtractionResult, ImageAnalysisApi } from './client';

/**
 * Mock extraction service.
 *
 * Simulates the backend image-analysis pipeline so the full upload → review →
 * export flow is demoable before the real API exists. Results are seeded from
 * the hackathon sample products (keyed by filename prefix) and fall back to a
 * generic, deliberately-imperfect result so the low-confidence review flow and
 * "leave empty when unsure" behaviour are visible in a demo.
 */

type Seed = Partial<Record<ImdbFieldKey, ExtractedField>>;

/** f(value, confidence) helper. */
const f = (value: string, confidence: number): ExtractedField => ({ value, confidence });

/** Seeded results for the provided sample products, keyed by filename prefix. */
const SEEDS: Record<string, Seed> = {
  // MOK Fine Soap — Rose, 100g (pink boxed soap)
  S221234199: {
    ITEM_NAME: f('MOK FINE SOAP 100G ROSE NATURAL AND FRESH', 0.74),
    BARCODE: f('', 0),
    MANUFACTURER: f('', 0.2),
    BRAND: f('MOK', 0.93),
    WEIGHT: f('100G', 0.91),
    PACKAGING_TYPE: f('BOX', 0.66),
    COUNTRY: f('', 0.15),
    VARIANT: f('', 0),
    TYPE: f('SOAP', 0.9),
    FRAGRANCE_FLAVOR: f('ROSE', 0.88),
    PROMOTION: f('', 0),
    ADDONS: f('', 0),
    TAGLINE: f('Natural and fresh douceur', 0.55),
  },
  // Mummy's Kitchen — Stew/Ragout seasoning powder sachet (FAGIP Ventures)
  S221712802: {
    ITEM_NAME: f("MUMMY'S KITCHEN STEW RAGOUT SEASONING POWDER SACHET", 0.71),
    BARCODE: f('', 0),
    MANUFACTURER: f('FAGIP VENTURES', 0.62),
    BRAND: f("MUMMY'S KITCHEN", 0.9),
    WEIGHT: f('', 0.35),
    PACKAGING_TYPE: f('SACHET', 0.94),
    COUNTRY: f('', 0.2),
    VARIANT: f('STEW', 0.7),
    TYPE: f('SEASONING POWDER', 0.86),
    FRAGRANCE_FLAVOR: f('', 0.3),
    PROMOTION: f('', 0),
    ADDONS: f('', 0),
    TAGLINE: f('', 0),
  },
  // Single-image sample — partial extraction
  S222711495: {
    ITEM_NAME: f('', 0.4),
    BARCODE: f('', 0),
    BRAND: f('', 0.45),
    WEIGHT: f('', 0.3),
    PACKAGING_TYPE: f('', 0.5),
    TYPE: f('', 0.4),
  },
};

/** A neutral, low-confidence result for images we have no seed for. */
function genericResult(fileName: string): Seed {
  const stem = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').toUpperCase();
  return {
    ITEM_NAME: f(stem.slice(0, 60), 0.42),
    BRAND: f('', 0.4),
    WEIGHT: f('', 0.35),
    PACKAGING_TYPE: f('', 0.45),
    TYPE: f('', 0.4),
  };
}

/** Fill any missing keys with an empty, zero-confidence field. */
function complete(seed: Seed): ExtractionResult {
  const fields = {} as Record<ImdbFieldKey, ExtractedField>;
  for (const key of IMDB_FIELD_KEYS) {
    fields[key] = seed[key] ?? f('', 0);
  }
  return { fields };
}

/** Derive the seed key from a filename (substring before the first underscore). */
function prefixOf(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  return base.split(/[_-]/)[0] ?? base;
}

/** Simulated network/inference latency. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockExtractionService: ImageAnalysisApi = {
  async extractProduct(images: File[]): Promise<ExtractionResult> {
    await delay(700 + Math.random() * 900);

    const first = images[0]?.name ?? '';
    const seed = SEEDS[prefixOf(first)] ?? genericResult(first);
    return complete(seed);
  },
};

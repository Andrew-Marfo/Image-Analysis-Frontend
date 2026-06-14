import type { ImdbFieldKey } from '../types/imdb';
import { mockExtractionService } from './mockService';

/** Raw value + confidence returned by an extraction backend for one field. */
export interface ExtractedField {
  value: string;
  confidence: number;
}

/** Result of analysing one product's image set. */
export interface ExtractionResult {
  fields: Record<ImdbFieldKey, ExtractedField>;
}

/**
 * The contract the frontend depends on. The mock implements this today; a real
 * HTTP-backed implementation can be dropped in later without touching the UI.
 */
export interface ImageAnalysisApi {
  /**
   * Analyse the images belonging to a single product and return the extracted
   * IMDB attributes. Evidence is aggregated across all images of the product.
   */
  extractProduct(images: File[]): Promise<ExtractionResult>;
}

/**
 * The active API implementation.
 *
 * Swap point: when the teammates' backend is ready, set `VITE_API_BASE_URL`
 * and replace this with the real HTTP client (e.g. `new HttpAnalysisApi(baseUrl)`).
 * Everything in the UI talks only to this `api` object.
 */
export const api: ImageAnalysisApi = mockExtractionService;

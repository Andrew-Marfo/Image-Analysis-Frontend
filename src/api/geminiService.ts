/**
 * Direct Gemini Flash extraction from the browser.
 *
 * Uses the same prompt and response schema as the backend VLM service so
 * extracted fields are consistent regardless of which path is active.
 *
 * Active when VITE_GEMINI_API_KEY is set and VITE_API_BASE_URL is empty.
 */

import type { ImdbFieldKey } from '../types/imdb';
import { IMDB_FIELD_KEYS } from '../lib/columns';
import type { ExtractedField, ExtractionResult, ImageAnalysisApi } from './client';

const GEMINI_API_KEY = ((import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? '').trim();
const GEMINI_MODEL   = ((import.meta.env.VITE_GEMINI_MODEL   as string | undefined) ?? 'gemini-2.0-flash').trim();

export const USE_GEMINI = GEMINI_API_KEY.length > 0;

// ── Prompt (mirrors backend app/services/vlm.py) ─────────────────────────────

const PROMPT = `You are a product-catalog data extractor. Look at the product image and extract
the following attributes from any visible labels, packaging, and logos:

- manufacturer: the company that makes the product (full legal name if shown)
- brand: the brand name shown on the packaging
- weight_raw: the net weight/volume EXACTLY as printed (e.g. "250 g", "1.5L")
- packaging_type: container type (Bottle, Can, Sachet, Box, Pouch, Tub, Glass Jar, etc.)
- country_of_origin: country shown (e.g. "Made in ..."), else null
- variant_type: the product variant (e.g. ORIGINAL, DIET, SALTED, UNSALTED, ZERO)
- fragrance_flavor: the flavour or fragrance (e.g. VANILLA, LEMON, SALTED MARGARINE)
- promotion: any promotional OFFER text (e.g. "20% EXTRA FREE", "BUY 1 GET 1"), else null
- addons: bundled add-ons or free gifts shown on the pack, else null
- tagline: marketing slogan / descriptor (e.g. "SPREAD FOR BREAD", "LOW FAT"), else null
- category_type: high-level product category (e.g. Spreads, Condiments, Beverages)

Rules:
- If a field is not clearly visible, return null for it. Do NOT guess.
- Do NOT attempt to read the barcode number.
- Do NOT compose a full product/item name — only return the individual fields.
- For every field, include a confidence score from 0.0 to 1.0 in the
  "confidence" object keyed by the field name.
Return ONLY structured data matching the provided schema.`;

// ── JSON Schema for structured output ────────────────────────────────────────

const CONF_PROPS = Object.fromEntries(
  ['manufacturer','brand','weight_raw','packaging_type','country_of_origin',
   'variant_type','fragrance_flavor','promotion','addons','tagline','category_type']
  .map(k => [k, { type: 'NUMBER', nullable: true }])
);

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    manufacturer:      { type: 'STRING', nullable: true },
    brand:             { type: 'STRING', nullable: true },
    weight_raw:        { type: 'STRING', nullable: true },
    packaging_type:    { type: 'STRING', nullable: true },
    country_of_origin: { type: 'STRING', nullable: true },
    variant_type:      { type: 'STRING', nullable: true },
    fragrance_flavor:  { type: 'STRING', nullable: true },
    promotion:         { type: 'STRING', nullable: true },
    addons:            { type: 'STRING', nullable: true },
    tagline:           { type: 'STRING', nullable: true },
    category_type:     { type: 'STRING', nullable: true },
    confidence: {
      type: 'OBJECT',
      properties: CONF_PROPS,
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface VLMOutput {
  manufacturer?: string | null;
  brand?: string | null;
  weight_raw?: string | null;
  packaging_type?: string | null;
  country_of_origin?: string | null;
  variant_type?: string | null;
  fragrance_flavor?: string | null;
  promotion?: string | null;
  addons?: string | null;
  tagline?: string | null;
  category_type?: string | null;
  confidence?: Record<string, number | null>;
}

// ── Image → base64 ───────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:<mime>;base64," prefix
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Single-image call ─────────────────────────────────────────────────────────

async function extractOne(file: File): Promise<VLMOutput> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: PROMPT },
      ],
    }],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `Gemini error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(text) as VLMOutput;
}

// ── VLMOutput → ImdbFieldKey map ──────────────────────────────────────────────

function vlmValue(v: VLMOutput, key: ImdbFieldKey): string {
  switch (key) {
    case 'MANUFACTURER':    return v.manufacturer ?? '';
    case 'BRAND':           return v.brand ?? '';
    case 'WEIGHT':          return v.weight_raw ?? '';
    case 'PACKAGING_TYPE':  return v.packaging_type ?? '';
    case 'COUNTRY':         return v.country_of_origin ?? '';
    case 'VARIANT':         return v.variant_type ?? '';
    case 'FRAGRANCE_FLAVOR':return v.fragrance_flavor ?? '';
    case 'PROMOTION':       return v.promotion ?? '';
    case 'ADDONS':          return v.addons ?? '';
    case 'TAGLINE':         return v.tagline ?? '';
    case 'TYPE':            return v.category_type ?? '';
    // VLM does not return these — handled by backend (barcode decoder / name generator)
    case 'ITEM_NAME':
    case 'BARCODE':         return '';
  }
}

const CONF_KEY: Partial<Record<ImdbFieldKey, string>> = {
  MANUFACTURER: 'manufacturer', BRAND: 'brand', WEIGHT: 'weight_raw',
  PACKAGING_TYPE: 'packaging_type', COUNTRY: 'country_of_origin',
  VARIANT: 'variant_type', FRAGRANCE_FLAVOR: 'fragrance_flavor',
  PROMOTION: 'promotion', ADDONS: 'addons', TAGLINE: 'tagline', TYPE: 'category_type',
};

function vlmConfidence(v: VLMOutput, key: ImdbFieldKey): number {
  const ck = CONF_KEY[key];
  if (!ck) return 0;
  const c = v.confidence?.[ck];
  return typeof c === 'number' ? c : (vlmValue(v, key) ? 0.75 : 0);
}

// ── Aggregate N images → best-confidence-per-field ───────────────────────────

function aggregate(outputs: VLMOutput[]): ExtractionResult {
  const empty: ExtractedField = { value: '', confidence: 0 };
  if (!outputs.length) {
    return { fields: Object.fromEntries(IMDB_FIELD_KEYS.map(k => [k, empty])) as Record<ImdbFieldKey, ExtractedField> };
  }
  const fields = {} as Record<ImdbFieldKey, ExtractedField>;
  for (const key of IMDB_FIELD_KEYS) {
    let best = outputs[0];
    let bestConf = vlmConfidence(outputs[0], key);
    for (const o of outputs.slice(1)) {
      const c = vlmConfidence(o, key);
      if (c > bestConf) { best = o; bestConf = c; }
    }
    fields[key] = { value: vlmValue(best, key), confidence: bestConf };
  }
  return { fields };
}

// ── Public service ────────────────────────────────────────────────────────────

export const geminiExtractionService: ImageAnalysisApi = {
  async extractProduct(images: File[]): Promise<ExtractionResult> {
    const outputs = await Promise.all(images.map(extractOne));
    return aggregate(outputs);
  },
};

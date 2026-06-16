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

const PROMPT = `You are a product-catalog data extractor. Look at the product image(s) — including any text tag/label at the bottom of the image — and extract the following attributes from visible labels, packaging, and logos.

Fields to extract:
- manufacturer: full legal company name that makes the product (e.g. UPFIELD, NESTLE, GB FOODS)
- brand: brand name shown on the packaging (e.g. BLUE BAND, MAGGI, POMO)
- weight_raw: net weight or volume EXACTLY as printed including unit (e.g. "250G", "500ML", "1.5 KG")
- packaging_type: physical container — uppercase short form (e.g. TUB, GLASS JAR, SACHET, BOTTLE, CAN, BOX, POUCH, TIN, WRAPPED)
- country_of_origin: country from "Made in ..." — strip the prefix; null if not shown
- category_type: short product type as on a shelf tag — uppercase (e.g. MARGARINE, MAYONNAISE, BUTTER, POWDER, BEVERAGE, DETERGENT, TEABAG, TOMATO MIX, TOMATO PASTE, CHOCOLATE, SOAP)
- segment_type: market segment if clearly shown (e.g. PREMIUM, VALUE, ECONOMY); null if absent
- variant_type: product variant if shown (e.g. ORIGINAL, LOW FAT, SALTED, DIET, ZERO, 3 IN 1); null if absent
- fragrance_flavor: flavor or fragrance if shown (e.g. STRAWBERRY, LEMON, ORANGE, GINGER & GARLIC); null if absent
- promotion: on-pack promotional offer verbatim (e.g. "50% OFF", "BUY 1 GET 1"); null if absent
- addons: bundled add-ons or free gifts on pack (e.g. "SPOON INCLUDED", "5 FREE ENVELOPE"); null if absent
- tagline: marketing slogan or descriptor (e.g. "SPREAD FOR BREAD", "LOW FAT", "CHOLESTEROL FREE"); null if absent

Rules:
- If a field is not clearly visible, return null. Do NOT guess.
- Do NOT read or transcribe the barcode number.
- Do NOT compose a full product/item name — return only the individual fields above.
- For every field include a confidence score from 0.0 to 1.0 in the "confidence" object keyed by the field name.
Return ONLY structured data matching the provided schema.`;

// ── JSON Schema for structured output ────────────────────────────────────────

const CONF_PROPS = Object.fromEntries(
  ['manufacturer','brand','weight_raw','packaging_type','country_of_origin',
   'category_type','segment_type','variant_type','fragrance_flavor','promotion','addons','tagline']
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
    category_type:     { type: 'STRING', nullable: true },
    segment_type:      { type: 'STRING', nullable: true },
    variant_type:      { type: 'STRING', nullable: true },
    fragrance_flavor:  { type: 'STRING', nullable: true },
    promotion:         { type: 'STRING', nullable: true },
    addons:            { type: 'STRING', nullable: true },
    tagline:           { type: 'STRING', nullable: true },
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
  category_type?: string | null;
  segment_type?: string | null;
  variant_type?: string | null;
  fragrance_flavor?: string | null;
  promotion?: string | null;
  addons?: string | null;
  tagline?: string | null;
  confidence?: Record<string, number | null>;
}

// ── Image → base64 ───────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
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
    case 'CATEGORY_TYPE':   return v.category_type ?? '';
    case 'SEGMENT_TYPE':    return v.segment_type ?? '';
    case 'VARIANT_TYPE':    return v.variant_type ?? '';
    case 'FRAGRANCE_FLAVOR':return v.fragrance_flavor ?? '';
    case 'PROMOTION':       return v.promotion ?? '';
    case 'ADDONS':          return v.addons ?? '';
    case 'TAGLINE':         return v.tagline ?? '';
    case 'ITEM_NAME':
    case 'BARCODE':         return '';
  }
}

const CONF_KEY: Partial<Record<ImdbFieldKey, string>> = {
  MANUFACTURER: 'manufacturer', BRAND: 'brand', WEIGHT: 'weight_raw',
  PACKAGING_TYPE: 'packaging_type', COUNTRY: 'country_of_origin',
  CATEGORY_TYPE: 'category_type', SEGMENT_TYPE: 'segment_type',
  VARIANT_TYPE: 'variant_type', FRAGRANCE_FLAVOR: 'fragrance_flavor',
  PROMOTION: 'promotion', ADDONS: 'addons', TAGLINE: 'tagline',
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

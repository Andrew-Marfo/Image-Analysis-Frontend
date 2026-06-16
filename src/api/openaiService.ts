/**
 * Direct OpenAI GPT-4o vision extraction from the browser.
 *
 * Uses the same prompt structure as the backend vlm_openai.py so extracted
 * fields are consistent. Active when VITE_OPENAI_API_KEY is set.
 */

import type { ImdbFieldKey } from '../types/imdb';
import { IMDB_FIELD_KEYS } from '../lib/columns';
import type { ExtractedField, ExtractionResult, ImageAnalysisApi } from './client';

const OPENAI_API_KEY = ((import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? '').trim();
const OPENAI_MODEL   = ((import.meta.env.VITE_OPENAI_MODEL   as string | undefined) ?? 'gpt-4o').trim();

export const USE_OPENAI = OPENAI_API_KEY.length > 0;

// ── Prompt (mirrors backend app/services/vlm_openai.py) ──────────────────────

const PROMPT = `You are a product-catalog data extractor. Look at the product image and extract
the following attributes from any visible labels, packaging, and logos.

Return ONLY a valid JSON object with exactly these keys. Use null for any field
that is not clearly visible on the packaging — do NOT guess.

{
  "manufacturer": "company that makes the product (full legal name if shown)",
  "brand": "brand name shown on the packaging",
  "weight_raw": "net weight/volume EXACTLY as printed, e.g. '250 g' or '1.5L'",
  "packaging_type": "container type, e.g. Bottle, Can, Sachet, Box, Pouch, Tub, Jar",
  "country_of_origin": "country shown as 'Made in ...' — strip the 'Made in' prefix",
  "category_type": "high-level product category, e.g. Spreads, Condiments, Beverages",
  "segment_type": "market segment shown or implied on pack, e.g. Premium, Value, Economy",
  "variant_type": "product variant, e.g. ORIGINAL, DIET, SALTED, ZERO",
  "fragrance_flavor": "flavour or fragrance, e.g. VANILLA, LEMON, SALTED MARGARINE",
  "promotion": "promotional offer text, e.g. '20% EXTRA FREE', 'BUY 1 GET 1'",
  "addons": "bundled add-ons or free gifts shown on pack",
  "tagline": "marketing slogan or descriptor, e.g. 'SPREAD FOR BREAD', 'LOW FAT'",
  "confidence": {
    "manufacturer": 0.0, "brand": 0.0, "weight_raw": 0.0, "packaging_type": 0.0,
    "country_of_origin": 0.0, "category_type": 0.0, "segment_type": 0.0,
    "variant_type": 0.0, "fragrance_flavor": 0.0, "promotion": 0.0,
    "addons": 0.0, "tagline": 0.0
  }
}

Set each confidence value to 0.0–1.0 based on how clearly visible that field is.
Do NOT read or transcribe the barcode number. Do NOT compose a product name.`;

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
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Single-image call ─────────────────────────────────────────────────────────

async function extractOne(file: File): Promise<VLMOutput> {
  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const body = {
    model: OPENAI_MODEL,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
        },
        { type: 'text', text: PROMPT },
      ],
    }],
    response_format: { type: 'json_object' },
    temperature: 0,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `OpenAI error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = data.choices?.[0]?.message?.content ?? '{}';
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

export const openaiExtractionService: ImageAnalysisApi = {
  async extractProduct(images: File[]): Promise<ExtractionResult> {
    const outputs = await Promise.all(images.map(extractOne));
    return aggregate(outputs);
  },
};

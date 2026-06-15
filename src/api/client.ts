import type { ImdbFieldKey } from '../types/imdb';
import { IMDB_FIELD_KEYS } from '../lib/columns';
import { mockExtractionService } from './mockService';
import { geminiExtractionService, USE_GEMINI } from './geminiService';

const BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').trim();
export const USE_REAL_API = BASE_URL.length > 0;

// ── Token storage ────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}
function setTokens(access: string, refresh: string): void {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}
export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// ── Authenticated fetch with auto-refresh ─────────────────────────────────────

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token: string; refresh_token: string };
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()!}`;
      res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    } else {
      clearTokens();
      window.dispatchEvent(new Event('auth:logout'));
    }
  }
  return res;
}

// ── Auth API ──────────────────────────────────────────────────────────────────

export interface UserOut { id: number; email: string; created_at: string; }

export async function apiGetMe(): Promise<UserOut> {
  const res = await apiFetch('/api/v1/auth/me');
  if (!res.ok) throw new Error('Not authenticated');
  return res.json() as Promise<UserOut>;
}

export async function apiLogin(email: string, password: string): Promise<UserOut> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(typeof body.detail === 'string' ? body.detail : 'Login failed');
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string };
  setTokens(data.access_token, data.refresh_token);
  return apiGetMe();
}

export async function apiRegister(email: string, password: string): Promise<UserOut> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(typeof body.detail === 'string' ? body.detail : 'Registration failed');
  }
  return res.json() as Promise<UserOut>;
}

// ── Backend record type ───────────────────────────────────────────────────────

export interface RecordOut {
  id: number; session_id: number | null;
  item_name: string | null; barcode: string | null;
  manufacturer: string | null; brand: string | null;
  weight_value: number | null; weight_unit: string | null; weight: string | null;
  packaging_type: string | null; country_of_origin: string | null;
  category_type: string | null; segment_type: string | null;
  variant_type: string | null; fragrance_flavor: string | null;
  promotion: string | null; addons: string | null; tagline: string | null;
  confidence: Record<string, number>; source: Record<string, string>;
  needs_review: boolean; vlm_error: string | null;
  created_at: string; updated_at: string;
}

// ── Backend → frontend field mapping ─────────────────────────────────────────

const CONFIDENCE_KEY: Record<ImdbFieldKey, string> = {
  ITEM_NAME: 'item_name', BARCODE: 'barcode', MANUFACTURER: 'manufacturer',
  BRAND: 'brand', WEIGHT: 'weight_raw', PACKAGING_TYPE: 'packaging_type',
  COUNTRY: 'country_of_origin', CATEGORY_TYPE: 'category_type',
  SEGMENT_TYPE: 'segment_type', VARIANT_TYPE: 'variant_type',
  FRAGRANCE_FLAVOR: 'fragrance_flavor', PROMOTION: 'promotion',
  ADDONS: 'addons', TAGLINE: 'tagline',
};

function recordValue(r: RecordOut, key: ImdbFieldKey): string {
  switch (key) {
    case 'ITEM_NAME': return r.item_name ?? '';
    case 'BARCODE': return r.barcode ?? '';
    case 'MANUFACTURER': return r.manufacturer ?? '';
    case 'BRAND': return r.brand ?? '';
    case 'WEIGHT': return r.weight ?? '';
    case 'PACKAGING_TYPE': return r.packaging_type ?? '';
    case 'COUNTRY': return r.country_of_origin ?? '';
    case 'CATEGORY_TYPE': return r.category_type ?? '';
    case 'SEGMENT_TYPE': return r.segment_type ?? '';
    case 'VARIANT_TYPE': return r.variant_type ?? '';
    case 'FRAGRANCE_FLAVOR': return r.fragrance_flavor ?? '';
    case 'PROMOTION': return r.promotion ?? '';
    case 'ADDONS': return r.addons ?? '';
    case 'TAGLINE': return r.tagline ?? '';
  }
}

function recordConfidence(r: RecordOut, key: ImdbFieldKey): number {
  const ck = CONFIDENCE_KEY[key];
  if (ck in r.confidence) return r.confidence[ck];
  const val = recordValue(r, key);
  return val ? (key === 'BARCODE' ? 0.95 : 0.85) : 0;
}

function recordsToResult(records: RecordOut[]): ExtractionResult {
  const empty: ExtractedField = { value: '', confidence: 0 };
  if (!records.length) {
    return { fields: Object.fromEntries(IMDB_FIELD_KEYS.map(k => [k, empty])) as Record<ImdbFieldKey, ExtractedField> };
  }
  const fields = {} as Record<ImdbFieldKey, ExtractedField>;
  for (const key of IMDB_FIELD_KEYS) {
    let best = records[0]; let bestConf = recordConfidence(records[0], key);
    for (const r of records.slice(1)) {
      const c = recordConfidence(r, key);
      if (c > bestConf) { best = r; bestConf = c; }
    }
    fields[key] = { value: recordValue(best, key), confidence: bestConf };
  }
  let primary = records[0]; let maxAvg = 0;
  for (const r of records) {
    const vals = Object.values(r.confidence);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    if (avg > maxAvg) { maxAvg = avg; primary = r; }
  }
  return { fields, recordId: primary.id, sessionId: primary.session_id ?? undefined };
}

// ── Frontend → backend field mapping (for PATCH) ─────────────────────────────

function parseWeight(raw: string): { weight_value: number | null; weight_unit: string | null } {
  const v = raw.trim();
  if (!v) return { weight_value: null, weight_unit: null };
  const m = v.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!m) return { weight_value: null, weight_unit: null };
  const num = parseFloat(m[1]);
  const unit = m[2]?.toLowerCase() ?? null;
  const valid = ['g', 'kg', 'mg', 'ml', 'l', 'oz', 'lb', 'unit'];
  return { weight_value: isNaN(num) ? null : num, weight_unit: unit && valid.includes(unit) ? unit : null };
}

export function fieldToPatch(key: ImdbFieldKey, value: string): Record<string, unknown> {
  const v = value.trim() || null;
  switch (key) {
    case 'ITEM_NAME': return { item_name: v };
    case 'BARCODE': return { barcode: v };
    case 'MANUFACTURER': return { manufacturer: v };
    case 'BRAND': return { brand: v };
    case 'WEIGHT': return parseWeight(value);
    case 'PACKAGING_TYPE': return { packaging_type: v };
    case 'COUNTRY': return { country_of_origin: v };
    case 'CATEGORY_TYPE': return { category_type: v };
    case 'SEGMENT_TYPE': return { segment_type: v };
    case 'VARIANT_TYPE': return { variant_type: v };
    case 'FRAGRANCE_FLAVOR': return { fragrance_flavor: v };
    case 'PROMOTION': return { promotion: v };
    case 'ADDONS': return { addons: v };
    case 'TAGLINE': return { tagline: v };
  }
}

// ── Record PATCH ──────────────────────────────────────────────────────────────

export async function apiPatchRecord(recordId: number, patch: Record<string, unknown>): Promise<RecordOut> {
  const res = await apiFetch(`/api/v1/records/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update record');
  return res.json() as Promise<RecordOut>;
}

// ── Records list ──────────────────────────────────────────────────────────────

export interface RecordFilters {
  brand?: string; category_type?: string;
  needs_review?: boolean; limit?: number; offset?: number;
}

export async function apiGetRecords(filters: RecordFilters = {}): Promise<{ records: RecordOut[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.brand) params.set('brand', filters.brand);
  if (filters.category_type) params.set('category_type', filters.category_type);
  if (filters.needs_review != null) params.set('needs_review', String(filters.needs_review));
  params.set('limit', String(filters.limit ?? 200));
  params.set('offset', String(filters.offset ?? 0));
  const res = await apiFetch(`/api/v1/records?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch records');
  const total = parseInt(res.headers.get('X-Total-Count') ?? '0', 10);
  const records = (await res.json()) as RecordOut[];
  return { records, total };
}

export async function apiDeleteRecord(recordId: number): Promise<void> {
  const res = await apiFetch(`/api/v1/records/${recordId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete record');
}

// ── Dedup & Merge ─────────────────────────────────────────────────────────────

export interface MergeCandidate {
  record_id: number;
  duplicate_of: number;
  score: number;
  reason: string;
  matched_fields: string[];
}

export async function apiRunDedup(sessionId?: number): Promise<MergeCandidate[]> {
  const params = new URLSearchParams();
  if (sessionId != null) params.set('session_id', String(sessionId));
  const res = await apiFetch(`/api/v1/records/dedup?${params.toString()}`, { method: 'POST' });
  if (!res.ok) throw new Error('Dedup failed');
  const data = (await res.json()) as { candidates: MergeCandidate[] };
  return data.candidates;
}

export async function apiMergeRecords(keepId: number, mergeId: number): Promise<RecordOut> {
  const res = await apiFetch('/api/v1/records/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keep_id: keepId, merge_id: mergeId }),
  });
  if (!res.ok) throw new Error('Merge failed');
  return res.json() as Promise<RecordOut>;
}

// ── Export ────────────────────────────────────────────────────────────────────

/** All columns the backend can export, in order. */
export const BACKEND_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: 'RECORD_ID',        label: 'Record ID' },
  { key: 'SESSION_ID',       label: 'Session ID' },
  { key: 'ITEM_NAME',        label: 'Item Name' },
  { key: 'BARCODE',          label: 'Barcode' },
  { key: 'MANUFACTURER',     label: 'Manufacturer' },
  { key: 'BRAND',            label: 'Brand' },
  { key: 'WEIGHT',           label: 'Weight' },
  { key: 'PACKAGING_TYPE',   label: 'Packaging Type' },
  { key: 'COUNTRY',          label: 'Country' },
  { key: 'CATEGORY_TYPE',    label: 'Category Type' },
  { key: 'SEGMENT_TYPE',     label: 'Segment Type' },
  { key: 'VARIANT_TYPE',     label: 'Variant Type' },
  { key: 'FRAGRANCE_FLAVOR', label: 'Fragrance / Flavor' },
  { key: 'PROMOTION',        label: 'Promotion' },
  { key: 'ADDONS',           label: 'Add-ons' },
  { key: 'TAGLINE',          label: 'Tagline' },
  { key: 'NEEDS_REVIEW',     label: 'Needs Review' },
  { key: 'UPLOADED_AT',      label: 'Uploaded At' },
];

export async function apiExportBlob(
  format: 'csv' | 'xlsx',
  sessionId?: number,
  columns?: string[],
): Promise<Blob> {
  const params = new URLSearchParams({ format });
  if (sessionId != null) params.set('session_id', String(sessionId));
  if (columns?.length) {
    for (const c of columns) params.append('columns', c);
  }
  const res = await apiFetch(`/api/v1/export?${params.toString()}`);
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

// ── Extraction contract ───────────────────────────────────────────────────────

export interface ExtractedField { value: string; confidence: number; }

export interface ExtractionResult {
  fields: Record<ImdbFieldKey, ExtractedField>;
  recordId?: number;
  sessionId?: number;
  dedupCandidates?: MergeCandidate[];
}

export interface ImageAnalysisApi {
  extractProduct(images: File[]): Promise<ExtractionResult>;
}

class HttpAnalysisApi implements ImageAnalysisApi {
  async extractProduct(images: File[]): Promise<ExtractionResult> {
    const form = new FormData();
    for (const f of images) form.append('files', f);
    const res = await apiFetch('/api/v1/extract', { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Extraction failed');
    }
    const data = (await res.json()) as { session_id: number; records: RecordOut[]; dedup_candidates: MergeCandidate[] };
    return { ...recordsToResult(data.records), dedupCandidates: data.dedup_candidates ?? [] };
  }
}

export const api: ImageAnalysisApi = USE_REAL_API
  ? new HttpAnalysisApi()        // backend FastAPI (saves to DB, S3, etc.)
  : USE_GEMINI
    ? geminiExtractionService    // direct Gemini call from browser (no backend)
    : mockExtractionService;     // offline demo mode

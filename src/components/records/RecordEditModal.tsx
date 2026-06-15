import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { apiPatchRecord, type RecordOut } from '../../api/client';

interface Props {
  record: RecordOut;
  onClose: () => void;
  onSaved: (updated: RecordOut) => void;
}

interface FormState {
  item_name: string;
  barcode: string;
  manufacturer: string;
  brand: string;
  weight: string;
  packaging_type: string;
  country_of_origin: string;
  variant_type: string;
  category_type: string;
  fragrance_flavor: string;
  promotion: string;
  addons: string;
  tagline: string;
}

const FIELDS: { key: keyof FormState; label: string; span?: boolean }[] = [
  { key: 'item_name',        label: 'Item Name',         span: true },
  { key: 'brand',            label: 'Brand' },
  { key: 'manufacturer',     label: 'Manufacturer' },
  { key: 'barcode',          label: 'Barcode' },
  { key: 'weight',           label: 'Weight (e.g. 250g)' },
  { key: 'packaging_type',   label: 'Packaging Type' },
  { key: 'category_type',    label: 'Category' },
  { key: 'country_of_origin',label: 'Country of Origin' },
  { key: 'variant_type',     label: 'Variant' },
  { key: 'fragrance_flavor', label: 'Fragrance / Flavor' },
  { key: 'promotion',        label: 'Promotion' },
  { key: 'addons',           label: 'Add-ons',           span: true },
  { key: 'tagline',          label: 'Tagline',           span: true },
];

function parseWeight(raw: string): { weight_value: number | null; weight_unit: string | null } {
  const v = raw.trim();
  if (!v) return { weight_value: null, weight_unit: null };
  const m = v.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!m) return { weight_value: null, weight_unit: null };
  const num = parseFloat(m[1]);
  const unit = m[2]?.toLowerCase() ?? null;
  const valid = ['g', 'kg', 'mg', 'ml', 'l', 'oz', 'lb', 'unit'];
  return {
    weight_value: isNaN(num) ? null : num,
    weight_unit: unit && valid.includes(unit) ? unit : null,
  };
}

function toForm(r: RecordOut): FormState {
  return {
    item_name:         r.item_name ?? '',
    barcode:           r.barcode ?? '',
    manufacturer:      r.manufacturer ?? '',
    brand:             r.brand ?? '',
    weight:            r.weight ?? '',
    packaging_type:    r.packaging_type ?? '',
    country_of_origin: r.country_of_origin ?? '',
    variant_type:      r.variant_type ?? '',
    category_type:     r.category_type ?? '',
    fragrance_flavor:  r.fragrance_flavor ?? '',
    promotion:         r.promotion ?? '',
    addons:            r.addons ?? '',
    tagline:           r.tagline ?? '',
  };
}

function buildPatch(original: FormState, current: FormState): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const { key } of FIELDS) {
    if (current[key] === original[key]) continue;
    if (key === 'weight') {
      const { weight_value, weight_unit } = parseWeight(current.weight);
      patch['weight_value'] = weight_value;
      patch['weight_unit'] = weight_unit;
    } else {
      patch[key] = current[key].trim() || null;
    }
  }
  return patch;
}

export function RecordEditModal({ record, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(record));
  const original = toForm(record);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const patch = buildPatch(original, form);
    if (Object.keys(patch).length === 0) { onClose(); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await apiPatchRecord(record.id, patch);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Edit record #{record.id}</h2>
            <p className="text-xs text-slate-400">
              {record.item_name ?? record.brand ?? 'Untitled'} · only changed fields are saved
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map(({ key, label, span }) => (
              <div key={key} className={span ? 'col-span-2' : ''}>
                <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

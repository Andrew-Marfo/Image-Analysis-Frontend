import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  ImdbFieldKey,
  Product,
  ProductImage,
  WorkflowStep,
} from '../types/imdb';
import { emptyField } from '../types/imdb';
import { IMDB_FIELD_KEYS } from '../lib/columns';
import { groupFiles, groupKeyForFile } from '../lib/grouping';
import { uid } from '../lib/id';
import { api, apiPatchRecord, fieldToPatch, USE_REAL_API } from '../api/client';
import type { ExtractionResult } from '../api/client';

interface State {
  step: WorkflowStep;
  products: Product[];
}

type Action =
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'REMOVE_PRODUCT'; productId: string }
  | { type: 'REMOVE_IMAGE'; productId: string; imageId: string }
  | { type: 'SET_STATUS'; productId: string; status: Product['status']; error?: string }
  | { type: 'SET_RESULT'; productId: string; result: ExtractionResult }
  | { type: 'UPDATE_FIELD'; productId: string; key: ImdbFieldKey; value: string }
  | { type: 'SET_REVIEWED'; productId: string; reviewed: boolean }
  | { type: 'SET_STEP'; step: WorkflowStep }
  | { type: 'RESET' };

function emptyFields() {
  const fields = {} as Product['fields'];
  for (const key of IMDB_FIELD_KEYS) fields[key] = emptyField();
  return fields;
}

function makeImage(file: File): ProductImage {
  return {
    id: uid('img'),
    fileName: file.name,
    previewUrl: URL.createObjectURL(file),
    file,
    tag: groupKeyForFile(file.name),
  };
}

function addFiles(state: State, files: File[]): State {
  const groups = groupFiles(files);
  const products = [...state.products];

  for (const [groupKey, groupFilesList] of groups) {
    const existing = products.find((p) => p.groupKey === groupKey);
    const newImages = groupFilesList.map(makeImage);
    if (existing) {
      // Re-add images to an existing group; mark it for re-extraction.
      const idx = products.indexOf(existing);
      products[idx] = {
        ...existing,
        images: [...existing.images, ...newImages],
        status: 'pending',
      };
    } else {
      products.push({
        id: uid('prod'),
        groupKey,
        images: newImages,
        fields: emptyFields(),
        status: 'pending',
        reviewed: false,
      });
    }
  }
  return { ...state, products };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_FILES':
      return addFiles(state, action.files);

    case 'REMOVE_PRODUCT': {
      const product = state.products.find((p) => p.id === action.productId);
      product?.images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.productId),
      };
    }

    case 'REMOVE_IMAGE': {
      return {
        ...state,
        products: state.products
          .map((p) => {
            if (p.id !== action.productId) return p;
            const img = p.images.find((i) => i.id === action.imageId);
            if (img) URL.revokeObjectURL(img.previewUrl);
            return { ...p, images: p.images.filter((i) => i.id !== action.imageId) };
          })
          .filter((p) => p.images.length > 0),
      };
    }

    case 'SET_STATUS':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.productId
            ? { ...p, status: action.status, error: action.error }
            : p,
        ),
      };

    case 'SET_RESULT':
      return {
        ...state,
        products: state.products.map((p) => {
          if (p.id !== action.productId) return p;
          const fields = { ...p.fields };
          for (const key of IMDB_FIELD_KEYS) {
            const r = action.result.fields[key];
            fields[key] = { value: r.value, confidence: r.confidence, edited: false };
          }
          return {
            ...p, fields, status: 'done', error: undefined,
            recordId: action.result.recordId,
            sessionId: action.result.sessionId,
            dedupCandidates: action.result.dedupCandidates,
          };
        }),
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        products: state.products.map((p) => {
          if (p.id !== action.productId) return p;
          const current = p.fields[action.key];
          return {
            ...p,
            fields: {
              ...p.fields,
              [action.key]: { ...current, value: action.value, edited: true },
            },
          };
        }),
      };

    case 'SET_REVIEWED':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.productId ? { ...p, reviewed: action.reviewed } : p,
        ),
      };

    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'RESET': {
      state.products.forEach((p) =>
        p.images.forEach((img) => URL.revokeObjectURL(img.previewUrl)),
      );
      return { step: 'upload', products: [] };
    }

    default:
      return state;
  }
}

interface AppStore extends State {
  addFiles: (files: File[]) => void;
  removeProduct: (productId: string) => void;
  removeImage: (productId: string, imageId: string) => void;
  updateField: (productId: string, key: ImdbFieldKey, value: string) => void;
  setReviewed: (productId: string, reviewed: boolean) => void;
  setStep: (step: WorkflowStep) => void;
  reset: () => void;
  /** Run extraction for every product that hasn't been processed yet. */
  runExtraction: () => Promise<void>;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { step: 'upload', products: [] });

  const runExtraction = useCallback(async () => {
    const pending = state.products.filter((p) => p.status === 'pending');
    await Promise.all(
      pending.map(async (product) => {
        dispatch({ type: 'SET_STATUS', productId: product.id, status: 'extracting' });
        try {
          const result = await api.extractProduct(product.images.map((i) => i.file));
          dispatch({ type: 'SET_RESULT', productId: product.id, result });
        } catch (err) {
          dispatch({
            type: 'SET_STATUS',
            productId: product.id,
            status: 'error',
            error: err instanceof Error ? err.message : 'Extraction failed',
          });
        }
      }),
    );
  }, [state.products]);

  const value = useMemo<AppStore>(
    () => ({
      ...state,
      addFiles: (files) => dispatch({ type: 'ADD_FILES', files }),
      removeProduct: (productId) => dispatch({ type: 'REMOVE_PRODUCT', productId }),
      removeImage: (productId, imageId) =>
        dispatch({ type: 'REMOVE_IMAGE', productId, imageId }),
      updateField: (productId, key, value) => {
        dispatch({ type: 'UPDATE_FIELD', productId, key, value });
        if (USE_REAL_API) {
          const product = state.products.find((p) => p.id === productId);
          if (product?.recordId != null) {
            apiPatchRecord(product.recordId, fieldToPatch(key, value)).catch(() => undefined);
          }
        }
      },
      setReviewed: (productId, reviewed) =>
        dispatch({ type: 'SET_REVIEWED', productId, reviewed }),
      setStep: (step) => dispatch({ type: 'SET_STEP', step }),
      reset: () => dispatch({ type: 'RESET' }),
      runExtraction,
    }),
    [state, runExtraction],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

# Image-to-IMDB — Frontend

AI-driven tool that auto-fills **Item Master Database (IMDB)** records from product
images. Built for the **GDSS-Maverick Hackathon**.

Upload product photos → an image-analysis pipeline extracts the product attributes →
preview, edit, and flag low-confidence fields → export a CSV/XLSX ready for product-master
database upload.

> This repository is the **React frontend**. The image-analysis backend is a separate
> service; until it is connected the app runs against a built-in **mock extraction
> service** so the full flow is demoable.

## What this part of the project is

The overall product has two parts:

- **Backend / ML pipeline** (separate, built by teammates) — receives product images and
  runs the image-analysis pipeline (VLM / OCR / multi-model) to extract the IMDB attributes.
- **Frontend (this repository)** — the user-facing web app that handles image upload,
  presents and lets users review/edit the extracted attributes, flags low-confidence
  values for human attention, and exports the final CSV/XLSX for database upload.

The two communicate through a single, well-defined API boundary
([`src/api/client.ts`](src/api/client.ts)), so the frontend was built and verified
independently against a mock and can be pointed at the real backend without UI changes.

## Workflow

`Upload → Preview → Edit → Export`

1. **Upload** — drag & drop product images. Images are grouped into one product per
   filename prefix (a product has 3–4 angles).
2. **Preview & Edit** — extracted attributes shown per product; low-confidence or
   expected-but-empty fields are flagged in amber for human review and are inline-editable.
3. **Export** — download `predictions.csv` or `predictions.xlsx` with the exact 13 IMDB
   columns in submission order.

## The 13 IMDB columns

`ITEM_NAME · BARCODE · MANUFACTURER · BRAND · WEIGHT · PACKAGING TYPE · COUNTRY · VARIANT ·
TYPE · FRAGRANCE_FLAVOR · PROMOTION · ADDONS · TAGLINE`

Defined once in [`src/lib/columns.ts`](src/lib/columns.ts) — the single source of truth for
the UI grid and the export. Fields that can't be confidently extracted are left empty
(never guessed).

## Status — what's been done

- [x] Project scaffolding: Vite + React 19 + TypeScript + Tailwind CSS v4, ESLint.
- [x] IMDB data model and the 13 columns as a single source of truth for UI + export.
- [x] `ImageAnalysisApi` interface with one swap point, plus a mock extraction service
      seeded from the sample products for an end-to-end demo.
- [x] **Upload** step: drag-and-drop multi-image upload, auto-grouping of images into
      products by filename prefix, per-product thumbnails and removal.
- [x] **Preview & Edit** step: per-product cards with all 13 fields inline-editable;
      low-confidence and expected-but-empty fields flagged in amber with confidence
      indicators; per-product "mark reviewed" toggle and a review summary.
- [x] **Export** step: live output-table preview + working CSV and (lazy-loaded) XLSX
      download with the exact 13 columns in submission order and empty strings for unknowns.
- [x] Responsive layout (works on web and mobile widths) and step navigation.
- [x] AWS Amplify build config (`amplify.yml`) and project documentation.
- [x] Verified: production build + lint pass; full flow driven end-to-end with the sample
      images (no console errors); CSV/XLSX downloads confirmed valid.

## Roadmap — what's left to do

- [ ] **Wire the real backend**: implement an HTTP-backed `ImageAnalysisApi` against the
      teammates' endpoint and switch `api` over (see "Connecting the real backend" below).
- [ ] **Upload UX**: surface per-image extraction errors/retries and an overall progress
      state for large batches; allow manual re-grouping (merge/split) of images.
- [ ] **Duplicate / merge suggestions** (bonus from the brief): flag likely-duplicate
      products by matching barcode / brand / weight against existing records.
- [ ] **Standardised naming**: dropdowns / normalisation for brand, category, segment, and
      packaging to reduce duplication on import.
- [ ] **Authentication** (deferred): add AWS Cognito sign-in if required for the demo.
- [ ] **Persistence**: optionally save sessions so work survives a page refresh.
- [ ] **Tests**: unit tests for grouping, confidence flagging, and CSV/XLSX export; a smoke
      test for the full flow.
- [ ] **Deploy**: connect the repo in the AWS Amplify console and ship a live demo URL.

## Tech stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4**
- **ExcelJS** for XLSX export (lazy-loaded), native CSV writer
- **lucide-react** icons

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Connecting the real backend

All extraction goes through the `api` object in
[`src/api/client.ts`](src/api/client.ts), which implements the `ImageAnalysisApi`
interface. To switch from the mock to the real service:

1. Set `VITE_API_BASE_URL` (see [`.env.example`](.env.example)).
2. Implement an HTTP-backed `ImageAnalysisApi` and assign it to `api`.

Nothing in the UI needs to change.

## Deployment (AWS Amplify Hosting)

[`amplify.yml`](amplify.yml) defines the build: `npm ci` → `npm run build`, publishing the
`dist/` directory. Connect the repo in the Amplify console and set any `VITE_*` environment
variables there. The app is currently a single page (no client-side router), so no SPA
rewrite rule is required; add one (`/<*> → /index.html`, 200) in the console if routing is
introduced later.

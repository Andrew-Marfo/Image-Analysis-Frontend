# Image-to-IMDB — Frontend

React web app for the Image-to-IMDB pipeline. Authenticated users upload
product images, review AI-extracted attributes, browse and edit all records,
and export a submission-ready CSV/XLSX.

## Pages

### Upload
Drag and drop product images. Images are grouped into products by filename
prefix (3–4 angles per product). The AI extracts all 13 IMDB fields per image
and combines results by picking the highest-confidence value per field across
the group.

### Review (within Upload flow)
Extracted fields shown per product. Low-confidence or empty-but-expected fields
are highlighted in amber for human attention and are inline-editable. Every edit
is saved to the backend in real time (`PATCH /api/v1/records/{id}`).

If the AI detects that a product already exists in the database, a plain-language
message appears above the card:

> _"[Product name] was already entered on [date] with ID #[id].
> Verify records to confirm, or continue with this extraction."_

Actions: **Verify Records** (go to Records tab) · **Continue Extraction** (keep
the new record) · **Merge into existing** (absorb new fields into the older record).

### Export (within Upload flow)
Live preview of the output table. Downloads the session's records from the
backend as CSV or XLSX with the exact 13 IMDB columns in submission order.

### Records
Browses all records in the database across all users.

- **Summary bar:** today's date, total record count, latest record highlighted.
- **Filters:** brand, category, date range (today / 7 days / 30 days / all),
  needs-review toggle.
- **Per-row actions:** edit (pencil icon opens a modal with all 13 fields) and
  delete (with confirmation).
- **Find Duplicates:** scans all records for fuzzy matches and presents them
  side-by-side with **Merge** and **Dismiss** actions.
- **Export:** download all visible records as CSV or XLSX.

## Authentication

JWT-based. The login/register page uses a split-panel layout — a dark feature
panel on the left and a form on the right. Tokens are stored in `localStorage`
and automatically refreshed on 401. The logged-in user's name and sign-out
button appear in the top navigation bar.

## Extraction modes

The `api` object in `src/api/client.ts` selects the active mode at build time:

| Priority | Condition | Mode |
|---|---|---|
| 1 | `VITE_API_BASE_URL` is set | **Backend API** — records saved to DB + S3 |
| 2 | `VITE_GEMINI_API_KEY` is set | **Direct Gemini** — real extraction, no DB |
| 3 | Neither set | **Mock service** — offline demo with seeded data |

## Environment variables

Create a `.env` file in this directory:

```bash
# Connect to the FastAPI backend (recommended)
VITE_API_BASE_URL=http://localhost:8000

# Direct Gemini Flash mode (no backend needed)
VITE_GEMINI_API_KEY=<your-google-ai-studio-key>
VITE_GEMINI_MODEL=gemini-2.0-flash
```

Both variables can coexist — `VITE_API_BASE_URL` takes priority.

## Getting started

Requires **Node 20+**. If you use nvm: `nvm use 20`.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # preview the production build
```

## Tech stack

| Library | Purpose |
|---|---|
| React 19 + TypeScript + Vite 8 | UI framework and build tooling |
| Tailwind CSS v4 | Styling with `bg-brand-*` custom colour scale |
| lucide-react | Icons |
| ExcelJS (lazy-loaded) | XLSX generation |
| Google Gemini REST API | Direct browser extraction (no SDK) |

## Project layout

```
src/
  api/
    client.ts          Auth, HTTP extraction, PATCH, records, dedup/merge, export
    geminiService.ts   Direct Gemini Flash extraction from the browser
    mockService.ts     Seeded mock for offline demo
  store/
    AuthStore.tsx      JWT session context (login, register, logout, auto-refresh)
    NavStore.tsx        Upload / Records page switching
    AppStore.tsx        Upload workflow state (products, steps, field edits)
  types/
    imdb.ts            Product, FieldValue, ImdbFieldKey, WorkflowStep
  lib/
    columns.ts         Single source of truth for the 13 IMDB columns
    confidence.ts      Low-confidence threshold helpers
    export.ts          Local CSV / XLSX generation (mock/direct mode)
    grouping.ts        Group uploaded files by filename prefix
  components/
    Header.tsx         2-row navbar (dark top bar + Upload/Records tabs)
    Stepper.tsx        Upload workflow step indicator
    auth/
      AuthPage.tsx     Split-panel login / register
    upload/
      UploadStep.tsx   Drag-and-drop zone
      Dropzone.tsx
      ProductImageGroup.tsx
    review/
      ReviewStep.tsx   Per-product field editor + duplicate warning banner
      ProductCard.tsx
      FieldEditor.tsx
    export/
      ExportStep.tsx   Output preview + CSV/XLSX download
      DataTablePreview.tsx
    records/
      RecordsPage.tsx       Records browser with filters, edit, delete, export
      RecordEditModal.tsx   Modal editor for all 13 fields
      DedupPanel.tsx        Duplicate candidates panel with merge/dismiss actions
    ui/
      Button.tsx
```

## Deployment (AWS Amplify)

`amplify.yml` defines the build: `npm ci` → `npm run build`, publishing `dist/`.
Set `VITE_API_BASE_URL` and any other `VITE_*` variables in the Amplify console
environment settings. The app is a single page — add a rewrite rule
(`/<*> → /index.html`, 200) in the Amplify console if client-side routing is added.

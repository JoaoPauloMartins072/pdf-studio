# Folio — roadmap

## Phase 0 — done (MVP scaffold)
- [x] Brand + landing
- [x] Merge / Split / Compress tools
- [x] Client-side PDF processing
- [x] Pay-per-PDF paywall UI
- [x] Stripe Checkout API (demo fallback)
- [x] Webhook stub

## Architecture — structural PDF editor (`src/core` → future `folio-core`)
Pipeline: Byte Reader → XRef → Object Loader → Stream Decoder → Graphics Interpreter → Display List → Editable Document Model → Commands → Serializer.

- [x] **Stage 0** — Core contracts: document model, display list, command engine (`ReplaceTextCommand`), parser/interpreter/hit-test/renderer/serializer stubs, `openDocumentFromBytes` pipeline (UI unchanged; legacy overlay editor still default)
- [x] **Stage 1** — pdf.js → Display List → `TextObject[]` on open (`DisplayListDocumentModelBuilder`); legacy `textItems` derived from model; edit/export still overlay+bake
- [x] **Stage 2** — Hit testing against model (`BBoxHitTester` → `ObjectId`); select/editText use model selection + hover chrome; edit still bridges to legacy `nativeText` bake
- [x] **Stage 3** — Text edit via `ReplaceTextCommand` + CommandEngine; preview from dirty model objects; export still uses model-diff → legacy bake bridge (not edit-time white-rect)
- [x] **Stage 4** — `FolioPdfLibSerializer` is the official export path (model diffs + overlays); editor no longer calls `bakeEditsIntoPdf`; cover+write remains internal writer TODO until content-stream rewrite
- [x] **Stage 5** — `FolioModelRenderer` + `Canvas2DRenderTarget`; hybrid preview (pdf.js base + dirty model canvas); DOM dirty-text preview removed
- [x] **Stage 6** — Images/paths as model objects (pdf.js image extract + draw/sign/image tools via commands); Delete/Move/Insert commands; serializer/renderer updated
- [x] **Stage 7** — Multi-select (Ctrl/Shift+click); Duplicate / Align / Z-order commands + SelectionActionsBar; DeleteObjects / MoveObjects
- [ ] Extract `packages/folio-core` + `packages/folio-ui` when core stabilizes

Legacy overlay + `bakeEditsIntoPdf` remain until Stages 3–4. OCR / visual-fallback only as explicit `editability` exceptions.

## Phase 1 — ship & monetize
- [ ] Stripe live keys + Apple Pay domain verification
- [ ] Persist unlock tokens after payment (Redis / DB)
- [ ] Success page restores download after redirect
- [ ] Deploy to Vercel
- [ ] Basic analytics (Plausible / PostHog)

## Phase 2 — more editors people pay for
- [ ] Watermark / page numbers
- [ ] Rotate / delete pages (visual)
- [ ] Fill PDF forms
- [ ] Simple text overlay editor
- [ ] Convert image → PDF

## Phase 3 — heavier features
- [ ] Server-side compress (Ghostscript / qpdf)
- [ ] OCR for scans
- [ ] Word ↔ PDF conversion
- [ ] Optional ads on free pages
- [ ] Teams / API later if demand

## Pricing sketch
- **€0.99** per unlocked file (MVP)
- Bundle packs later (5 files / €3.99)
- No monthly required for core use

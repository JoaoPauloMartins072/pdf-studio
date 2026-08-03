# Folio — roadmap

## Phase 0 — done (MVP scaffold)
- [x] Brand + landing
- [x] Merge / Split / Compress tools
- [x] Client-side PDF processing
- [x] Pay-per-PDF paywall UI
- [x] Stripe Checkout API (demo fallback)
- [x] Webhook stub

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

# QA Report #001 — Folio MVP smoke + risk

**Date:** 2026-08-04  
**Scope:** Merge, Split, Compress, Editor bake, Demo paywall vs Stripe APIs, security  
**Agent:** QA#1  
**Environment:** Windows 10 · Node (local) · Next.js 16.2.12 · no browser e2e suite yet  

---

## What was run

| Command | Exit code | Notes |
|---------|-----------|--------|
| `npm run lint` | **1** | 1502 problems total (61 errors, 1441 warnings). Vast majority from linting `public/pdf.worker.min.mjs`. |
| `npx eslint "src/**/*.{ts,tsx}"` | **1** | **54 errors** in app source (React Compiler `react-hooks/refs` / `set-state-in-effect`), 0 warnings. |
| `npx tsc --noEmit` | **0** | Clean. |
| `npm run build` | **0** | Production build succeeded; routes: `/`, `/editor`, `/pricing`, `/tools/{merge,split,compress}`, `/api/{checkout,webhook}`. |
| `npx tsx scripts/qa-smoke-pdf.mts` | **0** | PDF lib smoke (14/14 recorded cases; includes intentional probes for Unicode fail + filename footgun). |

### Smoke script results (`scripts/qa-smoke-pdf.mts`)

| Case | Result |
|------|--------|
| merge 2+1 pages → 3 | PASS |
| merge `[]` throws | PASS |
| getPageCount / parsePageRange / extract / splitToPages | PASS |
| compress returns bytes (tiny shrink on synthetic PDF) | PASS |
| bake reorder + delete pages | PASS |
| bake Unicode (`Olá 日本語`) throws WinAnsi | **Confirmed failure mode** |
| corrupt PDF merge throws | PASS |
| compress filename `null` → `"undefined-compressed.pdf"` | **Confirmed footgun** |

No Vitest/Jest suite exists (roadmap: `chore/tests-vitest`).

---

## Confirmed bugs

### 1. Editor bake crashes download on non-WinAnsi text

**Title:** [Editor / bakeEditsIntoPdf] Download fails when annotation text contains non-WinAnsi characters  

**Severity:** High  

**Steps to Reproduce:**
1. Open `/editor`, load any PDF.
2. Add text (or edit native text via prompt) containing CJK or other non-WinAnsi glyphs (e.g. `日本語`).
3. Finish → Pay & download (demo).

**Expected:** PDF downloads; unsupported glyphs substituted or font embedded.  
**Actual:** `bakeEditsIntoPdf` throws (`WinAnsi cannot encode "日" (0x65e5)`); modal shows error; no file.  

**Environment:** Code path `bakeEditsIntoPdf` + `StandardFonts.Helvetica` only.  
**Evidence:** `npx tsx scripts/qa-smoke-pdf.mts` — case `bake unicode throws (WinAnsi/Helvetica)`.

---

### 2. `npm run lint` fails on app + vendored worker

**Title:** [Tooling] ESLint fails — 54 errors in `src/`, plus noise from `public/pdf.worker.min.mjs`  

**Severity:** Medium  

**Steps to Reproduce:**
1. Run `npm run lint` or `npx eslint "src/**/*.{ts,tsx}"`.

**Expected:** Lint clean (or worker ignored; app errors fixed/waived intentionally).  
**Actual:** Exit 1. Hotspots: `FolioPdfWorkspace.tsx`, `useFolioPdfWorkspace.ts`, `useUndoRedoEdits.ts` (`react-hooks/refs`, `set-state-in-effect`). Worker minfile floods warnings when linting whole project.  

**Evidence:** Command output above. Build still passes.

---

### 3. Split “each page” may lose files to multi-download blocking

**Title:** [Split] Secondary page downloads fire as parallel `saveAs` calls  

**Severity:** Medium  

**Steps to Reproduce:**
1. `/tools/split` → multi-page PDF → “Each page separate” → Finish & download → Pay.
2. Observe browser download prompts / blocked multiple downloads.

**Expected:** Reliable delivery of all pages (zip, or sequential user-gesture downloads).  
**Actual:** `getBytes` loops `downloadPdfFile` for pages 2..N then returns page 1; browsers often block extras.  

**Evidence:** `src/app/tools/split/page.tsx` lines 110–115.

---

### 4. Pricing / catalog overclaims Stripe readiness

**Title:** [Pricing] Copy promises Stripe / Apple Pay while checkout is demo-only  

**Severity:** Medium (trust / compliance if public)  

**Steps to Reproduce:**
1. Open `/pricing` — copy mentions Apple Pay / Google Pay / Stripe.
2. Complete any tool download flow — `DemoPayDownloadModal` never calls `/api/checkout`.

**Expected:** Pricing matches payment reality (demo labeled, or real Stripe).  
**Actual:** Marketing implies live Stripe; UI explicitly demo; API unused.  

**Evidence:** `src/app/pricing/page.tsx`; `ToolFinishCheckout.tsx` comment “checkout is demo-only”; grep shows no client `fetch('/api/checkout')`.

---

### 5. Checkout success URL wrong for editor tool id

**Title:** [api/checkout] `success_url` assumes `/tools/${tool}` — breaks for `editor`  

**Severity:** Medium (latent until Stripe UI wired)  

**Steps to Reproduce:**
1. `POST /api/checkout` with `{ "tool": "editor" }` when Stripe keys configured.
2. Complete payment; follow `success_url`.

**Expected:** Redirect to `/editor?paid=1` (or entitlement unlock page).  
**Actual:** `${origin}/tools/editor?paid=1` — route does not exist (`/editor` is correct).  

**Evidence:** `src/app/api/checkout/route.ts` lines 50–51; `folioCatalog` editor href `/editor`.

---

### 6. Stripe API errors may leak upstream messages

**Title:** [api/checkout] 500 body returns raw `Error.message`  

**Severity:** Low–Medium  

**Steps to Reproduce:**
1. Configure invalid/partial Stripe keys such that `sessions.create` throws.
2. Inspect JSON `error` field.

**Expected:** Generic client message; details server-logged only.  
**Actual:** `NextResponse.json({ error: message }, { status: 500 })` with Stripe/exception text.  

**Evidence:** `src/app/api/checkout/route.ts` catch block.

---

### 7. Compress download filename expression footgun

**Title:** [Compress] Filename expression can yield `undefined-compressed.pdf`  

**Severity:** Low  

**Steps to Reproduce (code):**
Evaluate `(file?.name.replace(/\.pdf$/i, "") + "-compressed.pdf") || "compressed.pdf"` when `file` is null → `"undefined-compressed.pdf"`.  

**Expected:** Fallback `"compressed.pdf"`.  
**Actual:** String concat before `||` makes fallback dead. Mitigated today because `ready={Boolean(stats)}` implies `file` set.  

**Evidence:** Smoke probe + `src/app/tools/compress/page.tsx` line 80.

---

### 8. Dropzone silently ignores non-PDF

**Title:** [PdfFileDropzone] Non-PDF selection gives no user feedback  

**Severity:** Low  

**Steps to Reproduce:**
1. Drop a `.txt` (or non-PDF) on merge/split/compress dropzone.

**Expected:** Error toast/message.  
**Actual:** Filter drops files; UI unchanged.  

**Evidence:** `PdfFileDropzone.tsx` `take()` — no else branch.

---

## Security review (scoped)

| Check | Result |
|-------|--------|
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` server-only | **OK** — only in `stripeServerClient` / webhook route; not `NEXT_PUBLIC_*` |
| Publishable key | Public by design (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) |
| Secrets in repo | `.env.example` empty placeholders only; no `.env` with secrets found |
| PDF upload to unintended APIs | **OK for MVP** — tools/editor process via `arrayBuffer` + local download; no upload endpoint |
| Webhook signature | Verifies when Stripe + secret configured; **501** if missing |
| Webhook entitlement | **Stub** — logs `checkout.session.completed`, does not persist unlock (roadmap) |
| Demo paywall bypass | **Intentional** — any user “pays” in demo and downloads; not a secret leak, but **zero payment enforcement** |
| Encrypted PDFs | `loadPdfDocument` uses `ignoreEncryption: true` — may open password PDFs without unlock UX; output quality undefined (product gap / risk) |

**Webhook stub risk (when Stripe goes live):** Paid users can be charged while app still unlocks via client demo modal unless UI is wired to session + server entitlement. Do not enable live keys with current UI.

---

## Product gaps (deferred — not counted as MVP regressions)

Aligned with `docs/FOLIO-ROADMAP.md`:

| Gap | Notes |
|-----|--------|
| Real Stripe paywall | UI never calls `/api/checkout`; demo modal unlocks |
| Webhook unlock persistence | Log-only stub |
| Real image compress | Rebuild + object streams only; catalog tagline still “Smaller file” |
| Merge drag-and-drop reorder | Grip icon + Up/Down only |
| Split zip download | Multi-file saveAs instead |
| Real signature | SVG stamp placeholder |
| Native text polish | `window.prompt` + whiteout bake |
| Unlock/Protect tool | Not built; `ignoreEncryption` is not a product unlock |

---

## Area verdicts

| Area | Verdict |
|------|---------|
| Merge lib + UI wiring | Happy path OK; empty list guarded; corrupt throws |
| Split lib + UI | Range parse solid; “all pages” download UX fragile |
| Compress | Works as light rebuild; marketing vs reality = gap |
| Editor bake | ASCII path OK; **Unicode High bug**; rotate/delete/reorder OK in smoke |
| Paywall | Demo consistent in tools/editor; Stripe API orphaned |
| Security | Secrets OK; monetization not enforceable yet |

---

## Conclusion

**Ready with minor follow-ups**

MVP PDF happy paths (merge / split extract / light compress / bake ASCII) and production **build** are healthy. Lint is red; editor Unicode bake can hard-fail downloads; Stripe remains intentionally unwired. Not **Blocked** for continuing `chore/agents-qa-producer` / demo MVP, but fix High bake encoding before treating editor export as release-ready for international text.

---

## Recommended next fixes (by severity)

1. **High** — Bake text with a font that supports Unicode (or sanitize/fallback + clear error before pay).  
2. **Medium** — Fix ESLint: ignore `public/pdf.worker.min.mjs`; resolve or waive `react-hooks/refs` in editor hooks.  
3. **Medium** — Soften pricing copy to “Demo checkout” until `feat/paywall-stripe-real`.  
4. **Medium** — Split: zip pages or single-file sequential download.  
5. **Medium** — Checkout redirect map: `editor` → `/editor`, tools → `/tools/...`.  
6. **Low** — Sanitize checkout/webhook client error bodies; fix compress filename expression; dropzone rejection message.  
7. **Process** — Add Vitest for `parsePageRange` / merge / bake (roadmap `chore/tests-vitest`).

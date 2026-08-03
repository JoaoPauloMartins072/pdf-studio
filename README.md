# Folio (pdf-studio)

Browser PDF tools with **pay-per-file** monetization — no Adobe-style subscription.

## MVP (this folder)

| Tool | Status |
|------|--------|
| Merge PDFs | Working (client-side `pdf-lib`) |
| Split / extract pages | Working |
| Compress (rebuild + object streams) | Working (light) |
| Stripe Checkout (€0.99 / file) | Wired — demo unlock without keys |
| Apple Pay / Google Pay | Via Stripe when domain verified |

## Run locally

```bash
cd pdf-studio
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Real payments (optional)

Copy env and add Stripe keys:

```bash
cp .env.example .env.local
```

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # optional until webhooks
```

Without keys, **Pay €0.99 & unlock** runs in **demo mode** (unlock + download locally).

## Product direction

1. Ship merge / split / compress + paywall  
2. Add text edit / fill forms / watermark  
3. Host (Vercel) + Stripe Apple Pay domain  
4. Optional ads on free landing pages  
5. Heavier compress / OCR server-side later  

See `ROADMAP.md`. Full conversation handoff (PT): `CONTEXTO-HANDOFF.md`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind  
- `pdf-lib` for PDF ops in the browser  
- Stripe Checkout for card / Apple Pay / Google Pay  

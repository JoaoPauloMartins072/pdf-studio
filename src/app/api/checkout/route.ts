import { NextRequest, NextResponse } from "next/server";
import { CURRENCY, PRICE_PER_PDF_CENTS } from "@/lib/folioCatalog";
import { getStripe, isStripeConfigured } from "@/lib/stripeServerClient";

/**
 * POST /api/checkout
 * Creates a Stripe Checkout session, or returns demo mode when keys are missing.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    tool?: string;
    filename?: string;
  };

  const tool = body.tool || "pdf";
  const filename = body.filename || "document.pdf";

  if (!isStripeConfigured()) {
    return NextResponse.json({
      mode: "demo",
      message:
        "Stripe not configured. Unlocking in demo mode. Add STRIPE_SECRET_KEY to enable real payments.",
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe unavailable" }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const returnPath = tool === "editor" ? "/editor" : `/tools/${tool}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: PRICE_PER_PDF_CENTS,
            product_data: {
              name: `Folio PDF — ${tool}`,
              description: `Unlock download: ${filename}`,
            },
          },
        },
      ],
      success_url: `${origin}${returnPath}?paid=1`,
      cancel_url: `${origin}${returnPath}?paid=0`,
      metadata: { tool, filename },
    });

    return NextResponse.json({ mode: "stripe", url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Checkout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

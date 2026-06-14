import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";
import { NextResponse } from "next/server";

import { getPlan } from "@/lib/plans";

const STRIPE_ENV = "test" as const;

export async function POST(request: Request) {
  let planKey: string | undefined;
  try {
    const body = (await request.json()) as { plan?: string };
    planKey = body.plan;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const plan = planKey ? getPlan(planKey) : undefined;
  if (!plan) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });

  const { data: userData } = await client.auth.getCurrentUser();
  const user = userData?.user ?? null;
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // App-owned pending record first; fulfillment flips it to paid from the webhook.
  const { data: rows, error: insertError } = await client.database
    .from("payments")
    .insert([
      {
        user_id: user.id,
        credit: plan.creditAmount,
        amount_cents: plan.amountCents,
        currency: "usd",
        status: "pending",
        provider: "stripe",
      },
    ])
    .select();

  const payment = rows?.[0];
  if (insertError || !payment) {
    console.error("checkout payment insert failed", insertError);
    return NextResponse.json({ error: "payment_create_failed" }, { status: 500 });
  }

  const origin = new URL(request.url).origin;

  const { data, error } = await client.payments.stripe.createCheckoutSession(
    STRIPE_ENV,
    {
      mode: "payment",
      lineItems: [{ priceId: plan.priceId, quantity: 1 }],
      successUrl: `${origin}/workspace?paid=1`,
      cancelUrl: `${origin}/`,
      subject: { type: "user", id: user.id },
      customerEmail: user.email ?? null,
      metadata: { payment_id: payment.id, plan: plan.key },
      idempotencyKey: `payment:${payment.id}`,
    },
  );

  if (error || !data?.checkoutSession?.url) {
    console.error("stripe checkout session failed", error);
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }

  return NextResponse.json({ url: data.checkoutSession.url });
}

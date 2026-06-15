import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";

import { getCreditPlan } from "@/lib/credits";

type PolarCheckoutResponse = {
  url?: unknown;
  id?: unknown;
};

export async function POST(request: Request) {
  let body: { planId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const planId = typeof body.planId === "string" ? body.planId : "";
  const plan = getCreditPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data: userData } = await client.auth.getCurrentUser();
  const user = userData?.user;
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const polarApiToken = process.env.POLAR_API_TOKEN;
  const productId = process.env[plan.productEnvKey];
  if (!polarApiToken || !productId) {
    console.error("polar checkout env missing", {
      hasToken: Boolean(polarApiToken),
      productEnvKey: plan.productEnvKey,
      hasProductId: Boolean(productId),
    });
    return NextResponse.json(
      { error: "checkout_not_configured" },
      { status: 500 },
    );
  }

  const appUrl = getAppUrl(request);
  const workspaceUrl = new URL("/workspace", appUrl).toString();
  const successUrl = `${workspaceUrl}?checkout_id={CHECKOUT_ID}&plan=${encodeURIComponent(
    plan.id,
  )}`;
  const returnUrl = workspaceUrl;

  const payload = {
    products: [productId],
    success_url: successUrl,
    return_url: returnUrl,
    external_customer_id: user.id,
    customer_email: user.email ?? undefined,
    customer_name:
      typeof user.profile?.name === "string" ? user.profile.name : undefined,
    metadata: {
      app: "la-musica",
      user_id: user.id,
      plan_id: plan.id,
      credit: plan.credits,
    },
    customer_metadata: {
      app_user_id: user.id,
    },
  };

  let checkout: PolarCheckoutResponse;
  try {
    const response = await fetch("https://api.polar.sh/v1/checkouts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${polarApiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("polar checkout create failed", {
        status: response.status,
        body: errorText.slice(0, 500),
      });
      return NextResponse.json(
        { error: "checkout_create_failed" },
        { status: 502 },
      );
    }

    checkout = (await response.json()) as PolarCheckoutResponse;
  } catch (err) {
    console.error("polar checkout request failed", err);
    return NextResponse.json(
      { error: "checkout_create_failed" },
      { status: 502 },
    );
  }

  if (typeof checkout.url !== "string") {
    console.error("polar checkout missing url", {
      checkoutId: checkout.id,
    });
    return NextResponse.json(
      { error: "checkout_missing_url" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: checkout.url });
}

function getAppUrl(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const requestUrl = new URL(request.url);
  return requestUrl.origin;
}

import { NextResponse } from "next/server";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";

import { CREDIT_PLANS, getCreditPlan } from "@/lib/credits";
import { createInsforgeAdminClient } from "@/lib/insforge-admin";

type PolarOrder = {
  id?: unknown;
  paid?: unknown;
  product_id?: unknown;
  total_amount?: unknown;
  currency?: unknown;
  metadata?: unknown;
  customer?: {
    external_id?: unknown;
  };
};

type FulfillmentResult = {
  status?: string;
  payment_id?: string;
  credit?: number;
};

export async function POST(request: Request) {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("polar webhook secret missing");
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(
      rawBody,
      Object.fromEntries(request.headers.entries()),
      webhookSecret,
    );
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return new NextResponse(null, { status: 403 });
    }
    console.error("polar webhook validation failed", err);
    return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
  }

  if (event.type !== "order.paid") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const order = event.data as PolarOrder;
  if (order.paid !== true) {
    return NextResponse.json({ received: true, ignored: "order_not_paid" });
  }

  const orderId = readString(order.id);
  const productId = readString(order.product_id);
  const plan = resolvePlan(order.metadata, productId);
  const userId =
    readMetadataString(order.metadata, "user_id") ??
    readString(order.customer?.external_id);

  if (!orderId || !productId || !plan || !userId) {
    console.warn("polar order ignored", {
      hasOrderId: Boolean(orderId),
      hasProductId: Boolean(productId),
      hasPlan: Boolean(plan),
      hasUserId: Boolean(userId),
    });
    return NextResponse.json({ received: true, ignored: "unmapped_order" });
  }

  const configuredProductId = process.env[plan.productEnvKey];
  if (productId !== configuredProductId) {
    console.warn("polar order product mismatch", {
      orderId,
      productId,
      planId: plan.id,
    });
    return NextResponse.json({ received: true, ignored: "product_mismatch" });
  }

  const amountCents =
    typeof order.total_amount === "number" ? order.total_amount : 0;
  const currency = readString(order.currency)?.toLowerCase() ?? "usd";

  try {
    const admin = createInsforgeAdminClient();
    const { data, error } = await admin.database.rpc(
      "fulfill_polar_credit_order",
      {
        p_user_id: userId,
        p_order_id: orderId,
        p_plan_id: plan.id,
        p_credit: plan.credits,
        p_amount_cents: amountCents,
        p_currency: currency,
      },
    );

    if (error) {
      console.error("polar fulfillment rpc failed", error);
      return NextResponse.json(
        { error: "fulfillment_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      received: true,
      result: data as FulfillmentResult,
    });
  } catch (err) {
    console.error("polar fulfillment failed", err);
    return NextResponse.json({ error: "fulfillment_failed" }, { status: 500 });
  }
}

function resolvePlan(metadata: unknown, productId: string | null) {
  const metadataPlanId = readMetadataString(metadata, "plan_id");
  const metadataPlan = metadataPlanId ? getCreditPlan(metadataPlanId) : null;
  if (metadataPlan) return metadataPlan;

  return (
    CREDIT_PLANS.find((plan) => process.env[plan.productEnvKey] === productId) ??
    null
  );
}

function readMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>)[key];
  return readString(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

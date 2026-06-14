import type { PlanKey } from "@/lib/plans";

// Posts to the checkout API and redirects the browser to Stripe Checkout.
// Unauthenticated callers are sent to /auth first. Throws on unexpected errors
// so callers can surface a failure state.
export async function startCheckout(plan: PlanKey): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });

  if (res.status === 401) {
    window.location.assign("/auth");
    return;
  }

  if (!res.ok) {
    throw new Error(`checkout failed: ${res.status}`);
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("checkout failed: missing url");
  }

  window.location.assign(data.url);
}

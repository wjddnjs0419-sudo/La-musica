import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";

type CouponErrorCode =
  | "unauthenticated"
  | "invalid_coupon"
  | "coupon_inactive"
  | "coupon_not_started"
  | "coupon_expired"
  | "coupon_sold_out"
  | "already_redeemed"
  | "server_error";

type CouponRpcResult = {
  ok?: unknown;
  code?: unknown;
  creditsGranted?: unknown;
  creditBalance?: unknown;
};

const ERROR_STATUS: Record<CouponErrorCode, number> = {
  unauthenticated: 401,
  invalid_coupon: 400,
  coupon_inactive: 409,
  coupon_not_started: 409,
  coupon_expired: 409,
  coupon_sold_out: 409,
  already_redeemed: 409,
  server_error: 500,
};

const ERROR_MESSAGES: Record<CouponErrorCode, string> = {
  unauthenticated: "Please sign in to redeem a code.",
  invalid_coupon: "Invalid code. Please check and try again.",
  coupon_inactive: "This code is no longer active.",
  coupon_not_started: "This code is not active yet.",
  coupon_expired: "This code has expired.",
  coupon_sold_out: "This code has reached its usage limit.",
  already_redeemed: "You already used this code.",
  server_error: "The code could not be redeemed. Please try again.",
};

export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return couponError("invalid_coupon");
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length > 128) {
    return couponError("invalid_coupon");
  }

  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user) {
    return couponError("unauthenticated");
  }

  const { data, error } = await client.database.rpc("redeem_credit_coupon", {
    input_code: code,
  });

  if (error) {
    console.error("coupon redemption rpc failed", error);
    return couponError("server_error");
  }

  const result = data as CouponRpcResult | null;
  if (result?.ok === true) {
    const creditsGranted =
      typeof result.creditsGranted === "number" ? result.creditsGranted : 1;
    const creditBalance =
      typeof result.creditBalance === "number" ? result.creditBalance : null;

    return NextResponse.json({
      ok: true,
      creditsGranted,
      creditBalance,
      message: `Coupon redeemed. ${creditsGranted} credit added.`,
    });
  }

  return couponError(readCouponErrorCode(result?.code));
}

function couponError(code: CouponErrorCode) {
  return NextResponse.json(
    {
      ok: false,
      error: code,
      message: ERROR_MESSAGES[code],
    },
    { status: ERROR_STATUS[code] },
  );
}

function readCouponErrorCode(value: unknown): CouponErrorCode {
  if (
    value === "unauthenticated" ||
    value === "invalid_coupon" ||
    value === "coupon_inactive" ||
    value === "coupon_not_started" ||
    value === "coupon_expired" ||
    value === "coupon_sold_out" ||
    value === "already_redeemed"
  ) {
    return value;
  }

  return "server_error";
}

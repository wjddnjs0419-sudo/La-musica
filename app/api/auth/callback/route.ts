import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";

import { createInsforgeAdminClient } from "@/lib/insforge-admin";

function redirectToAuth(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/auth?error=${error}`, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    return redirectToAuth(request, "oauth_failed");
  }

  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("insforge_code_verifier")?.value;

  if (!codeVerifier) {
    return redirectToAuth(request, "missing_verifier");
  }

  const client = createServerClient();
  const { data, error } = await client.auth.exchangeOAuthCode(
    code,
    codeVerifier,
  );

  if (error || !data?.accessToken) {
    return redirectToAuth(request, "exchange_failed");
  }

  // Default behavior: new users do not receive automatic free credits.
  // Beta credits are granted only through authenticated coupon redemption.
  if (process.env.ENABLE_SIGNUP_FREE_CREDIT === "true") {
    try {
      const sessionClient = createServerClient({
        accessToken: data.accessToken,
      });
      const { data: userData } = await sessionClient.auth.getCurrentUser();
      const userId = userData?.user?.id;
      if (userId) {
        const admin = createInsforgeAdminClient();
        await admin.database.rpc("grant_free_credit", { p_user_id: userId });
      }
    } catch (grantError) {
      console.error("free credit grant failed", grantError);
    }
  }

  const response = NextResponse.redirect(new URL("/workspace", request.url));
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  response.cookies.delete("insforge_code_verifier");

  return response;
}

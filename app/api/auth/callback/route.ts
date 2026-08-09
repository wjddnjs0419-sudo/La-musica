import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";

import { createInsforgeAdminClient } from "@/lib/insforge-admin";
import { grantFreeCreditSafely } from "@/lib/grantFreeCredit";
import { sanitizeAuthReturnPath } from "@/lib/auth-return";

function redirectToAuth(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/?auth=1&error=${error}`, request.url));
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

  // Grant the one-time free credit (5 songs). Idempotent at the DB layer
  // (ON CONFLICT DO NOTHING), so running it on every login is safe and only
  // users without a credit row are ever topped up. Never blocks login.
  try {
    const userId = data.user?.id;
    if (userId) {
      const admin = createInsforgeAdminClient();
      await grantFreeCreditSafely(admin, userId);
    }
  } catch (grantError) {
    console.error("free credit grant failed", grantError);
  }

  const returnTo = sanitizeAuthReturnPath(
    cookieStore.get("la_musica_auth_return")?.value ?? null,
  );
  const response = NextResponse.redirect(new URL(returnTo, request.url));
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  response.cookies.delete("insforge_code_verifier");
  response.cookies.delete("la_musica_auth_return");

  return response;
}

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";
import { sanitizeAuthReturnPath } from "@/lib/auth-return";

function getAppOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

function redirectToAuth(request: NextRequest, error: string) {
  return NextResponse.redirect(new URL(`/?auth=1&error=${error}`, request.url));
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const returnTo = sanitizeAuthReturnPath(
    typeof formData.get("returnTo") === "string"
      ? formData.get("returnTo") as string
      : null,
  );
  const client = createServerClient();
  const redirectTo = new URL("/api/auth/callback", getAppOrigin(request));

  const { data, error } = await client.auth.signInWithOAuth("google", {
    redirectTo: redirectTo.toString(),
    additionalParams: { prompt: "select_account" },
    skipBrowserRedirect: true,
  });

  if (error || !data?.url || !data?.codeVerifier) {
    return redirectToAuth(request, "oauth_start_failed");
  }

  const cookieStore = await cookies();
  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  cookieStore.set("la_musica_auth_return", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(data.url);
}

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies } from "@insforge/sdk/ssr";

function getAppOrigin(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/", getAppOrigin(request)),
    { status: 303 },
  );

  clearAuthCookies(response.cookies);

  const cookieStore = await cookies();
  cookieStore.delete("insforge_code_verifier");

  return response;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data } = await client.auth.getCurrentUser();

  return NextResponse.json(
    { authenticated: Boolean(data?.user) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

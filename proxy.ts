import { NextResponse, type NextRequest } from "next/server";
import {
  type CookieOptions,
  type CookieStore,
  updateSession,
} from "@insforge/sdk/ssr";

type CookieInput = { name: string; value: string } & CookieOptions;

function createRequestCookieStore(cookies: NextRequest["cookies"]): CookieStore {
  const setCookie: NonNullable<CookieStore["set"]> = (
    input: string | CookieInput,
    value?: string,
  ) => {
    if (typeof input === "string") {
      cookies.set({ name: input, value: value ?? "" });
      return;
    }

    cookies.set({ name: input.name, value: input.value });
  };

  const deleteCookie: NonNullable<CookieStore["delete"]> = (
    input: string | { name: string },
  ) => {
    cookies.delete(typeof input === "string" ? input : input.name);
  };

  return {
    get(name: string) {
      return cookies.get(name);
    },
    set: setCookie,
    delete: deleteCookie,
  };
}

function createResponseCookieStore(
  cookies: NextResponse["cookies"],
): CookieStore {
  const setCookie: NonNullable<CookieStore["set"]> = (
    input: string | CookieInput,
    value?: string,
    options?: CookieOptions,
  ) => {
    if (typeof input === "string") {
      cookies.set(input, value ?? "", options);
      return;
    }

    cookies.set(input.name, input.value, input);
  };

  const deleteCookie: NonNullable<CookieStore["delete"]> = (
    input: string | { name: string },
  ) => {
    cookies.delete(typeof input === "string" ? input : input.name);
  };

  return {
    get(name: string) {
      return cookies.get(name);
    },
    set: setCookie,
    delete: deleteCookie,
  };
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  await updateSession({
    requestCookies: createRequestCookieStore(request.cookies),
    responseCookies: createResponseCookieStore(response.cookies),
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

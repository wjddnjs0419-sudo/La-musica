import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@insforge/sdk/ssr";
import Logo from "@/components/logo";

const authErrors: Record<string, string> = {
  exchange_failed: "Google sign-in could not be completed. Please try again.",
  missing_verifier: "Your sign-in session expired. Please try again.",
  oauth_failed: "Google sign-in was cancelled or failed.",
  oauth_start_failed: "Google sign-in could not be started. Please try again.",
};

type AuthPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const cookieStore = await cookies();
  const client = createServerClient({ cookies: cookieStore });
  const { data } = await client.auth.getCurrentUser();
  if (data?.user) {
    redirect("/workspace");
  }

  const params = await searchParams;
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const errorMessage = error ? authErrors[error] : null;

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 py-10 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(circle_at_18%_88%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.07),transparent_24%),radial-gradient(circle_at_84%_8%,rgba(255,209,102,0.18),transparent_24%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(135deg,rgba(15,23,42,0.74),rgba(2,6,23,0.58)_48%,rgba(8,13,28,0.9))]"
      />

      <section className="relative w-full max-w-[470px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/18 bg-white/[0.075] px-9 py-10 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_80%_95%,rgba(125,211,252,0.1),transparent_30%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[1px] rounded-[15px] border border-white/[0.08]"
          />

          <div className="relative">
            <Link
              href="/"
              aria-label="La Musica"
              className="inline-flex text-white transition-colors hover:text-white/80"
            >
              <Logo variant="horizontal" className="h-10 w-auto" />
            </Link>
            <p className="mt-2 text-xs font-medium text-white/35">
              Moments connected through music
            </p>

            <div className="my-8 h-px w-full bg-white/[0.06]" />

            <form action="/api/auth/google" method="post">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.08] text-sm font-medium text-white/82 transition-colors hover:bg-white/[0.12] focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <svg aria-hidden className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </form>

            {errorMessage ? (
              <p className="mt-4 text-xs leading-5 text-red-200/80">
                {errorMessage}
              </p>
            ) : null}

            <p className="mx-auto mt-8 max-w-[260px] text-[10px] leading-4 text-white/28">
              By continuing, you agree to our{" "}
              <a href="/terms" className="text-white/40 hover:text-white/60">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-white/40 hover:text-white/60">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

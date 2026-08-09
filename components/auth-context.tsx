"use client";

import * as React from "react";

export type AuthIntent = "signin" | "create";

export type AuthRequest = {
  returnTo?: string;
  intent?: AuthIntent;
};

type AuthContextValue = {
  openAuth: (request?: AuthRequest) => void;
  closeAuth: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function getInitialAuthRequest(): AuthRequest | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("auth") !== "1") return null;

  return {
    returnTo: params.get("returnTo") ?? "/workspace",
    intent: params.get("intent") === "create" ? "create" : "signin",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = React.useState<AuthRequest | null>(
    getInitialAuthRequest,
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      openAuth: (nextRequest = {}) => setRequest(nextRequest),
      closeAuth: () => {
        setRequest(null);
        const url = new URL(window.location.href);
        if (url.searchParams.get("auth") === "1") {
          url.searchParams.delete("auth");
          url.searchParams.delete("error");
          url.searchParams.delete("returnTo");
          url.searchParams.delete("intent");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
      },
    }),
    [],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {request ? <AuthModal request={request} onClose={value.closeAuth} /> : null}
    </AuthContext.Provider>
  );
}

export function useAuthModal() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthModal must be used inside AuthProvider");
  }
  return context;
}

function GoogleIcon() {
  return (
    <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AuthModal({ request, onClose }: { request: AuthRequest; onClose: () => void }) {
  const error = new URLSearchParams(window.location.search).get("error");
  const errorMessage = error
    ? "Google sign-in could not be completed. Please try again."
    : null;

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 px-5 py-6 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="auth-modal-title"
        aria-modal="true"
        role="dialog"
        className="relative w-full max-w-[500px] rounded-2xl border border-white/[.14] bg-[#0a0a0a] px-7 py-8 text-center shadow-2xl shadow-black/60 sm:px-10 sm:py-10"
      >
        <button type="button" aria-label="Close sign in" onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-xl text-white/55 transition hover:bg-white/[.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/25">×</button>
        <div className="mx-auto flex items-center justify-center gap-2.5 text-white">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-white/65 text-lg leading-none">♪</span>
          <span className="text-lg font-semibold tracking-[-.04em]">La Musica</span>
        </div>
        <h1 id="auth-modal-title" className="mt-9 font-serif text-3xl leading-tight text-[#f8f4ec] sm:text-[2rem]">Your ideas deserve a soundtrack.</h1>
        <form action="/api/auth/google" method="post" className="mt-9">
          <input type="hidden" name="returnTo" value={request.returnTo ?? "/workspace"} />
          <input type="hidden" name="intent" value={request.intent ?? "signin"} />
          <button type="submit" className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-white text-sm font-semibold text-black transition hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white/45">
            <GoogleIcon />
            Continue with Google
          </button>
        </form>
        {errorMessage ? <p className="mt-4 text-xs leading-5 text-red-200/80">{errorMessage}</p> : null}
        <p className="mx-auto mt-7 max-w-[270px] text-[11px] leading-5 text-white/38">By continuing, you agree to our <a href="/terms" className="text-white/60 underline-offset-2 hover:text-white hover:underline">Terms of Service</a> and <a href="/privacy" className="text-white/60 underline-offset-2 hover:text-white hover:underline">Privacy Policy</a>.</p>
      </section>
    </div>
  );
}

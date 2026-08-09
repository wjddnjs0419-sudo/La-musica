"use client";

import * as React from "react";

import GetStartedBadge from "@/components/get-started-badge";
import { useAuthModal } from "@/components/auth-context";
import type { LandingAuthStatus } from "@/lib/landing-auth";

let authStatusPromise: Promise<boolean> | null = null;

function readAuthStatus() {
  authStatusPromise ??= fetch("/api/auth/status", {
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return false;
      const data = (await response.json()) as { authenticated?: unknown };
      return data.authenticated === true;
    })
    .catch(() => false);

  return authStatusPromise;
}

export function useLandingAuthStatus(): LandingAuthStatus {
  const [status, setStatus] = React.useState<LandingAuthStatus>("loading");

  React.useEffect(() => {
    let cancelled = false;
    readAuthStatus().then((authenticated) => {
      if (!cancelled) {
        setStatus(authenticated ? "authenticated" : "anonymous");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

type AuthAwareGetStartedBadgeProps = {
  className?: string;
  label?: string;
};

export default function AuthAwareGetStartedBadge({
  className,
  label,
}: AuthAwareGetStartedBadgeProps) {
  const { openAuth } = useAuthModal();
  const status = useLandingAuthStatus();

  if (status === "authenticated") {
    return <GetStartedBadge href="/workspace?create=1" className={className} label={label} />;
  }

  return <GetStartedBadge onClick={() => openAuth({ returnTo: "/workspace?create=1", intent: "create" })} className={className} label={label} />;
}

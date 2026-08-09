"use client";

import * as React from "react";

import GetStartedBadge from "@/components/get-started-badge";
import { useAuthModal } from "@/components/auth-context";

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

type AuthAwareGetStartedBadgeProps = {
  className?: string;
  label?: string;
};

export default function AuthAwareGetStartedBadge({
  className,
  label,
}: AuthAwareGetStartedBadgeProps) {
  const { openAuth } = useAuthModal();
  const [authenticated, setAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    readAuthStatus().then((authenticated) => {
        if (!cancelled) setAuthenticated(authenticated);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authenticated) {
    return <GetStartedBadge href="/workspace?create=1" className={className} label={label} />;
  }

  return <GetStartedBadge onClick={() => openAuth({ returnTo: "/workspace?create=1", intent: "create" })} className={className} label={label} />;
}

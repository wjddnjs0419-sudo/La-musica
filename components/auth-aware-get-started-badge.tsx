"use client";

import * as React from "react";

import GetStartedBadge from "@/components/get-started-badge";

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
  const [href, setHref] = React.useState("/auth");

  React.useEffect(() => {
    let cancelled = false;

    readAuthStatus().then((authenticated) => {
      if (!cancelled && authenticated) setHref("/workspace");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <GetStartedBadge href={href} className={className} label={label} />;
}

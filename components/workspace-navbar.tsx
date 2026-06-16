"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import Logo from "@/components/logo";

type WorkspaceNavbarUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

type WorkspaceNavbarProps = {
  user?: WorkspaceNavbarUser | null;
  onOpenCreditModal?: () => void;
};

function getInitial(user?: WorkspaceNavbarUser | null) {
  const source = user?.name || user?.email || "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

function MusicNoteIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M9 18.5V6.75L18 5v11.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 18.5c0 1.1-1.12 2-2.5 2S4 19.6 4 18.5 5.12 16.5 6.5 16.5 9 17.4 9 18.5ZM18 16.5c0 1.1-1.12 2-2.5 2s-2.5-.9-2.5-2 1.12-2 2.5-2 2.5.9 2.5 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export default function WorkspaceNavbar({
  user,
  onOpenCreditModal,
}: WorkspaceNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    window.dispatchEvent(
      new CustomEvent("workspace-search", {
        detail: event.target.value,
      }),
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
      <div className="relative flex flex-wrap items-center gap-3 px-1 py-3 sm:flex-nowrap sm:gap-4 sm:px-2">
        <Link
          href="/"
          aria-label="La Musica"
          className="relative order-1 shrink-0 text-white transition-colors hover:text-white/80 sm:order-none"
        >
          <Logo className="h-7 w-auto sm:h-8" />
        </Link>

        <div className="relative order-3 flex w-full justify-center sm:order-none sm:flex-1">
          <div className="relative w-full sm:max-w-md">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="m20 20-3-3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              aria-label="Search"
              placeholder="Search..."
              onChange={handleSearchChange}
              className="h-10 w-full rounded-full border border-white/12 bg-white/[0.05] pl-10 pr-4 text-sm text-white placeholder:text-white/35 transition-colors focus:border-white/25 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/10"
            />
          </div>
        </div>

        <div
          ref={menuRef}
          className="relative order-2 ml-auto shrink-0 sm:order-none sm:ml-0"
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                {getInitial(user)}
              </span>
            )}
          </button>

          <div
            role="menu"
            className={`fixed right-3 top-[7.25rem] w-44 pt-2 transition-all duration-150 sm:absolute sm:right-0 sm:top-full ${
              menuOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            }`}
          >
            <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white/[0.08] p-1.5 backdrop-blur-xl backdrop-saturate-150">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
              />
              {user?.email ? (
                <p className="truncate px-3 py-1.5 text-xs text-white/40">
                  {user.email}
                </p>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/15"
                onClick={() => {
                  onOpenCreditModal?.();
                  setMenuOpen(false);
                }}
              >
                <MusicNoteIcon />
                Upgrade
              </button>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

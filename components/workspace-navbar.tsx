"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import Logo from "@/components/logo";

type WorkspaceNavbarUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

type WorkspaceNavbarProps = {
  user?: WorkspaceNavbarUser | null;
  remainingCredit?: number;
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
  remainingCredit = 0,
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

  return (
    <header className="z-50 h-[90px] shrink-0 border-b border-white/10">
      <div className="relative flex h-full items-center gap-8 px-6 sm:px-10 lg:px-12">
        <Link
          href="/"
          aria-label="La Musica"
          className="shrink-0 text-[#f4f1ea] transition-colors hover:text-white"
        >
          <Logo className="h-7 w-auto" />
        </Link>
        <p className="hidden text-sm text-white/45 sm:block">Your generated music</p>

        <div
          ref={menuRef}
          className="relative ml-auto flex items-center gap-4"
        >
          <button
            type="button"
            onClick={onOpenCreditModal}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:border-white/35 hover:text-white"
          >
            Credits <span className="ml-2 border-l border-white/15 pl-2 tabular-nums text-white">{remainingCredit}</span>
          </button>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#111113] transition hover:border-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white/85">
                {getInitial(user)}
              </span>
            )}
          </button>

          <div
            role="menu"
            className={`absolute right-0 top-[calc(100%+10px)] w-56 transition-all duration-150 ${
              menuOpen
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            }`}
          >
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#111113] p-2 shadow-2xl">
              <div className="border-b border-white/10 px-3 pb-3 pt-2">
                <p className="text-[11px] uppercase tracking-[0.13em] text-white/35">Account</p>
              {user?.email ? (
                <p className="mt-1 truncate text-sm text-white/70">
                  {user.email}
                </p>
              ) : null}
              </div>
              <div className="pt-2">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-[#f4f1ea] transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/15"
                onClick={() => {
                  onOpenCreditModal?.();
                  setMenuOpen(false);
                }}
              >
                <span className="flex items-center gap-2"><MusicNoteIcon />Upgrade</span>
                <span aria-hidden className="text-white/35">→</span>
              </button>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-white/55 transition hover:bg-white/[0.06] hover:text-white"
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
      </div>
    </header>
  );
}

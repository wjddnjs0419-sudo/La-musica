"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { Cutive_Mono } from "next/font/google";

import CreditModal from "@/components/credit-modal";

const cutiveMono = Cutive_Mono({
  subsets: ["latin"],
  weight: "400",
});

type WorkspaceNavbarUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

type WorkspaceNavbarProps = {
  user?: WorkspaceNavbarUser | null;
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

export default function WorkspaceNavbar({ user }: WorkspaceNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  const displayName = user?.name || user?.email?.split("@")[0] || "Guest";

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    window.dispatchEvent(
      new CustomEvent("workspace-search", {
        detail: event.target.value,
      }),
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-4 sm:px-6 lg:px-8">
      <div className="relative flex items-center gap-4 px-1 py-3 sm:px-2">
        <Link
          href="/"
          className={`${cutiveMono.className} relative shrink-0 text-lg font-bold tracking-[0.14em] text-white transition-colors hover:text-white/80 sm:text-xl`}
        >
          La Musica
        </Link>

        <div className="relative flex flex-1 justify-center">
          <div className="relative w-full max-w-md">
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
          className="relative shrink-0"
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
        >
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.05] py-1 pl-1 pr-3 transition-colors hover:bg-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/15"
          >
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
                {getInitial(user)}
              </span>
            )}
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-white/85 sm:block">
              {displayName}
            </span>
          </button>

          <div
            role="menu"
            className={`absolute right-0 top-full w-44 pt-2 transition-all duration-150 ${
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
                  setCreditModalOpen(true);
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
      <CreditModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
      />
    </header>
  );
}

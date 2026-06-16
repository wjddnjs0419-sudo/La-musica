"use client";

import * as React from "react";

import CreditModal from "@/components/credit-modal";
import MusicWorkspace from "@/components/music-workspace";
import WorkspaceNavbar from "@/components/workspace-navbar";
import type { Music } from "@/lib/music";

type WorkspaceShellUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

type WorkspaceShellProps = {
  user?: WorkspaceShellUser | null;
  initialTracks?: Music[];
  initialCredit?: number;
};

export default function WorkspaceShell({
  user,
  initialTracks = [],
  initialCredit = 0,
}: WorkspaceShellProps) {
  const [creditModalOpen, setCreditModalOpen] = React.useState(false);

  return (
    <>
      <WorkspaceNavbar
        user={user}
        onOpenCreditModal={() => setCreditModalOpen(true)}
      />
      <MusicWorkspace
        initialTracks={initialTracks}
        initialCredit={initialCredit}
        onOpenCreditModal={() => setCreditModalOpen(true)}
      />
      <CreditModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
      />
    </>
  );
}

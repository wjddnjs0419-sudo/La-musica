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
  loadInitialData?: boolean;
};

export default function WorkspaceShell({
  user,
  initialTracks = [],
  initialCredit = 0,
  loadInitialData = false,
}: WorkspaceShellProps) {
  const [creditModalOpen, setCreditModalOpen] = React.useState(false);
  const [remainingCredit, setRemainingCredit] = React.useState(initialCredit);

  return (
    <>
      <WorkspaceNavbar
        user={user}
        onOpenCreditModal={() => setCreditModalOpen(true)}
      />
      <MusicWorkspace
        initialTracks={initialTracks}
        remainingCredit={remainingCredit}
        onRemainingCreditChange={setRemainingCredit}
        onOpenCreditModal={() => setCreditModalOpen(true)}
        loadInitialData={loadInitialData}
      />
      <CreditModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        onCreditRedeemed={setRemainingCredit}
      />
    </>
  );
}

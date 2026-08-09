"use client";

import * as React from "react";

import CreditModal from "@/components/credit-modal";
import MusicWorkspace from "@/components/workspace/WorkspaceShell";
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
  const [currentUser, setCurrentUser] =
    React.useState<WorkspaceShellUser | null>(user ?? null);
  const [remainingCredit, setRemainingCredit] = React.useState(initialCredit);

  return (
    <>
      <WorkspaceNavbar
        user={currentUser}
        remainingCredit={remainingCredit}
        onOpenCreditModal={() => setCreditModalOpen(true)}
      />
      <MusicWorkspace
        initialTracks={initialTracks}
        remainingCredit={remainingCredit}
        onUserChange={setCurrentUser}
        onRemainingCreditChange={setRemainingCredit}
        onOpenCreditModal={() => setCreditModalOpen(true)}
        loadInitialData={loadInitialData}
      />
      <CreditModal
        open={creditModalOpen}
        onClose={() => setCreditModalOpen(false)}
        creditBalance={remainingCredit}
        onCreditRedeemed={setRemainingCredit}
      />
    </>
  );
}

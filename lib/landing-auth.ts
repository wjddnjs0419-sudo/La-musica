export type LandingAuthStatus = "loading" | "anonymous" | "authenticated";

export type LandingHeaderAction = "signIn" | "workspace" | "create";

export function resolveLandingHeaderActions(
  status: LandingAuthStatus,
): LandingHeaderAction[] {
  if (status === "loading") return [];
  if (status === "authenticated") return ["workspace", "create"];
  return ["signIn", "create"];
}

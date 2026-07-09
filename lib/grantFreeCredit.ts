interface GrantFreeCreditAdmin {
  database: {
    rpc: (
      fn: string,
      args?: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  };
}

export async function grantFreeCreditSafely(
  admin: GrantFreeCreditAdmin,
  userId: string,
): Promise<{ granted: boolean }> {
  try {
    const { data, error } = await admin.database.rpc("grant_free_credit", {
      p_user_id: userId,
    });

    if (error) {
      console.error("free credit grant failed", error);
      return { granted: false };
    }

    const status = (data as { status?: string } | null)?.status;
    return { granted: status === "granted" };
  } catch (thrown) {
    console.error("free credit grant failed", thrown);
    return { granted: false };
  }
}

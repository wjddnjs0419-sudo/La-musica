export const DEFAULT_AUTH_RETURN_PATH = "/workspace";

export function sanitizeAuthReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_RETURN_PATH;
  }

  return value;
}

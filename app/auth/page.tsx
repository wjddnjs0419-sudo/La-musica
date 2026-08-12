import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type AuthPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams({ auth: "1" });
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;
  const returnTo = Array.isArray(params?.returnTo)
    ? params.returnTo[0]
    : params?.returnTo;
  if (error) query.set("error", error);
  if (returnTo) query.set("returnTo", returnTo);
  redirect(`/?${query.toString()}`);
}

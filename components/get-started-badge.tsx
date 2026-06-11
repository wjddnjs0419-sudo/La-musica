import Link from "next/link";

type GetStartedBadgeProps = {
  href?: string;
  className?: string;
};

export default function GetStartedBadge({
  href = "/auth",
  className = "",
}: GetStartedBadgeProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-[20px] border border-white/70 bg-transparent px-4 py-2 text-sm font-medium leading-none text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-black ${className}`}
    >
      Get Started
    </Link>
  );
}

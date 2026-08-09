import Link from "next/link";

type GetStartedBadgeProps = {
  href?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
};

export default function GetStartedBadge({
  href = "/?auth=1",
  label,
  className = "",
  onClick,
}: GetStartedBadgeProps) {
  const displayLabel =
    label ?? (href?.startsWith("/workspace") ? "Open Workspace" : "Get Started");

  if (onClick) {
    return <button type="button" onClick={onClick} className={`inline-flex items-center justify-center rounded-[20px] border border-white/70 bg-transparent px-4 py-2 text-sm font-medium leading-none text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-black ${className}`}>{displayLabel}</button>;
  }

  return (
    <Link
      href={href ?? "/workspace"}
      className={`inline-flex items-center justify-center rounded-[20px] border border-white/70 bg-transparent px-4 py-2 text-sm font-medium leading-none text-white transition-colors duration-200 hover:border-white hover:bg-white hover:text-black ${className}`}
    >
      {displayLabel}
    </Link>
  );
}

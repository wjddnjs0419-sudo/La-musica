import Link from "next/link";
import GetStartedBadge from "@/components/get-started-badge";
import Logo from "@/components/logo";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

type HeaderSectionProps = {
  ctaHref?: string;
};

export default function HeaderSection({ ctaHref }: HeaderSectionProps) {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="flex w-full items-center justify-between px-3 py-5 sm:px-4 lg:px-20">
        <Link href="/" aria-label="La Musica" className="text-white">
          <Logo className="h-9 w-auto sm:h-10" />
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav aria-label="Primary" className="flex items-center gap-6 sm:gap-8">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-white/75 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <GetStartedBadge href={ctaHref} />
        </div>
      </div>
    </header>
  );
}

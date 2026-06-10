import Link from "next/link";
import { Cutive_Mono } from "next/font/google";
import GetStartedBadge from "@/components/get-started-badge";

const cutiveMono = Cutive_Mono({
  subsets: ["latin"],
  weight: "400",
});

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

export default function HeaderSection() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="flex w-full items-center justify-between px-3 py-5 sm:px-4 lg:px-20">
        <Link
          href="/"
          className={`${cutiveMono.className} text-xl font-bold tracking-[0.16em] text-white sm:text-[1.55rem]`}
        >
          La Musica
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

          <GetStartedBadge />
        </div>
      </div>
    </header>
  );
}

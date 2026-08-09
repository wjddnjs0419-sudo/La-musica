import Image from "next/image";

type LogoProps = {
  className?: string;
  title?: string;
  variant?: "icon" | "horizontal";
};

const ICON_SOURCE = "/logo icon.png";
const WORDMARK_SOURCE = "/wordmark.png";

export default function Logo({
  className,
  title = "La Musica",
  variant = "icon",
}: LogoProps) {
  if (variant === "icon") {
    return <Image src={ICON_SOURCE} alt={title} width={303} height={168} className={className} />;
  }

  return (
    <span role="img" aria-label={title} className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      <Image src={ICON_SOURCE} alt="" width={303} height={168} className="h-full w-auto" />
      <Image src={WORDMARK_SOURCE} alt="" width={702} height={262} className="h-full w-auto" />
    </span>
  );
}

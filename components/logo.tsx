type LogoProps = {
  className?: string;
  title?: string;
  variant?: "icon" | "horizontal";
};

const SOURCES = {
  icon: "/logo-icon-dark.svg",
  horizontal: "/logo-horizontal-dark.svg",
};

/**
 * La Musica brand mark. All current usages sit on dark backgrounds, so this
 * always renders the dark-UI variant (gradient symbol, white wordmark).
 */
export default function Logo({
  className,
  title = "La Musica",
  variant = "icon",
}: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand asset, no need for optimization
    <img
      src={SOURCES[variant]}
      alt={title}
      className={className}
      style={{ display: "block" }}
    />
  );
}

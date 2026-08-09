const steps = [
  ["01", "Write your lyrics", "Start with your own words, a feeling, or a simple idea."],
  ["02", "Shape your sound", "Choose a genre, mood, and the details that fit your track."],
  ["03", "Get your song", "La Musica turns the input into a complete track you can hear."],
] as const;

export default function HowItWorksSection() {
  return <section className="px-5 py-20 sm:px-8 sm:py-28 lg:px-12"><div className="mx-auto max-w-[90rem]"><p className="text-xs font-semibold uppercase tracking-[.16em] text-white/45">How it works</p><div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">{steps.map(([number, title, description], index) => <article key={number} className={`border-white/10 ${index < 2 ? "md:border-r md:pr-10" : ""} ${index > 0 ? "md:pl-10" : ""}`}><p className="font-mono text-xs tracking-[.16em] text-white/35">{number}</p><h2 className="mt-6 text-3xl font-semibold tracking-[-.04em] text-white">{title}</h2><p className="mt-4 max-w-xs text-sm leading-6 text-white/55">{description}</p></article>)}</div></div></section>;
}

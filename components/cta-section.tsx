import GetStartedBadge from "@/components/get-started-badge";
import LineWaves from "@/components/LineWaves";

export default function CtaSection() {
  return (
    <section className="relative isolate overflow-hidden px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <LineWaves
          speed={0.3}
          innerLineCount={32}
          outerLineCount={36}
          warpIntensity={1}
          rotation={-45}
          edgeFadeWidth={0}
          colorCycleSpeed={1}
          brightness={0.2}
          color1="#00296a"
          color2="#a4aab2"
          color3="#6c7d98"
          enableMouseInteraction
          mouseInfluence={2}
        />
      </div>

      <div className="pointer-events-none mx-auto flex max-w-3xl flex-col items-center text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Your next track starts here.
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
          Describe a mood, a melody, or a moment — Musica turns it into a finished
          song in seconds.
        </p>
        <div className="pointer-events-auto mt-8">
          <GetStartedBadge href="/auth" />
        </div>
      </div>
    </section>
  );
}

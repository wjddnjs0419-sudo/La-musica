"use client";

import { LiquidMetal, liquidMetalPresets } from "@paper-design/shaders-react";
import GetStartedBadge from "@/components/get-started-badge";

type HeroSectionProps = {
  ctaHref?: string;
};

export default function HeroSection({ ctaHref }: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-10 pt-3 sm:px-8 lg:px-12 lg:pb-14 lg:pt-4">
      <div className="mx-auto grid max-w-7xl gap-8 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] lg:gap-12">
        <div className="relative order-2 min-h-[13rem] sm:min-h-[18rem] lg:order-1 lg:min-h-[34rem]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[20rem] w-[20rem] -translate-x-1/2 -translate-y-1/2 sm:h-[28rem] sm:w-[28rem] lg:left-[-10%] lg:h-[40rem] lg:w-[40rem] lg:translate-x-0"
            style={{
              WebkitMaskImage:
                "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
              maskImage:
                "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 72%, rgba(0,0,0,0) 100%)",
            }}
          >
          <LiquidMetal
            {...liquidMetalPresets[2]}
            colorBack="rgba(0, 0, 0, 0)"
            colorTint="#ffffff"
            webGlContextAttributes={{ alpha: true, premultipliedAlpha: true }}
            aria-hidden
            className="absolute inset-0 h-full w-full scale-[1.18] opacity-100 mix-blend-screen"
            style={{ minHeight: "100%" }}
          />
          </div>
        </div>

        <div className="order-1 flex items-center pt-6 sm:pt-8 lg:order-2 lg:pl-[20px] lg:pt-0">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-semibold leading-[0.96] text-white sm:text-6xl lg:text-7xl xl:text-8xl">
              Show your Creativity by Musica
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              Turn your ideas into complete, ready-to-share music with the power
              of AI. From a simple concept, melody, or mood, create polished
              tracks faster and more effortlessly than ever.
            </p>
            <div className="mt-6">
              <GetStartedBadge href={ctaHref} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

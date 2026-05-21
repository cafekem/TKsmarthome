"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/branding/Logo";

/**
 * Mountain-landscape hero with a floating product mockup.
 * Word-by-word CSS slide-up animation for the headline,
 * and a macOS window-frame screenshot that scales up from behind.
 *
 * Uses pure CSS @keyframes — no framer-motion dependency so animations
 * fire immediately at paint time without waiting for JS hydration.
 */

/** Each word gets a slightly later delay for the cascade effect */
const WORDS: { text: string; italic?: boolean }[][] = [
  [{ text: "Design" }, { text: "security" }, { text: "systems" }],
  [
    { text: "the" },
    { text: "way" },
    { text: "you" },
    { text: "actually", italic: true },
  ],
  [{ text: "experience" }, { text: "them." }],
];

export function Hero() {
  let wordIndex = 0;

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background image — bright mountain scene with light wash for text readability */}
      <div className="absolute inset-0 -z-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/hero-mountains.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover"
        />
        {/* Light wash — softens the sky so dark text pops cleanly */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.50) 40%, rgba(255,255,255,0.15) 65%, transparent 80%)",
          }}
        />
        {/* Bottom fade into the page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-64"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, var(--background) 100%)",
          }}
        />
      </div>

      {/* Overlay nav */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-slate-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]"
          >
            <span className="flex size-8 items-center justify-center">
              <LogoMark strokeWidth={1.8} />
            </span>
            <span className="text-[1.05rem] font-medium tracking-[-0.01em]">
              DeeperVision
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-[0.92rem] text-slate-700 sm:flex">
            <Link
              href="#features"
              className="transition-colors hover:text-slate-900"
            >
              Features
            </Link>
            <Link
              href="/design/new"
              className="transition-colors hover:text-slate-900"
            >
              Editor
            </Link>
            <Link
              href="#pricing"
              className="transition-colors hover:text-slate-900"
            >
              Pricing
            </Link>
          </nav>
        </div>
      </header>

      {/* Inline keyframes — scoped to this component */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes hero-word-up {
  from { opacity: 0; transform: translateY(100%); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hero-fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hero-mockup-in {
  from { opacity: 0; transform: translateY(60px) scale(0.94); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-36 pb-10 sm:pt-40">
        {/* ── Headline — word-by-word cascade ── */}
        <h1
          className="max-w-4xl text-center text-slate-900 text-[2.75rem] leading-[1.08] font-bold sm:text-[4rem] md:text-[4.8rem]"
          style={{
            fontFamily: "var(--font-display), system-ui, sans-serif",
            letterSpacing: "-0.025em",
          }}
        >
          {WORDS.map((line, li) => (
            <span key={li} className="block overflow-hidden">
              {line.map((w, wi) => {
                const delay = 0.1 + wordIndex * 0.07;
                wordIndex++;
                return (
                  <span
                    key={`${li}-${wi}`}
                    className={`inline-block ${
                      wi < line.length - 1 ? "mr-[0.28em]" : ""
                    } ${w.italic ? "text-slate-700 italic" : ""}`}
                    style={{
                      opacity: 0,
                      animation: `hero-word-up 0.55s cubic-bezier(0.22, 0.68, 0.35, 1) ${delay}s forwards`,
                    }}
                  >
                    {w.text}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>

        {/* ── CTA button ── */}
        <div
          className="mt-10"
          style={{
            opacity: 0,
            animation:
              "hero-fade-up 0.6s cubic-bezier(0.22, 0.68, 0.35, 1) 0.9s forwards",
          }}
        >
          <Link
            href="/design/new"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-slate-900 px-6 py-3 text-[0.95rem] font-medium text-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.3)] transition-all hover:bg-slate-800 hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.4)]"
          >
            <span>Open the editor</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* ── Product mockup — macOS window frame ── */}
        <div
          className="relative mt-16 w-full max-w-5xl sm:mt-20"
          style={{
            opacity: 0,
            animation:
              "hero-mockup-in 1.1s cubic-bezier(0.16, 0.77, 0.29, 0.98) 0.85s forwards",
          }}
        >
          {/* Subtle shadow behind the mockup */}
          <div
            className="pointer-events-none absolute -inset-8 -z-10 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0, 0, 0, 0.08), transparent 70%)",
            }}
          />

          {/* macOS window chrome */}
          <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#1c1c1e] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.06)]">
            {/* Title bar — dark chrome to match dark mode screenshot */}
            <div className="flex items-center gap-2 px-4 py-[10px] border-b border-white/[0.06] bg-[#2a2a2c]">
              <div className="flex gap-[7px]">
                <div className="size-[11px] rounded-full bg-[#ff5f57]" />
                <div className="size-[11px] rounded-full bg-[#febc2e]" />
                <div className="size-[11px] rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 text-center text-[11px] text-white/30 font-medium tracking-wide">
                DeeperVision — 3D Security Design
              </div>
              <div className="w-[52px]" />
            </div>

            {/* Screenshot content */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/app-screenshot.png"
              alt="DeeperVision 3D editor showing a security system design with cameras mounted on poles, sensor coverage rings, and a walkable office floor plan"
              className="w-full"
              loading="eager"
            />
          </div>

          {/* Soft fade at the bottom — keep it light */}
          <div
            className="pointer-events-none absolute -bottom-1 inset-x-0 h-16 z-10"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, var(--background) 100%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

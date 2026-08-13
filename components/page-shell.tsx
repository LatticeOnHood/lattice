"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ACCENT, FONT_STACK } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ClipLines, Reveal } from "@/components/motion";

/** Shared frame for the Roadmap and Whitepaper sub-pages. */
export function PageShell({
  eyebrow,
  titleLines,
  intro,
  children,
}: {
  eyebrow: string;
  titleLines: string[];
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT_STACK }}>
      <SiteNav />

      <header className="px-5 pb-16 pt-16 sm:px-8 md:px-12 md:pb-24 md:pt-24">
        <Reveal>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/55">
            {eyebrow}
          </span>
        </Reveal>

        <h1
          className="mt-4 uppercase text-black"
          style={{
            fontSize: "clamp(2rem, 8vw, 7rem)",
            lineHeight: 0.9,
            fontWeight: 600,
          }}
        >
          <ClipLines lines={titleLines} baseDelay={0.2} />
        </h1>

        <Reveal index={2}>
          <p className="mt-8 max-w-2xl text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs md:text-sm">
            {intro}
          </p>
        </Reveal>
      </header>

      <main className="px-5 pb-24 sm:px-8 md:px-12">{children}</main>

      <div className="px-5 pb-20 sm:px-8 md:px-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-base uppercase tracking-wide sm:text-xl"
          style={{ color: ACCENT, fontWeight: 600 }}
        >
          Back To Home
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </div>

      <SiteFooter />
    </div>
  );
}

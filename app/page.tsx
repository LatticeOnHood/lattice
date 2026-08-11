"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ACCENT, FONT_STACK, SURFACE, VIDEO_URL } from "@/lib/brand";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  ClipLines,
  Reveal,
  SpinningBadge,
  SpinningRings,
  fadeUp,
} from "@/components/motion";

const STATS = [
  { symbol: "/", value: "5", label: "Checks Per\nReport" },
  { symbol: "/", value: "2", label: "Social\nPlatforms" },
  { symbol: "/", value: "0", label: "Funds\nTouched" },
];

const STEPS = [
  {
    n: "01",
    title: "Tag The Bot",
    body: "Reply, quote or DM @LatticeBot with a token contract address. No wallet connection, no signature, no gas.",
  },
  {
    n: "02",
    title: "Lattice Reads The Chain",
    body: "Every query is read-only. Liquidity pools, holder lists, supply and contract source are pulled live from the chain and its explorer.",
  },
  {
    n: "03",
    title: "Get The Receipt",
    body: "A compact scorecard threads back in-reply: verdict, liquidity, top-10 holders, market cap, LP lock and ownership status.",
  },
];

const CHECKS = [
  {
    title: "Liquidity",
    body: "Total liquidity across known DEX pools, and whether LP tokens are locked or burned — and until when.",
  },
  {
    title: "Holder Analysis",
    body: "Holder count and top-10 / top-50 concentration, separating known LP, CEX and burn addresses from unlabeled wallets.",
  },
  {
    title: "Market Cap / FDV",
    body: "Computed from circulating and total supply against current price.",
  },
  {
    title: "Contract Signals",
    body: "Ownership renounced? Mint disabled? Upgradeable proxy? Source verified on the explorer?",
  },
  {
    title: "Honeypot Sell-Test",
    body: "A simulated buy-then-sell catches tokens that can be bought but never sold.",
  },
];

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Some browsers only honour autoplay when muted is set as a property.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {});
  }, []);

  return (
    <div className="bg-white" style={{ fontFamily: FONT_STACK }}>
      {/* ---------------------------------------------------------------- HERO */}
      <div className="relative min-h-screen w-full overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_URL}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        />
        {/* Light scrim keeps the black type legible over moving footage. */}
        <div className="absolute inset-0 bg-white/25" aria-hidden="true" />

        <main className="relative z-10 flex min-h-screen flex-col">
          <SiteNav />

          {/* Stats */}
          <section className="flex flex-1 items-center justify-end px-5 py-8 sm:px-8 md:px-12 md:py-0">
            <div className="flex flex-row gap-5 sm:gap-8 md:gap-10">
              {STATS.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i + 2}
                  className="text-right"
                >
                  <div
                    className="leading-none text-black"
                    style={{ fontSize: "clamp(1.5rem, 5vw, 3.5rem)", fontWeight: 600 }}
                  >
                    <span style={{ color: ACCENT, fontSize: "0.5em" }}>
                      {stat.symbol}
                    </span>
                    {stat.value}
                  </div>
                  <div className="whitespace-pre-line text-[10px] font-semibold uppercase leading-tight tracking-widest text-black sm:text-xs md:text-sm">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Bottom content */}
          <div className="flex flex-col gap-6 px-5 pb-8 sm:px-8 md:gap-12 md:px-12 md:pb-12">
            <div className="flex items-center justify-between gap-4">
              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={5}
                className="max-w-[130px] text-[10px] font-semibold uppercase tracking-widest text-black sm:max-w-[160px] sm:text-xs md:max-w-xs md:text-sm"
              >
                Tag The Bot
                <br />
                Get The Receipt
                <br />
                Before You Buy
              </motion.p>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={6}
              >
                <Link
                  href="/whitepaper"
                  className="flex items-center gap-1 whitespace-nowrap text-base uppercase tracking-wide sm:text-xl md:text-2xl"
                  style={{ color: ACCENT, fontWeight: 600 }}
                >
                  Read Whitepaper
                  <ArrowUpRight className="h-[18px] w-[18px] sm:h-[22px] sm:w-[22px]" />
                </Link>
              </motion.div>
            </div>

            <div className="flex items-end justify-between gap-3 sm:gap-4">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={7}
                className="w-[120px] shrink-0 sm:w-[180px] md:w-[280px]"
              >
                <p className="text-left text-[9px] font-semibold uppercase tracking-widest text-black sm:text-xs md:text-right md:text-sm">
                  On-Chain Verification Delivered Natively In Your X Timeline
                </p>
              </motion.div>

              <h1
                className="text-right uppercase text-black"
                style={{
                  fontSize: "clamp(2rem, 9vw, 9rem)",
                  lineHeight: 0.88,
                  fontWeight: 600,
                }}
              >
                <ClipLines
                  lines={["Verify", "Before", "You Buy"]}
                  baseDelay={0.4}
                />
              </h1>
            </div>
          </div>
        </main>
      </div>

      {/* ------------------------------------------------------------ PROTOCOL */}
      <section
        id="protocol"
        className="relative overflow-hidden px-5 py-20 sm:px-8 md:px-12 md:py-28"
        style={{ backgroundColor: SURFACE }}
      >
        <SpinningRings
          size={420}
          className="pointer-events-none absolute -right-32 -top-32 hidden md:block"
        />

        <div className="relative z-10">
          <Reveal>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
              How It Works
            </span>
          </Reveal>

          <h2
            className="mt-4 uppercase text-black"
            style={{
              fontSize: "clamp(1.75rem, 6vw, 4.5rem)",
              lineHeight: 0.9,
              fontWeight: 600,
            }}
          >
            <ClipLines lines={["Three Seconds", "To A Verdict"]} inView />
          </h2>

          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} index={i} className="border-t border-black/15 pt-5">
                <span
                  className="text-sm font-semibold tracking-widest"
                  style={{ color: ACCENT }}
                >
                  {step.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold uppercase tracking-widest text-black md:text-xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- CHECKS */}
      <section
        id="checks"
        className="relative overflow-hidden bg-white px-5 py-20 sm:px-8 md:px-12 md:py-28"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
                The Report
              </span>
            </Reveal>
            <h2
              className="mt-4 uppercase text-black"
              style={{
                fontSize: "clamp(1.75rem, 6vw, 4.5rem)",
                lineHeight: 0.9,
                fontWeight: 600,
              }}
            >
              <ClipLines lines={["Every Check", "In One Reply"]} inView />
            </h2>
          </div>
          <SpinningBadge
            text="LATTICE • READ-ONLY • NO CUSTODY • "
            size={120}
            className="hidden shrink-0 md:block"
          />
        </div>

        <ul className="mt-14 grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((check, i) => (
            <Reveal
              key={check.title}
              index={i}
              as="li"
              className="bg-white p-6 md:p-8"
            >
              <h3 className="text-base font-semibold uppercase tracking-widest text-black">
                {check.title}
              </h3>
              <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs">
                {check.body}
              </p>
            </Reveal>
          ))}
          <Reveal index={5} as="li" className="bg-white p-6 md:p-8">
            <h3
              className="text-base font-semibold uppercase tracking-widest"
              style={{ color: ACCENT }}
            >
              Promises Kept
            </h3>
            <p className="mt-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs">
              For self-verified projects, Lattice re-checks declared tokenomics
              against actual on-chain state — and flags what does not match.
            </p>
          </Reveal>
        </ul>
      </section>

      {/* ------------------------------------------------------ PROMISES KEPT */}
      <section
        className="relative overflow-hidden px-5 py-20 sm:px-8 md:px-12 md:py-28"
        style={{ backgroundColor: SURFACE }}
      >
        <div className="flex flex-col items-start gap-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <Reveal>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
                The Differentiator
              </span>
            </Reveal>
            <h2
              className="mt-4 uppercase text-black"
              style={{
                fontSize: "clamp(1.75rem, 6vw, 4rem)",
                lineHeight: 0.9,
                fontWeight: 600,
              }}
            >
              <ClipLines lines={["Did They Keep", "Their Promises?"]} inView />
            </h2>
            <Reveal index={2}>
              <p className="mt-6 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs md:text-sm">
                Projects register their declared tokenomics — supply, LP lock,
                treasury, vesting. Lattice re-checks the chain against those
                commitments and reports the result plainly.
              </p>
            </Reveal>
            <Reveal index={3}>
              <div className="mt-8 flex flex-col gap-3">
                <span className="border-l-2 pl-4 text-[11px] font-semibold uppercase tracking-widest text-black/70 sm:text-xs" style={{ borderColor: ACCENT }}>
                  &ldquo;Declared 70% to LP, locked — confirmed on-chain.&rdquo;
                </span>
                <span className="border-l-2 border-black/20 pl-4 text-[11px] font-semibold uppercase tracking-widest text-black/70 sm:text-xs">
                  &ldquo;Declared 12-month vault lock — vault emptied early, flagged.&rdquo;
                </span>
              </div>
            </Reveal>
          </div>

          <SpinningBadge
            text="PROMISES KEPT • VERIFIED ON-CHAIN • "
            size={200}
            duration={22}
            reverse
            className="mx-auto shrink-0 md:mx-0"
          />
        </div>
      </section>

      {/* --------------------------------------------------------------- PAGES */}
      <section className="bg-white px-5 py-20 sm:px-8 md:px-12 md:py-28">
        <div className="grid gap-px overflow-hidden border border-black/10 bg-black/10 md:grid-cols-2">
          {[
            {
              href: "/roadmap",
              label: "Roadmap",
              body: "Five phases from the read-only engine to multi-chain coverage.",
            },
            {
              href: "/whitepaper",
              label: "Whitepaper",
              body: "The protocol, the report, the architecture and the limits.",
            },
          ].map((page, i) => (
            <Reveal key={page.href} index={i} className="bg-white">
              <Link
                href={page.href}
                className="group flex h-full flex-col justify-between gap-10 p-8 transition-colors hover:bg-black/[0.03] md:p-12"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
                  Read
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      className="uppercase text-black"
                      style={{
                        fontSize: "clamp(1.75rem, 5vw, 3.25rem)",
                        lineHeight: 1,
                        fontWeight: 600,
                      }}
                    >
                      {page.label}
                    </h3>
                    <ArrowUpRight
                      className="h-7 w-7 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                      style={{ color: ACCENT }}
                    />
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs">
                    {page.body}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

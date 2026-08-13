"use client";

import React from "react";
import { ACCENT } from "@/lib/brand";
import { PageShell } from "@/components/page-shell";
import { Reveal, SpinningBadge } from "@/components/motion";

const PHASES = [
  {
    n: "01",
    title: "Read-Only Core Engine",
    status: "In Progress",
    items: [
      "Chain data via Robinhood Chain RPC (Arbitrum Orbit L2) and its Blockscout explorer API.",
      "Liquidity reads across known DEX pools, plus LP lock and burn detection.",
      "Holder analysis: holder count, top-10 / top-50 concentration, labeled address filtering.",
      "Contract signals: ownership, mint function, proxy upgradeability, source verification.",
      "Honeypot sell-test via simulated buy-then-sell against a forked RPC call.",
    ],
  },
  {
    n: "02",
    title: "Social Bot Launch",
    status: "Next",
    items: [
      "@latticehoodbot on X and @latticehood_bot on Telegram live.",
      "Command parsing: check [contract_address], or a bare CA in a reply.",
      "Compact scorecard threaded in-reply — verdict, liquidity, top-10 %, market cap, LP lock, ownership.",
      "Per-account rate limits and a 2-5 minute report cache per CA to protect the data budget.",
    ],
  },
  {
    n: "03",
    title: "Project Self-Verification",
    status: "Planned",
    items: [
      "Web app for projects to link their X / Telegram handle to an official contract address.",
      "Proof of control by signed message from the deployer wallet, or a one-time code posted from the official account.",
      "check @handle resolves straight to the audited CA.",
      "Verified Project badge carried on every report.",
    ],
  },
  {
    n: "04",
    title: "Promises Kept Compliance",
    status: "Planned",
    items: [
      "Projects register declared tokenomics: total supply, LP lock % and duration, treasury share, vesting schedule.",
      "Periodic re-checks of actual on-chain state against those declared commitments.",
      "A dedicated compliance section in every report, confirming or flagging each promise.",
      "Deep support for standardized launch mechanisms such as Clanker-style vault and lock contracts.",
    ],
  },
  {
    n: "05",
    title: "Multi-Chain Expansion",
    status: "Planned",
    items: [
      "Chain-agnostic data layer — token safety is inherently a multi-chain problem.",
      "Public report-lookup page for deeper reports beyond the in-thread scorecard.",
      "Broader data-aggregator coverage for liquidity and market data.",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <PageShell
      eyebrow="Roadmap"
      titleLines={["Built", "In Phases"]}
      intro="Lattice ships as a read-only protocol from day one. Each phase adds depth to the report without ever adding custody, signatures or gas."
    >
      <div className="relative">
        <SpinningBadge
          text="ROADMAP • LATTICE • SHIPPING • "
          size={140}
          className="pointer-events-none absolute -top-4 right-0 hidden lg:block"
        />

        <ol className="flex flex-col">
          {PHASES.map((phase, i) => (
            <Reveal
              key={phase.n}
              index={i % 3}
              as="li"
              className="border-t border-black/15 py-10 md:py-14"
            >
              <div className="flex flex-col gap-6 md:flex-row md:gap-12">
                <div className="flex shrink-0 items-start gap-4 md:w-64 md:flex-col md:gap-3">
                  <span
                    className="text-sm font-semibold tracking-widest"
                    style={{ color: ACCENT }}
                  >
                    {phase.n}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest text-black/55"
                    style={
                      phase.status === "In Progress" ? { color: ACCENT } : undefined
                    }
                  >
                    {phase.status}
                  </span>
                </div>

                <div className="flex-1">
                  <h2
                    className="uppercase text-black"
                    style={{
                      fontSize: "clamp(1.35rem, 4vw, 2.75rem)",
                      lineHeight: 1,
                      fontWeight: 600,
                    }}
                  >
                    {phase.title}
                  </h2>
                  <ul className="mt-6 flex flex-col gap-3">
                    {phase.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-3 text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs"
                      >
                        <span
                          className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: ACCENT }}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </PageShell>
  );
}

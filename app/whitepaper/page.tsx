"use client";

import React from "react";
import { ACCENT, SURFACE } from "@/lib/brand";
import { PageShell } from "@/components/page-shell";
import { Reveal, SpinningRings } from "@/components/motion";

const SECTIONS = [
  {
    n: "01",
    title: "Abstract",
    paragraphs: [
      "Lattice (LAT) is an on-chain verification protocol delivered natively through X and Telegram. It does not move money. It answers the question every trader asks in the seconds after seeing a new token mentioned: is this safe, and is the project actually doing what it claims?",
      "A user tags @latticehoodbot on X or @latticeonhood_bot on Telegram with a token's contract address — in a reply, a quote, or a DM — and the bot responds in-thread with a structured report. No wallet connection, no signature, no gas, and no funds ever touch Lattice.",
    ],
  },
  {
    n: "02",
    title: "The Problem",
    paragraphs: [
      "Token due diligence happens in the wrong place and at the wrong speed. A contract address surfaces in a timeline, and the window to evaluate it closes in seconds. Existing tools live on separate sites, behind wallet connections, or inside dashboards that demand the user leave the conversation entirely.",
      "The result is that most buyers act on social proof rather than chain state. Lattice moves verification to where the decision is actually made — inside the thread.",
    ],
  },
  {
    n: "03",
    title: "Interface",
    paragraphs: [
      "The core interface is @latticehoodbot on X and @latticeonhood_bot on Telegram. Every command is a read-only query, never a transaction.",
      "Commands: check [contract_address], a bare contract address in a reply to the bot, or check @projecthandle for projects that have self-verified.",
      "Execution is fully read-only — no signature prompt, no wallet deep link. A report can be generated with zero interaction from the sender beyond the tag itself. Responses are self-contained scorecards in the reply text rather than raw links, keeping the bot inside platform content rules; a deeper report lives behind the bot's bio link.",
    ],
  },
  {
    n: "04",
    title: "The Verification Report",
    table: [
      [
        "Liquidity",
        "Total liquidity across known DEX pools, and whether LP tokens are locked or burned — and until when.",
      ],
      [
        "Holder Analysis",
        "Holder count, top-10 and top-50 concentration, and whether top holders are known LP / CEX / burn addresses or unlabeled wallets.",
      ],
      [
        "Market Cap / FDV",
        "Computed from circulating and total supply multiplied by current price.",
      ],
      [
        "Contract Signals",
        "Ownership renounced? Mint function present or disabled? Upgradeable proxy? Source verified on the chain's explorer?",
      ],
      [
        "Honeypot / Sell-Test",
        "A simulated buy-then-sell, or an existing honeypot-detection service, to catch tokens that can be bought but not sold.",
      ],
    ],
  },
  {
    n: "05",
    title: "Promises Kept",
    paragraphs: [
      "This is the protocol's primary differentiator. Any project can register its declared tokenomics with Lattice via the web app: total supply, LP lock percentage and duration, treasury or vault share, and vesting schedule.",
      "Lattice then periodically re-checks the project's actual on-chain state against those declared commitments, and surfaces a dedicated section in the report — for example, “Declared 70% to LP, locked — confirmed on-chain” or “Declared 12-month vault lock — vault emptied early, flagged.”",
      "The check works best for standardized launch mechanisms such as a Clanker-style vault and lock contract shape. For arbitrary unregistered tokens only the generic checks apply, since there is no declared baseline to measure against.",
    ],
  },
  {
    n: "06",
    title: "Project Self-Verification",
    paragraphs: [
      "Projects connect their X or Telegram handle and their token's official contract address on the Lattice web app.",
      "Proof of control is a signed message — not a transaction — from the deployer or owner wallet, or a one-time code posted from the project's official account. Never a fund movement.",
      "Once verified, check @handle resolves directly to the audited contract address, and reports carry a Verified Project badge.",
    ],
  },
  {
    n: "07",
    title: "Architecture",
    paragraphs: [
      "Chain data: Robinhood Chain RPC (Arbitrum Orbit L2) with its Blockscout explorer API for holder lists, contract verification and source. The architecture stays chain-agnostic enough to add more chains later — token safety-checking is inherently a multi-chain problem.",
      "Liquidity and market data: direct DEX pool reads via the chain's router and factory, or a data-aggregator API where available. Honeypot detection: an existing honeypot-check service, or a self-hosted simulated buy/sell against a forked RPC call.",
      "Social: X API v2 and the Telegram Bot API. Backend: Node.js and TypeScript with MongoDB, storing cached reports, verified-project registrations and declared tokenomics. Frontend: Next.js, serving a project-verification dashboard and a public report-lookup page.",
    ],
  },
  {
    n: "08",
    title: "Security & Limits",
    paragraphs: [
      "No custody, no signing, no funds. Lattice never touches user funds, which removes smart-contract custody risk from the picture entirely.",
      "Data integrity: every scorecard discloses its data sources and timestamp, not just a verdict. A false “verified” or “safe” signal carries real financial-harm risk, so the provenance travels with the result.",
      "Rate limiting: checking a contract address is cheap for the requester but costs backend RPC and API budget. Strict per-account limits, plus a short-lived 2-5 minute cache of recent reports per address, keep a trending token from hammering data providers on every re-tag.",
      "Disclaimers: not financial advice. Heuristics can be wrong. Always do your own research.",
    ],
  },
];

export default function WhitepaperPage() {
  return (
    <PageShell
      eyebrow="Whitepaper — Version 1.0"
      titleLines={["The", "Protocol"]}
      intro="Lattice is an on-chain verification protocol for the moment before the buy. Read-only by design: no custody, no signatures, no gas."
    >
      <div className="relative">
        <SpinningRings
          size={300}
          className="pointer-events-none absolute -top-24 right-0 hidden lg:block"
        />

        <div className="relative z-10 flex flex-col">
          {SECTIONS.map((section, i) => (
            <Reveal
              key={section.n}
              index={i % 3}
              as="section"
              className="border-t border-black/15 py-10 md:py-14"
            >
              <div className="flex flex-col gap-6 md:flex-row md:gap-12">
                <span
                  className="shrink-0 text-sm font-semibold tracking-widest md:w-32"
                  style={{ color: ACCENT }}
                >
                  {section.n}
                </span>

                <div className="max-w-3xl flex-1">
                  <h2
                    className="uppercase text-black"
                    style={{
                      fontSize: "clamp(1.35rem, 4vw, 2.75rem)",
                      lineHeight: 1,
                      fontWeight: 600,
                    }}
                  >
                    {section.title}
                  </h2>

                  {section.paragraphs && (
                    <div className="mt-6 flex flex-col gap-4">
                      {section.paragraphs.map((paragraph, p) => (
                        <p
                          key={p}
                          className="text-[11px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}

                  {section.table && (
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: SURFACE }}>
                            <th className="w-56 border border-black/10 p-4 text-left text-[10px] font-semibold uppercase tracking-widest text-black">
                              Check
                            </th>
                            <th className="border border-black/10 p-4 text-left text-[10px] font-semibold uppercase tracking-widest text-black">
                              What It Answers
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.table.map(([check, answer]) => (
                            <tr key={check}>
                              <td className="border border-black/10 p-4 align-top text-[10px] font-semibold uppercase tracking-widest text-black sm:text-xs">
                                {check}
                              </td>
                              <td className="border border-black/10 p-4 align-top text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60 sm:text-xs">
                                {answer}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

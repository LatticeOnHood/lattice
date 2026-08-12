import React from "react";
import Link from "next/link";
import { Logo } from "@/components/site-nav";
import { ACCENT } from "@/lib/brand";

/** Static by design — the footer is the one section with no motion. */
export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-white px-5 py-10 sm:px-8 md:px-12">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo size={44} />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-black sm:text-xs">
            On-Chain Verification
            <br />
            Protocol
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
            Pages
          </span>
          <Link
            href="/roadmap"
            className="text-[10px] font-semibold uppercase tracking-widest text-black hover:opacity-60 sm:text-xs"
          >
            Roadmap
          </Link>
          <Link
            href="/whitepaper"
            className="text-[10px] font-semibold uppercase tracking-widest text-black hover:opacity-60 sm:text-xs"
          >
            Whitepaper
          </Link>
        </div>

        <div className="flex max-w-xs flex-col gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
            Disclaimer
          </span>
          <p className="text-[10px] font-semibold uppercase leading-relaxed tracking-widest text-black/60">
            Not financial advice. Heuristics can be wrong. Every report discloses
            its sources and timestamp. Always DYOR.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40">
          © {new Date().getFullYear()} Lattice
        </span>
        <Link
          href="/app"
          className="text-[10px] font-semibold uppercase tracking-widest hover:opacity-60"
          style={{ color: ACCENT }}
        >
          Launch App
        </Link>
      </div>
    </footer>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { ACCENT, EASE, FONT_STACK, NAV_LINKS } from "@/lib/brand";
import { fadeDown } from "@/components/motion";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Link href="/" aria-label="Lattice home" className="shrink-0">
      <Image
        src="/logo.png"
        alt="Lattice"
        width={size}
        height={size}
        priority
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    </Link>
  );
}

export function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  return (
    <>
      <nav className="flex items-center justify-between px-5 pt-5 sm:px-8 md:px-12 md:pt-6">
        <motion.div variants={fadeDown} initial="hidden" animate="visible" custom={0}>
          <Logo />
        </motion.div>

        <div className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link, i) => (
            <motion.div
              key={link.label}
              variants={fadeDown}
              initial="hidden"
              animate="visible"
              custom={i + 1}
            >
              <Link
                href={link.href}
                className="text-sm font-semibold uppercase tracking-widest text-black transition-opacity hover:opacity-60"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.button
          type="button"
          variants={fadeDown}
          initial="hidden"
          animate="visible"
          custom={5}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-1 rounded-full bg-black"
        >
          <span className="h-0.5 w-4 bg-white" />
          <span className="h-0.5 w-4 bg-white" />
          <span className="h-0.5 w-4 bg-white" />
        </motion.button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-0 z-50 flex flex-col bg-white px-5 pb-8 pt-5 sm:px-8"
            style={{ fontFamily: FONT_STACK }}
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="mt-16 flex flex-col gap-8">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-3xl font-semibold uppercase tracking-widest text-black"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Link
              href="/whitepaper"
              onClick={() => setMenuOpen(false)}
              className="mt-auto flex items-center gap-1 text-xl uppercase tracking-wide"
              style={{ color: ACCENT, fontWeight: 600 }}
            >
              Read Whitepaper
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

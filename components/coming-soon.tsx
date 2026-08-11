"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ACCENT } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The pre-launch marker. Used wherever a visitor might otherwise assume the
 * product is already live.
 */
export function ComingSoonBadge({
  label = "Coming Soon",
  className,
  size = "md",
}: {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border bg-white/70 backdrop-blur-sm",
        size === "sm" ? "px-3 py-1.5" : "px-4 py-2",
        className
      )}
      style={{ borderColor: ACCENT }}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {!reduceMotion && (
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full"
            style={{ backgroundColor: ACCENT }}
            animate={{ opacity: [0.7, 0, 0.7], scale: [1, 2.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
      </span>
      <span
        className={cn(
          "font-semibold uppercase tracking-widest",
          size === "sm" ? "text-[10px]" : "text-[10px] sm:text-xs"
        )}
        style={{ color: ACCENT }}
      >
        {label}
      </span>
    </span>
  );
}

/** Scrolling "coming soon" ticker used as the closing band before the footer. */
export function ComingSoonMarquee() {
  const reduceMotion = useReducedMotion();
  const items = Array.from({ length: 8 });

  return (
    <div
      className="relative flex overflow-hidden border-y py-6"
      style={{ borderColor: "rgba(0,0,0,0.1)" }}
      aria-label="Coming soon"
    >
      <motion.div
        className="flex shrink-0 items-center gap-8 pr-8"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 26, ease: "linear", repeat: Infinity }}
      >
        {items.concat(items).map((_, i) => (
          <span key={i} className="flex shrink-0 items-center gap-8">
            <span
              className="whitespace-nowrap text-xl font-semibold uppercase tracking-widest sm:text-3xl"
              style={{ color: i % 2 === 0 ? "#000" : ACCENT }}
            >
              Coming Soon
            </span>
            <span
              className="block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: ACCENT }}
            />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

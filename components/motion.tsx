"use client";

import React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ACCENT, EASE } from "@/lib/brand";
import { cn } from "@/lib/utils";

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: EASE },
  }),
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: EASE },
  }),
};

/**
 * Scroll-triggered version of the hero's fadeUp, so every section below the
 * fold reveals with the same motion language.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const Component = motion[as];
  return (
    <Component
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      className={className}
    >
      {children}
    </Component>
  );
}

/**
 * The hero's clip reveal: each line slides up from behind an overflow-hidden
 * edge. Reused for every section heading.
 */
const clipContainer: Variants = { hidden: {}, visible: {} };

export function ClipLines({
  lines,
  className,
  style,
  baseDelay = 0,
  inView = false,
}: {
  lines: string[];
  className?: string;
  style?: React.CSSProperties;
  baseDelay?: number;
  inView?: boolean;
}) {
  const line: Variants = {
    hidden: { y: "110%" },
    visible: (i: number = 0) => ({
      y: 0,
      transition: { delay: baseDelay + i * 0.14, duration: 0.7, ease: EASE },
    }),
  };

  /**
   * The trigger lives on the unclipped container, never on the translated
   * line itself: a line sitting 110% outside its overflow-hidden window has
   * zero intersection area, so observing it directly would deadlock — it can
   * never become "in view", so it would never animate into view.
   */
  const trigger = inView
    ? { whileInView: "visible", viewport: { once: true, amount: 0.3 } }
    : { animate: "visible" };

  return (
    <motion.span
      className={cn("block", className)}
      style={style}
      variants={clipContainer}
      initial="hidden"
      {...trigger}
    >
      {lines.map((text, i) => (
        <span key={text} className="block overflow-hidden">
          <motion.span className="block" variants={line} custom={i}>
            {text}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/**
 * Continuously rotating circular wordmark — the recurring motif across the
 * mid-page sections. Honours prefers-reduced-motion.
 */
export function SpinningBadge({
  text = "VERIFY • BEFORE • YOU BUY • ",
  size = 132,
  duration = 18,
  reverse = false,
  className,
}: {
  text?: string;
  size?: number;
  duration?: number;
  reverse?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const id = React.useId().replace(/:/g, "");

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      animate={reduceMotion ? undefined : { rotate: reverse ? -360 : 360 }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    >
      <defs>
        <path
          id={`circle-${id}`}
          d="M 50,50 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
          fill="none"
        />
      </defs>
      <text
        fill={ACCENT}
        style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.18em" }}
      >
        <textPath href={`#circle-${id}`}>{text}</textPath>
      </text>
    </motion.svg>
  );
}

/** Slowly rotating ring pair used as a section accent. */
export function SpinningRings({
  size = 220,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    // `relative` is a class, not an inline style, so a caller passing
    // `absolute` can override it instead of being forced into normal flow.
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: ACCENT, opacity: 0.35 }}
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      >
        <span
          className="absolute left-1/2 top-0 block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
      </motion.div>
      <motion.div
        className="absolute rounded-full border"
        style={{ inset: "18%", borderColor: ACCENT, opacity: 0.25 }}
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 16, ease: "linear", repeat: Infinity }}
      >
        <span
          className="absolute bottom-0 left-1/2 block h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
      </motion.div>
    </div>
  );
}

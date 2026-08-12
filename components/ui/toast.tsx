"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { ACCENT, EASE } from "@/lib/brand";
import { friendlyError, type FriendlyError } from "@/lib/errors";

export type ToastVariant = "error" | "success" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  /** Milliseconds before auto-dismiss. Pass 0 to require a manual close. */
  duration?: number;
}

interface ToastRecord extends Required<Omit<ToastOptions, "description">> {
  id: string;
  variant: ToastVariant;
  description?: string;
}

type ToastInput = string | ToastOptions;

interface ToastApi {
  error: (input: ToastInput) => string;
  success: (input: ToastInput) => string;
  info: (input: ToastInput) => string;
  /** Converts a thrown value into friendly copy, then shows it. */
  fromError: (err: unknown) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Long enough to read two lines without feeling stuck. */
const DEFAULT_DURATION = 6000;
const MAX_VISIBLE = 3;

const VARIANT_STYLE: Record<
  ToastVariant,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  error: { icon: AlertTriangle, color: "#B91C1C" },
  success: { icon: Check, color: ACCENT },
  info: { icon: Info, color: "#111111" },
};

function normalize(input: ToastInput): ToastOptions {
  return typeof input === "string" ? { title: input } : input;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, input: ToastInput) => {
    const { title, description, duration = DEFAULT_DURATION } = normalize(input);
    const id = `toast-${(counter.current += 1)}`;

    setToasts((current) => {
      // Drop the oldest rather than letting a burst of failures cover the page.
      const next = [...current, { id, variant, title, description, duration }];
      return next.slice(-MAX_VISIBLE);
    });

    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      error: (input) => push("error", input),
      success: (input) => push("success", input),
      info: (input) => push("info", input),
      fromError: (err) => {
        const friendly: FriendlyError = friendlyError(err);
        return push("error", friendly);
      },
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      // aria-live so screen readers announce failures that appear far from focus.
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  const remaining = useRef(toast.duration);
  const startedAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { icon: Icon, color } = VARIANT_STYLE[toast.variant];

  // Hovering (or focusing) freezes the countdown, so a message can never expire
  // while it is being read or its text is being selected.
  useEffect(() => {
    if (toast.duration === 0) return;

    if (paused) {
      if (timer.current) clearTimeout(timer.current);
      remaining.current -= Date.now() - startedAt.current;
      return;
    }

    startedAt.current = Date.now();
    timer.current = setTimeout(
      () => onDismiss(toast.id),
      Math.max(remaining.current, 0)
    );

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [paused, toast.duration, toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.28, ease: EASE }}
      role={toast.variant === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="pointer-events-auto relative w-full max-w-sm overflow-hidden border border-black/10 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
          style={{ color }}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-black">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-1.5 text-[11px] font-medium leading-relaxed tracking-wide text-black/55">
              {toast.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-m-1 shrink-0 p-1 text-black/30 transition-colors hover:text-black"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {toast.duration > 0 && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 w-full origin-left"
          style={{
            backgroundColor: color,
            animation: `toast-timer ${toast.duration}ms linear forwards`,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      )}
    </motion.div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

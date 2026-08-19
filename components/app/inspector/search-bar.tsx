"use client";

/**
 * The query surface: a contract address or a plain-English question, plus the
 * addresses this browser has looked at before.
 */

import React from "react";
import { Loader2, Search, X } from "lucide-react";
import { ACCENT } from "@/lib/brand";
import { shortAddress } from "@/lib/inspector/format";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  loading,
  recents,
  onPickRecent,
  onClearRecents,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  loading: boolean;
  recents: string[];
  onPickRecent: (address: string) => void;
  onClearRecents: () => void;
}) {
  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="flex flex-1 items-center gap-3 border border-black/15 bg-white px-4">
          <Search className="h-4 w-4 shrink-0 text-black/45" aria-hidden />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="0x… contract address, or ask in plain English"
            spellCheck={false}
            autoComplete="off"
            aria-label="Token contract address or question"
            className="w-full bg-transparent py-4 font-mono text-xs text-black outline-none placeholder:font-sans placeholder:uppercase placeholder:tracking-widest placeholder:text-black/55 sm:text-sm"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Clear input"
              className="shrink-0 text-black/40 transition-colors hover:text-black"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-[11px] font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? "Reading Chain" : "Inspect Token"}
        </button>
      </form>

      {recents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-black/40">
            Recent
          </span>
          {recents.map((address) => (
            <button
              key={address}
              type="button"
              onClick={() => onPickRecent(address)}
              className="border border-black/10 px-2.5 py-1.5 font-mono text-[10px] text-black/60 transition-colors hover:border-black/40 hover:text-black"
            >
              {shortAddress(address)}
            </button>
          ))}
          <button
            type="button"
            onClick={onClearRecents}
            className="text-[9px] font-semibold uppercase tracking-widest text-black/40 transition-colors hover:text-black"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * Loading state shaped like the report it precedes, so the layout does not jump
 * when data lands. The old console showed only a spinner inside the submit
 * button, which left the page empty for the whole request.
 */

import React from "react";

function Bar({ className = "" }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-black/10 ${className}`} />;
}

function TileSkeleton() {
  return (
    <div className="border border-black/10 bg-white p-5">
      <Bar className="h-2 w-24" />
      <Bar className="mt-4 h-5 w-32" />
    </div>
  );
}

export function InspectorSkeleton() {
  return (
    <div className="space-y-px" aria-hidden>
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <Bar className="h-2 w-20" />
        <Bar className="mt-4 h-9 w-64" />
        <Bar className="mt-4 h-2 w-40" />
        <div className="mt-8 border-t border-black/10 pt-6">
          <Bar className="h-2 w-28" />
          <Bar className="mt-4 h-3 w-56" />
          <Bar className="mt-5 h-1.5 w-full" />
        </div>
      </div>

      <div className="grid gap-px bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

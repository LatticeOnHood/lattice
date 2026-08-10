import React from "react";

export default function Home() {
  return (
    <main className="h-screen w-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="flex flex-col items-center text-center space-y-6 z-10">
        {/* Brand Logo */}
        <div className="relative">
          <img
            src="/logo.png"
            alt="Lattice Logo"
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-slate-200 shadow-md"
          />
        </div>

        {/* Minimalist Heading & Brand */}
        <div className="space-y-2">
          <span className="text-xs font-mono tracking-widest text-blue-600 uppercase font-bold">
            LATTICE
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-blue-600">
            Coming Soon
          </h1>
        </div>
      </div>
    </main>
  );
}

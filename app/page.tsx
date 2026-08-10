import React from "react";

export default function Home() {
  return (
    <main className="h-screen w-screen bg-[#07090e] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 blur-3xl rounded-full pointer-events-none" />

      <div className="flex flex-col items-center text-center space-y-6 z-10">
        {/* Brand Logo */}
        <div className="relative group">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition duration-500" />
          <img
            src="/logo.png"
            alt="Lattice Logo"
            className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover bg-slate-900 border border-slate-800/80 shadow-2xl"
          />
        </div>

        {/* Minimalist Heading & Brand */}
        <div className="space-y-2">
          <span className="text-xs font-mono tracking-widest text-purple-400 uppercase font-semibold">
            LATTICE
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Coming Soon
          </h1>
        </div>
      </div>
    </main>
  );
}

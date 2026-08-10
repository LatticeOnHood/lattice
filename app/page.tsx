import React from "react";
import { ShieldCheck, Bot, Cpu, Activity, Send, Twitter } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-3xl w-full space-y-8 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
          <Activity className="w-4 h-4 animate-pulse text-purple-400" />
          <span>System Initialized — Next.js Frontend Ready</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
          Lattice
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Token Audit & Verification Engine for X (Twitter) and Telegram. Real-time holder analytics, dev wallet tracking, and bundler detection powered by GMGN API.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-4">
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200">GMGN Audit Engine</h3>
            <p className="text-xs text-slate-400">Deep on-chain metrics, dev hold % & bundler risk scoring.</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Twitter className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200">X (Twitter) Bot</h3>
            <p className="text-xs text-slate-400">Auto-replying to tag requests with instant audit cards.</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200">Telegram Bot</h3>
            <p className="text-xs text-slate-400">Group & DM audit triggers with rich report templates.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex justify-center items-center gap-6 text-xs text-slate-500 font-mono">
          <span>FE: Next.js + Tailwind</span>
          <span>•</span>
          <span>BE: Bun + Express + GMGN API</span>
          <span>•</span>
          <span>Status: 200 OK</span>
        </div>
      </div>
    </main>
  );
}

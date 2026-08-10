"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Bot,
  Activity,
  Send,
  Twitter,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Layers,
  Search,
  Lock,
  Zap,
  TrendingUp,
} from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<"banner1" | "banner2">("banner1");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-purple-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-10 -left-40 w-96 h-96 bg-purple-700/10 blur-3xl pointer-events-none rounded-full" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-xl blur opacity-40 group-hover:opacity-75 transition duration-500" />
            <img
              src="/logo.png"
              alt="Lattice Logo"
              className="relative w-10 h-10 rounded-xl object-cover bg-slate-900 border border-slate-800"
            />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Lattice
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>STAGING / COMING SOON</span>
          </div>

          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Follow on X"
          >
            <Twitter className="w-4 h-4" />
          </a>
          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Join Telegram"
          >
            <Send className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 z-10 flex flex-col items-center text-center space-y-16">
        
        {/* Hero Section */}
        <div className="max-w-4xl space-y-8">
          
          {/* Main Logo & Badge */}
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 via-cyan-500/30 to-indigo-600/30 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition duration-700" />
              <img
                src="/logo.png"
                alt="Lattice Hero Brand"
                className="relative w-28 h-28 md:w-36 md:h-36 rounded-3xl shadow-2xl border border-purple-500/30 object-cover"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wide uppercase backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              <span>Next-Gen Token Verification Engine</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none text-slate-100">
            Automated Token Audit & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Verification on X & Telegram
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Tag <span className="text-purple-300 font-semibold">@LatticeBot</span> on X or send a CA on Telegram for real-time holder analytics, dev wallet holdings, bundler cluster detection, and market health metrics powered by <span className="text-cyan-300 font-semibold">GMGN API</span>.
          </p>

          {/* Waitlist / Early Access Form */}
          <div className="pt-2 max-w-md mx-auto w-full">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email or X handle..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-sm transition-all backdrop-blur-sm"
                />
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Request Access</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium flex items-center justify-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>You're on the list! We'll notify you at public launch.</span>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2.5">
              ⚡ Private Beta access invitations rolling out soon.
            </p>
          </div>
        </div>

        {/* Media / Banner Showcase Tabs */}
        <div className="w-full max-w-5xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Platform Interface Preview</span>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab("banner1")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "banner1"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Audit Overview
              </button>
              <button
                onClick={() => setActiveTab("banner2")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "banner2"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Deep Analytics
              </button>
            </div>
          </div>

          <div className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/40 p-2 backdrop-blur-xl shadow-2xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/10 via-cyan-500/10 to-indigo-600/10 rounded-2xl blur-xl group-hover:opacity-100 transition duration-500 pointer-events-none" />
            <img
              src={activeTab === "banner1" ? "/banner1.jpg" : "/banner2.jpg"}
              alt="Lattice System Showcase"
              className="relative w-full h-[280px] sm:h-[420px] object-cover rounded-xl border border-slate-800/80 transition-all duration-500"
            />
          </div>
        </div>

        {/* Key Features Grid */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
          
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-3 backdrop-blur-sm group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base">Holder Concentration</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Scans top 10 & 20 holder percentages to flag high dump risks and whale dominance.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all space-y-3 backdrop-blur-sm group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base">Dev Holding Trace</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tracks creator wallet balance, percentage sold, burned LP, and renounced authority.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-pink-500/40 transition-all space-y-3 backdrop-blur-sm group">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base">Bundler Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects launch-slot sniper clusters, bundled transactions, and insider control.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all space-y-3 backdrop-blur-sm group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-base">X & Telegram Bot</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant reply triggers in X comments, Telegram group chats, and direct messages.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 z-10">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-5 h-5 rounded-md opacity-80" />
          <span>© 2026 Lattice. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-6 font-mono">
          <span>POWERED BY GMGN API</span>
          <span>•</span>
          <span>BUN + NEXT.JS 15</span>
        </div>
      </footer>
    </div>
  );
}

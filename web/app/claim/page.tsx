"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  KeyRound,
  ArrowRight,
  Lock,
  Video,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Sparkles
} from "lucide-react";

export default function ClaimLandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Masukkan kode klaim yang tertera pada chat pesanan Anda.");
      return;
    }
    setError("");
    setLoading(true);
    router.push(`/claim/${cleanCode}`);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-violet-500/30 selection:text-violet-200">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-violet-600/10 via-indigo-600/5 to-transparent blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] backdrop-blur-md bg-zinc-950/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">AKSHARA DIGITAL VAULT</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">OFFICIAL LICENSE VERIFICATION</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Audit Aktif
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="relative z-10 flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 mb-6 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Portal Pengambilan Kredensial &amp; Garansi Resmi</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl leading-tight">
          Buka Kredensial &amp; Akses Lisensi Game Anda
        </h1>

        <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed">
          Kredensial akun dan digital key pesanan Anda dilindungi oleh sistem keamanan forensik Akshara. 
          Masukkan kode klaim unik Anda untuk membuka data pesanan.
        </p>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="w-full max-w-md mt-8">
          <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5 p-1.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 shadow-2xl transition-all">
            <div className="relative flex-1 flex items-center">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5" />
              <input
                type="text"
                placeholder="Contoh: AKSH-9921-MC"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 bg-transparent text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none uppercase tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/20 cursor-pointer select-none disabled:opacity-50"
            >
              <span>{loading ? "Memeriksa..." : "Buka Kredensial"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-400 mt-2.5 font-mono text-left pl-2">{error}</p>
          )}
        </form>

        {/* SOP Notice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-14 w-full text-left">
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.06] backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2.5">
              <Video className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">1. Rekam Unboxing</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Wajib rekam video layar/layar HP tanpa jeda (no-cut) sebelum menekan tombol buka kredensial.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.06] backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2.5">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">2. Audit Timestamp IP</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Detik pertama Anda melihat kredensial dan IP Anda dicatat permanen ke sistem garansi Shopee.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/[0.06] backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">3. Garansi Resmi 100%</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Garansi penggantian akun/key baru berlaku penuh selama Anda mematuhi SOP video no-cut.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] py-6 text-center text-xs text-zinc-600 font-mono">
        <p>AKSHARA GAMING CENTER • SECURE DIGITAL LICENSE VAULT • ZERO COMPLAINT PROTOCOL</p>
      </footer>
    </div>
  );
}

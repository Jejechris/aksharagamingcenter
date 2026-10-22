"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  KeyRound,
  Lock,
  ArrowRight,
  Video,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap
} from "lucide-react";

export default function ClaimHomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanPass = passcode.trim();

    if (!cleanCode) {
      setError("Masukkan Kode Klaim unik dari chat pesanan Anda.");
      return;
    }

    if (!cleanPass) {
      setError("Masukkan Passcode PIN rahasia yang tertera di chat Shopee.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, passcode: cleanPass }),
      });
      const json = await res.json();

      if (json.status === "success") {
        sessionStorage.setItem(`pass_${cleanCode}`, cleanPass);
        router.push(`/claim/${cleanCode}`);
      } else {
        setError(json.message || "Kode klaim atau Passcode PIN tidak valid.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-white">
      {/* Background Neon Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[750px] h-[550px] bg-gradient-to-b from-emerald-500/[0.08] via-indigo-600/[0.04] to-transparent blur-[140px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.08] backdrop-blur-2xl bg-[#07090f]/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">AKSHARA CLAIM VAULT</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">SECURE DIGITAL LICENSE PORTAL</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-mono font-bold shadow-inner">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              AES-256 ENCRYPTED
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 mb-6 font-mono shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verifikasi Pembelian Resmi Akshara Gaming Center</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white max-w-xl leading-tight">
          Buka Kredensial &amp; Garansi Resmi Pesanan Anda
        </h1>

        <p className="mt-3.5 text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
          Kredensial pesanan Anda tersimpan dalam sistem keamanan Passcode brankas. Masukkan Kode Klaim beserta Passcode PIN rahasia dari chat Shopee untuk membuka lisensi Anda.
        </p>

        {/* Form Input Box */}
        <div className="w-full max-w-md mt-8 p-6 sm:p-7 rounded-2xl bg-[#0b0e17] border border-white/[0.10] shadow-2xl text-left space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 font-semibold">
                1. Kode Klaim Pesanan:
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-emerald-400/70 absolute left-3.5" />
                <input
                  type="text"
                  placeholder="Contoh: AKSH-9921-MC"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.10] text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 uppercase tracking-wider transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between font-semibold">
                <span>2. Passcode PIN Rahasia:</span>
                <span className="text-[10px] text-emerald-400 font-mono font-normal">dari chat Shopee</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-emerald-400/70 absolute left-3.5" />
                <input
                  type="password"
                  maxLength={12}
                  placeholder="Masukkan Passcode PIN rahasia"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.10] text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 tracking-widest transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-slate-950 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] cursor-pointer select-none disabled:opacity-50"
            >
              <span>{loading ? "Memverifikasi Passcode..." : "Verifikasi & Buka Kredensial"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* SOP Protection Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-10 w-full text-left">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-amber-400 mb-1.5 flex items-center gap-1.5 text-xs font-mono font-bold">
              <Video className="w-3.5 h-3.5" />
              <span>Rekam Unboxing</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Wajib rekam video layar tanpa cut sebelum membuka kredensial.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-cyan-400 mb-1.5 flex items-center gap-1.5 text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Forensik</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              IP dan detik pembukaan dicatat sebagai bukti sah transaksi resmi.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="text-emerald-400 mb-1.5 flex items-center gap-1.5 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garansi Penuh</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Penggantian unit baru berlaku penuh sesuai SOP garansi Shopee.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-5 text-center text-xs text-slate-600 font-mono">
        <p>AKSHARA GAMING CENTER &bull; STANDALONE CLAIM VAULT &bull; ZERO COMPLAINT PROTOCOL</p>
      </footer>
    </div>
  );
}

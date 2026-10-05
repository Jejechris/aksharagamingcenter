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
  ShieldCheck
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
        // Simpan passcode ke sessionStorage untuk halaman detail
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
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-violet-500/30 selection:text-violet-200">
      {/* Background Neon Glow */}
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
              <span className="font-bold text-sm tracking-tight text-white block">AKSHARA CLAIM VAULT</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider">SECURE DIGITAL LICENSE PORTAL</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Vault Terenkripsi 256-bit
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 mb-6 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Verifikasi Pembelian Resmi Akshara Gaming Center</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-xl leading-tight">
          Buka Kredensial &amp; Garansi Resmi Pesanan Anda
        </h1>

        <p className="mt-3.5 text-xs sm:text-sm text-zinc-400 max-w-lg leading-relaxed">
          Kredensial pesanan Anda terlindungi sistem keamanan Passcode. Masukkan Kode Klaim beserta Passcode PIN rahasia yang diberikan di chat Shopee untuk membuka data lisensi Anda.
        </p>

        {/* Form Input Box */}
        <div className="w-full max-w-md mt-8 p-6 rounded-2xl bg-zinc-950/80 border border-white/[0.08] shadow-2xl text-left space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5">
                1. Kode Klaim Pesanan:
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="text"
                  placeholder="Contoh: AKSH-9921-MC"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 uppercase tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span>2. Passcode PIN Rahasia:</span>
                <span className="text-[10px] text-violet-400 lowercase font-sans">dari chat Shopee</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="password"
                  maxLength={12}
                  placeholder="Masukkan Passcode PIN rahasia"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/25 cursor-pointer select-none disabled:opacity-50"
            >
              <span>{loading ? "Memverifikasi Passcode..." : "Verifikasi & Buka Kredensial"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* SOP Protection Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 w-full text-left">
          <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-white/[0.05]">
            <div className="text-amber-400 mb-1.5 flex items-center gap-1.5 text-xs font-mono font-bold">
              <Video className="w-3.5 h-3.5" />
              <span>Rekam Unboxing</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Wajib rekam video layar tanpa cut sebelum membuka kredensial.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-white/[0.05]">
            <div className="text-cyan-400 mb-1.5 flex items-center gap-1.5 text-xs font-mono font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>Audit Forensik</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              IP dan detik pembukaan dicatat sebagai bukti sah transaksi resmi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-white/[0.05]">
            <div className="text-emerald-400 mb-1.5 flex items-center gap-1.5 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garansi Penuh</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Penggantian unit baru berlaku penuh sesuai SOP garansi Shopee.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-5 text-center text-xs text-zinc-600 font-mono">
        <p>AKSHARA GAMING CENTER • STANDALONE CLAIM VAULT • ZERO COMPLAINT PROTOCOL</p>
      </footer>
    </div>
  );
}

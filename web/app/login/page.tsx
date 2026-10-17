"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, KeyRound, ArrowRight, AlertTriangle, Terminal, Sparkles } from "lucide-react";

export default function AdminLoginPage() {
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setErrorMsg("Masukkan Master Access PIN!");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "PIN Otorisasi Salah!");
      }

      // Berhasil login
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal melakukan otorisasi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-black">
      {/* Background Tech Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            AKSHARA <span className="text-emerald-400 font-mono text-sm px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">OPS CORE</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">
            Command Center Security Gate
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
            <span className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Terminal className="w-4 h-4 text-emerald-400" />
              AUTH_LEVEL_0: SENNA_ONLY
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ARMED
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>Master Access PIN / Key</span>
                <span className="text-slate-500 text-[10px]">6-12 Characters</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4 text-emerald-400/80" />
                </div>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  className="w-full bg-slate-950/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder-slate-600 transition-all outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Token Otorisasi...</span>
                </>
              ) : (
                <>
                  <span>Buka Akses Command Deck</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
              Sesi terenkripsi HTTP-Only Cookie (Lax, 7-Hari Sesi).
            </p>
          </div>
        </div>

        {/* Back Link to Public Storefront */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs font-mono text-slate-500 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
          >
            ← Kembali ke Akshara Direct Official Store
          </Link>
        </div>
      </div>
    </div>
  );
}

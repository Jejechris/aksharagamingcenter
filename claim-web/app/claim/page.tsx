"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  KeyRound,
  Lock,
  ArrowRight,
  ArrowLeft,
  Video,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
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
      setError("Masukkan Passcode PIN rahasia yang tertera di chat pesanan.");
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
    } catch {
      setError("Terjadi kesalahan koneksi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn-secondary px-3 py-1.5 text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-900 block">
                  Akshara Claim Vault
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
                  Secure Digital License Portal
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AES-256 ENCRYPTED
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center justify-center text-center w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 mb-5 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verifikasi Pembelian Resmi Akshara Gaming Center</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 max-w-xl leading-tight">
          Buka Kredensial &amp; Garansi Resmi Pesanan Anda
        </h1>

        <p className="mt-3 text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
          Kredensial pesanan Anda tersimpan aman dalam brankas terenkripsi. Masukkan Kode Klaim dan Passcode PIN rahasia dari Kartu Akses / Chat Shopee Anda.
        </p>

        {/* Form Input Box */}
        <div className="app-card w-full max-w-md mt-7 p-6 sm:p-7 text-left space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                1. Kode Klaim Pesanan
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3.5" />
                <input
                  type="text"
                  placeholder="Contoh: AKSH-9921-MC"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 uppercase tracking-wider transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>2. Passcode PIN Rahasia</span>
                <span className="text-[11px] text-emerald-700 font-mono font-normal">
                  dari chat / Kartu QR
                </span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-emerald-600 absolute left-3.5" />
                <input
                  type="password"
                  maxLength={12}
                  placeholder="Masukkan Passcode PIN rahasia"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 tracking-widest transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary-emerald w-full py-3 text-xs font-semibold gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? "Memverifikasi Passcode..." : "Verifikasi & Buka Kredensial"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* SOP Protection Information */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 w-full text-left">
          <div className="app-card p-4">
            <div className="text-amber-700 mb-1.5 flex items-center gap-1.5 text-xs font-bold">
              <Video className="w-4 h-4 text-amber-600" />
              <span>Rekam Layar No-Cut</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Wajib rekam video layar tanpa cut sebelum membuka kredensial.
            </p>
          </div>

          <div className="app-card p-4">
            <div className="text-indigo-700 mb-1.5 flex items-center gap-1.5 text-xs font-bold">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Audit Forensik</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              IP dan detik pembukaan dicatat sebagai bukti sah transaksi resmi.
            </p>
          </div>

          <div className="app-card p-4">
            <div className="text-emerald-700 mb-1.5 flex items-center gap-1.5 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garansi Penuh</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Penggantian unit baru berlaku penuh sesuai SOP garansi Digital QR.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500 font-mono">
        <p>AKSHARA GAMING CENTER &bull; STANDALONE STOREFRONT &amp; CLAIM VAULT</p>
      </footer>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Clock,
  ArrowLeft,
  KeyRound,
  Eye,
  Globe,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Zap,
  Terminal,
  Cpu
} from "lucide-react";

export default function ClaimPasscodeRevealerPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [claimData, setClaimData] = useState<any>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  // Ambil passcode dari session jika sebelumnya diisi di halaman depan
  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      const savedPass = sessionStorage.getItem(`pass_${code}`);
      if (savedPass) {
        setPasscode(savedPass);
      }
    }
  }, [code]);

  // Cek info claim awal
  const checkClaim = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, passcode: passcode || undefined }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setClaimData(json.data);
      } else {
        setError(json.message || "Kode klaim tidak valid.");
      }
    } catch (e: any) {
      setError("Gagal menghubungi server verifikasi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkClaim();
  }, [code]);

  const handleReveal = async () => {
    if (!passcode.trim()) {
      alert("Masukkan Passcode PIN rahasia dari chat Shopee.");
      return;
    }
    if (!acknowledged) {
      alert("Wajib mencentang persetujuan SOP perekaman video unboxing sebelum membuka kredensial.");
      return;
    }

    setRevealing(true);
    setError("");

    const clientForensics = {
      screen_resolution: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "Unknown",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "Unknown",
      platform_os: typeof navigator !== "undefined" ? ((navigator as any).userAgentData?.platform || navigator.platform || "Unknown") : "Unknown",
      hardware_concurrency: typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 0) : 0,
      device_hash: typeof window !== "undefined" && typeof btoa === "function" && typeof navigator !== "undefined"
        ? btoa(`${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`).slice(0, 24)
        : "UNKNOWN_DEVICE_HASH"
    };

    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, passcode: passcode.trim(), forensics: clientForensics }),
      });
      const json = await res.json();

      if (json.status === "success") {
        setClaimData({
          ...claimData,
          ...json.data,
          claim_status: "REVEALED",
          is_already_revealed: true,
        });
      } else {
        alert(json.message || "Passcode PIN salah atau gagal membuka kredensial.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setRevealing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06070a] text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Memeriksa brankas enkripsi AES-256...</span>
        </div>
      </div>
    );
  }

  if (error || !claimData) {
    return (
      <div className="min-h-screen bg-[#06070a] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0b0e17] border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Kode Klaim Tidak Ditemukan</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">{error}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs text-slate-200 border border-white/[0.10] font-mono transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Depan</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isRevealed = claimData.claim_status === "REVEALED" || !!claimData.credential_data;
  const revealDateStr = claimData.revealed_at
    ? new Date(claimData.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    : null;

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-white">
      {/* Dynamic Ambient Background */}
      <div className="vault-ambient-mesh" />

      {/* Header */}
      <header className="border-b border-white/[0.08] backdrop-blur-2xl bg-[#07090f]/80 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal Klaim Akshara</span>
          </Link>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-500">Status Vault:</span>
            {isRevealed ? (
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Sudah Dibuka ({claimData.reveal_count || 1}x)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Terkunci Passcode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-6 relative z-10">
        {/* Product Identity Banner */}
        <div className="p-6 sm:p-7 rounded-2xl bg-[#0b0e17] border border-white/[0.10] relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-1 font-bold">
                <span>{claimData.platform}</span>
                <span>•</span>
                <span>Garansi {claimData.warranty_days} Hari</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {claimData.product_title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-400 mt-2">
                <span>Pembeli: <strong className="text-white">{claimData.buyer_username}</strong></span>
                <span>Order ID: <strong className="text-white">{claimData.order_id}</strong></span>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-500 block uppercase font-semibold">Serial Garansi:</span>
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 inline-block mt-1 shadow-inner">
                {claimData.warranty_code}
              </span>
            </div>
          </div>
        </div>

        {/* BUKTI FORENSIK JIKA PERNAH DIBUKA SEBELUMNYA */}
        {isRevealed && revealDateStr && (
          <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-amber-200 space-y-2.5 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-xs uppercase font-mono tracking-wider text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Bukti Forensik: Kredensial Ini Telah Dibuka</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-200/90 font-mono">
              Kredensial digital ini pertama kali di-reveal pada tanggal <strong>{revealDateStr} WIB</strong>.
              {claimData.access_ip && (
                <span> Tercatat dari IP: <code className="bg-black/50 px-1.5 py-0.5 rounded text-white border border-white/[0.1]">{claimData.access_ip}</code>.</span>
              )}
              {claimData.reveal_count > 1 && (
                <span> Total dibuka sebanyak <strong>{claimData.reveal_count} kali</strong>.</span>
              )}
            </p>
            <div className="text-[11px] font-mono text-amber-300/80 pt-2 border-t border-amber-500/20">
              ⚖️ Sesuai SOP Shopee &amp; Toko Akshara, komplain akun tidak valid setelah waktu pembukaan ini <strong>TIDAK DAPAT DITERIMA</strong> tanpa rekaman video unboxing tanpa jeda dari sebelum link dibuka.
            </div>
          </div>
        )}

        {/* KONTEN KREDENSIAL JIKA SUDAH TERBUKA */}
        {isRevealed ? (
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0b0e17] border border-emerald-500/30 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <Unlock className="w-4 h-4 text-emerald-400" />
                <span>Data Kredensial &amp; Lisensi Resmi</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(claimData.credential_data || "")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-slate-200 border border-white/[0.10] transition-all cursor-pointer select-none active:scale-95"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>{copied ? "Tersalin!" : "Salin Kredensial"}</span>
              </button>
            </div>

            {/* Credential Raw Display Box */}
            <div className="p-5 rounded-xl bg-black/70 border border-emerald-500/20 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed select-all shadow-inner">
              {claimData.credential_data || "Memuat data kredensial..."}
            </div>

            {/* Panduan 3 Langkah Keamanan */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Panduan 3-Langkah Wajib Setelah Menerima Akun / Key:</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <strong className="text-white block font-mono text-[11px] mb-0.5">1. Login &amp; Uji Coba Game</strong>
                  Masuk ke launcher game menggunakan kredensial di atas sambil tetap merekam layar.
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <strong className="text-white block font-mono text-[11px] mb-0.5">2. Amankan Akun (Wajib Ganti Password)</strong>
                  Untuk akun Full Access: segera ubah Email dan Password ke milik Anda pribadi, lalu aktifkan Two-Factor Authentication (2FA).
                </div>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <strong className="text-white block font-mono text-[11px] mb-0.5">3. Konfirmasi Pesanan Shopee</strong>
                  Kembali ke aplikasi Shopee, klik <em>"Pesanan Diterima"</em>, dan berikan ulasan bintang 5 untuk mengaktifkan garansi toko selama {claimData.warranty_days} hari.
                </div>
              </div>
            </div>

            {/* VIP RETENTION FLYWHEEL - 0% MARKETPLACE FEE CONVERSION */}
            {(() => {
              const vipCode = `VIP-${code.replace("AKSH-", "")}`;
              const supportWa = process.env.NEXT_PUBLIC_SUPPORT_WA || "6282299887766";
              const buyerUser = claimData.buyer_username || "Kak";
              const waMessage = encodeURIComponent(
                `Halo Admin Akshara! Saya pembeli resmi (Kode Klaim: ${code} / User: ${buyerUser}). Saya ingin menggunakan Voucher VIP [${vipCode}] untuk repeat order harga khusus tanpa biaya admin marketplace!`
              );
              const waLink = `https://wa.me/${supportWa}?text=${waMessage}`;

              return (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/[0.08] via-black/80 to-emerald-500/[0.08] border border-amber-500/30 p-5 sm:p-6 shadow-2xl space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[11px] font-mono font-bold text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>KARTU MEMBER VIP RESMI</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <span>🎁 REWARD EKSKLUSIF: DISKON Rp 15.000 – Rp 25.000!</span>
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed text-left">
                    Hemat lebih banyak! Pembelian repeat order langsung via <strong>Official Direct Store Akshara</strong> berbiaya <strong>10%–15% lebih murah</strong> dibanding Shopee karena 100% bebas dari potongan admin marketplace.
                  </p>

                  <div className="p-3.5 rounded-xl bg-black/60 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-slate-400">Kode Voucher VIP:</span>
                      <code className="text-sm font-mono font-bold text-amber-300 tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {vipCode}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleCopy(vipCode)}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode VIP</span>
                      </button>

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Klaim Diskon via WA</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* JIKA BELUM TERBUKA -> FORM PASSCODE & PERINGATAN */
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0b0e17] border border-white/[0.10] space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Masukkan Passcode PIN Pembeli
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Hanya pembeli yang memiliki Passcode PIN dari chat Shopee yang dapat membuka brankas enkripsi ini.
              </p>
            </div>

            {/* Input Passcode */}
            <div className="max-w-md mx-auto text-left">
              <label className="text-[11px] font-mono text-slate-400 uppercase block mb-1.5 font-semibold">
                Passcode PIN Rahasia Anda:
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-emerald-400/80 absolute left-3.5" />
                <input
                  type="password"
                  placeholder="Masukkan PIN rahasia dari Shopee"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-black/60 border border-white/[0.10] text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 tracking-widest transition-all"
                />
              </div>
            </div>

            {/* Legal Warning Box */}
            <div className="p-4 sm:p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-left space-y-2 max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Peringatan Wajib Perlindungan Pembeli &amp; Toko:</span>
              </div>
              <ul className="text-xs text-rose-200/90 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                <li>
                  Saat Anda menekan tombol di bawah, <strong>waktu pembukaan detik ini, IP Address, dan perangkat Anda akan dicatat permanen</strong> sebagai bukti transaksi resmi ke server Shopee.
                </li>
                <li>
                  <strong>Wajib merekam video unboxing tanpa jeda / no-cut</strong> dari sebelum menekan tombol buka sampai berhasil login ke dalam game.
                </li>
                <li>
                  Segala bentuk klaim akun bermasalah setelah kredensial dibuka tidak akan dilayani tanpa video unboxing no-cut dari detik awal.
                </li>
              </ul>
            </div>

            {/* Checkbox Persetujuan */}
            <div className="max-w-lg mx-auto text-left pt-1">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] cursor-pointer select-none hover:border-white/[0.15] transition-colors">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-black cursor-pointer"
                />
                <span className="text-xs text-slate-300 leading-relaxed font-medium">
                  Saya telah membaca SOP di atas dan telah menyiapkan perekaman video layar/HP tanpa jeda (no-cut) sebelum membuka data akun/key ini.
                </span>
              </label>
            </div>

            {/* Tombol Reveal */}
            <div className="pt-2 max-w-lg mx-auto">
              <button
                type="button"
                disabled={!acknowledged || !passcode || revealing}
                onClick={handleReveal}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-98"
              >
                <Unlock className="w-4 h-4" />
                <span>{revealing ? "Memverifikasi Passcode & Merekam Audit..." : "Buka Kredensial & Mulai Garansi"}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-600 font-mono">
        <p>AKSHARA GAMING CENTER &bull; AES-256 VAULT SECURITY &bull; KODE: {code}</p>
      </footer>
    </div>
  );
}

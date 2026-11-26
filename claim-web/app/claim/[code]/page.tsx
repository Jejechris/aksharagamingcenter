"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAdminWhatsappNumber } from "@/lib/storeConfig";
import {
  Lock,
  Unlock,
  AlertTriangle,
  Copy,
  ArrowLeft,
  KeyRound,
  Eye,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Check,
} from "lucide-react";

export default function ClaimPasscodeRevealerPage() {
  const params = useParams();
  const code = (params?.code as string)?.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [claimData, setClaimData] = useState<any>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && code) {
      const savedPass = sessionStorage.getItem(`pass_${code}`);
      if (savedPass) {
        setPasscode(savedPass);
      }
    }
  }, [code]);

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
    } catch {
      setError("Gagal menghubungi server verifikasi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkClaim();
  }, [code]);

  const handleReveal = async () => {
    setActionError("");
    if (!passcode.trim()) {
      setActionError("Masukkan Passcode PIN rahasia dari chat Shopee / Kartu QR.");
      return;
    }
    if (!acknowledged) {
      setActionError("Wajib mencentang persetujuan SOP perekaman layar (screen recording) sebelum membuka kredensial.");
      return;
    }

    setRevealing(true);

    const clientForensics = {
      screen_resolution: typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "Unknown",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
      language: typeof navigator !== "undefined" ? navigator.language : "Unknown",
      platform_os:
        typeof navigator !== "undefined"
          ? (navigator as any).userAgentData?.platform || navigator.platform || "Unknown"
          : "Unknown",
      hardware_concurrency: typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 0 : 0,
      device_hash:
        typeof window !== "undefined" && typeof btoa === "function" && typeof navigator !== "undefined"
          ? btoa(
              `${navigator.userAgent}|${window.screen.width}x${window.screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`
            ).slice(0, 24)
          : "UNKNOWN_DEVICE_HASH",
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
        setActionError(json.message || "Passcode PIN salah atau gagal membuka kredensial.");
      }
    } catch {
      setActionError("Terjadi kesalahan jaringan saat membuka brankas.");
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
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500">Memeriksa brankas enkripsi AES-256...</span>
        </div>
      </div>
    );
  }

  if (error || !claimData) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4">
        <div className="app-card max-w-md w-full p-8 border-rose-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Kode Klaim Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-mono">{error}</p>
          <div className="pt-2">
            <Link href="/" className="btn-secondary px-5 py-2.5 text-xs gap-2">
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
    <div className="min-h-screen min-w-0 max-w-full overflow-x-clip bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 min-h-[60px] py-2 sm:py-0 sm:h-16 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors min-w-0 truncate"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">Storefront &amp; </span>Portal Klaim
            </span>
          </Link>

          <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs shrink-0">
            <span className="text-slate-400 hidden sm:inline">Status Vault:</span>
            {isRevealed ? (
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold flex items-center gap-1.5 whitespace-nowrap">
                <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Sudah Dibuka ({claimData.reveal_count || 1}x)
              </span>
            ) : (
              <span className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold flex items-center gap-1.5 whitespace-nowrap">
                <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Terkunci Passcode
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full space-y-5">
        {/* Product Identity Banner */}
        <div className="app-card p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 uppercase tracking-wider mb-1 font-bold">
                <span>{claimData.platform}</span>
                <span>&bull;</span>
                <span>Garansi {claimData.warranty_days} Hari</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {claimData.product_title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500 mt-2">
                <span>
                  Pembeli: <strong className="text-slate-900">{claimData.buyer_username}</strong>
                </span>
                <span>
                  Order ID: <strong className="text-slate-900">{claimData.order_id}</strong>
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-400 block uppercase font-semibold">
                Serial Garansi Digital:
              </span>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-block mt-1">
                {claimData.warranty_code}
              </span>
            </div>
          </div>
        </div>

        {/* BUKTI FORENSIK JIKA PERNAH DIBUKA SEBELUMNYA */}
        {isRevealed && revealDateStr && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-xs uppercase font-mono tracking-wider text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Bukti Forensik: Kredensial Ini Telah Dibuka</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-900 font-mono">
              Kredensial digital ini pertama kali di-reveal pada <strong>{revealDateStr} WIB</strong>.
              {claimData.access_ip && (
                <span>
                  {" "}
                  Tercatat dari IP:{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded text-slate-900 border border-amber-200">
                    {claimData.access_ip}
                  </code>
                  .
                </span>
              )}
              {claimData.reveal_count > 1 && (
                <span>
                  {" "}
                  Total dibuka sebanyak <strong>{claimData.reveal_count} kali</strong>.
                </span>
              )}
            </p>
            <div className="text-xs text-amber-800 pt-2 border-t border-amber-200/80">
              ⚖️ Sesuai SOP Toko Akshara, komplain akun tidak valid setelah waktu pembukaan ini{" "}
              <strong>TIDAK DAPAT DITERIMA</strong> tanpa video rekam layar (screen recording) tanpa jeda dari sebelum brankas dibuka.
            </div>
          </div>
        )}

        {/* KONTEN KREDENSIAL JIKA SUDAH TERBUKA */}
        {isRevealed ? (
          <div className="app-card p-6 sm:p-7 border-emerald-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">
                <Unlock className="w-4 h-4 text-emerald-600" />
                <span>Data Kredensial &amp; Lisensi Resmi</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(claimData.credential_data || "")}
                className="btn-secondary px-3.5 py-1.5 text-xs gap-1.5"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{copied ? "Tersalin!" : "Salin Kredensial"}</span>
              </button>
            </div>

            {/* Credential Raw Display Box (Dark Terminal contrast inside Clean Light Card) */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed select-all shadow-inner">
              {claimData.credential_data || "Memuat data kredensial..."}
            </div>

            {/* Panduan 3 Langkah Keamanan */}
            <div className="space-y-3 pt-1">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Panduan 3-Langkah Wajib Setelah Menerima Akun / Key:</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block font-mono text-[11px] mb-0.5">
                    1. Login &amp; Uji Coba Game
                  </strong>
                  Masuk ke launcher game menggunakan kredensial di atas sambil tetap merekam layar.
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block font-mono text-[11px] mb-0.5">
                    2. Amankan Akun (Wajib Ganti Password)
                  </strong>
                  Untuk akun Full Access: segera ubah Email dan Password ke milik Anda pribadi, lalu aktifkan Two-Factor Authentication (2FA).
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 block font-mono text-[11px] mb-0.5">
                    3. Konfirmasi Pesanan Shopee
                  </strong>
                  Kembali ke aplikasi Shopee, klik <em>&quot;Pesanan Diterima&quot;</em>, dan berikan ulasan bintang 5 untuk mengaktifkan garansi resmi selama {claimData.warranty_days} hari.
                </div>
              </div>
            </div>

            {/* VIP RETENTION FLYWHEEL - 0% MARKETPLACE FEE CONVERSION */}
            {(() => {
              const vipCode = `VIP-${code.replace("AKSH-", "")}`;
              const supportWa = getAdminWhatsappNumber();
              const buyerUser = claimData.buyer_username || "Kak";
              const waMessage = encodeURIComponent(
                `Halo Admin Akshara! Saya pembeli resmi (Kode Klaim: ${code} / User: ${buyerUser}). Saya ingin menggunakan Voucher VIP [${vipCode}] untuk repeat order harga khusus tanpa biaya admin marketplace!`
              );
              const waLink = `https://wa.me/${supportWa}?text=${waMessage}`;

              return (
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 via-white to-emerald-50 border border-amber-200 p-5 sm:p-6 space-y-4">
                  <div className="space-y-1 text-left">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-[11px] font-mono font-bold text-amber-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>KARTU MEMBER VIP RESMI</span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      🎁 Reward Eksklusif: Diskon Rp 15.000 – Rp 25.000!
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed text-left">
                    Hemat lebih banyak! Pembelian repeat order langsung via <strong>Official Direct Storefront Akshara</strong>{" "}
                    berbiaya <strong>10%–15% lebih murah</strong> dibanding marketplace karena 100% bebas dari potongan admin.
                  </p>

                  <div className="p-3.5 rounded-xl bg-white border border-amber-200 flex flex-col lg:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-slate-500">Kode Voucher VIP:</span>
                      <code className="text-sm font-mono font-bold text-amber-800 tracking-wider bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {vipCode}
                      </code>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopy(vipCode)}
                        className="btn-secondary px-3 py-2 text-xs font-mono"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                        <span>Salin Kode VIP</span>
                      </button>

                      <Link
                        href={`/?vip=${encodeURIComponent(vipCode)}#katalog`}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Belanja Storefront VIP</span>
                      </Link>

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary-emerald px-3.5 py-2 text-xs gap-1.5"
                      >
                        <span>Klaim via WA</span>
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
          <div className="app-card p-6 sm:p-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Masukkan Passcode PIN Pembeli
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-mono">
                Hanya pembeli yang memiliki Passcode PIN dari chat Shopee / Kartu QR yang dapat membuka brankas enkripsi ini.
              </p>
            </div>

            {/* Input Passcode */}
            <div className="max-w-md mx-auto text-left">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Passcode PIN Rahasia Anda
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3.5" />
                <input
                  type="password"
                  placeholder="Masukkan PIN rahasia dari Shopee"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 tracking-widest transition-all"
                />
              </div>
            </div>

            {/* Legal Warning Box */}
            <div className="p-4 sm:p-5 rounded-xl bg-rose-50 border border-rose-200 text-left space-y-2 max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Peringatan Wajib Perlindungan Pembeli &amp; Toko:</span>
              </div>
              <ul className="text-xs text-rose-900 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  Saat Anda menekan tombol di bawah,{" "}
                  <strong>waktu pembukaan detik ini, IP Address, dan perangkat Anda akan dicatat permanen</strong>{" "}
                  sebagai bukti transaksi resmi.
                </li>
                <li>
                  <strong>Wajib merekam video rekam layar (screen recording) tanpa jeda / no-cut</strong> dari sebelum
                  menekan tombol buka sampai berhasil login ke dalam game.
                </li>
                <li>
                  Segala bentuk klaim akun bermasalah setelah kredensial dibuka tidak akan dilayani tanpa video rekaman
                  layar no-cut dari detik awal.
                </li>
              </ul>
            </div>

            {/* Checkbox Persetujuan */}
            <div className="max-w-lg mx-auto text-left">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed font-medium">
                  Saya telah membaca SOP di atas dan telah menyiapkan perekaman video layar tanpa jeda (no-cut) sebelum membuka data akun/key ini.
                </span>
              </label>
            </div>

            {actionError && (
              <div className="max-w-lg mx-auto p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{actionError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleReveal}
              disabled={revealing}
              className="btn-primary-emerald max-w-md w-full py-3.5 text-xs font-semibold gap-2 shadow-sm disabled:opacity-50 mx-auto"
            >
              <Unlock className="w-4 h-4" />
              <span>{revealing ? "Mendekripsi Brankas..." : "Buka Kredensial & Catat Garansi Sekarang"}</span>
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500 font-mono">
        <p>AKSHARA GAMING CENTER &bull; ENCRYPTED CLAIM VAULT</p>
      </footer>
    </div>
  );
}

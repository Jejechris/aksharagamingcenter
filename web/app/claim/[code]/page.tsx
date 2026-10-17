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
  Video,
  Globe,
  KeyRound,
  FileCheck,
  Smartphone,
  Eye,
  Sparkles,
  ExternalLink
} from "lucide-react";

export default function ClaimDetailRevealerPage() {
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

  // Fetch status awal (belum membocorkan kredensial)
  const fetchStatus = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claim/check?code=${encodeURIComponent(code)}`);
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
    fetchStatus();
  }, [code]);

  // Handler Buka Kredensial
  const handleReveal = async () => {
    if (!acknowledged) {
      alert("Wajib mencentang persetujuan SOP perekaman video tanpa jeda sebelum membuka kredensial.");
      return;
    }

    setRevealing(true);
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
      const res = await fetch(`/api/claim/reveal`, {
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
        alert(json.message || "Gagal membuka kredensial.");
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
      <div className="min-h-screen bg-[#070709] text-zinc-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Memeriksa token digital vault...</span>
        </div>
      </div>
    );
  }

  if (error || !claimData) {
    return (
      <div className="min-h-screen bg-[#070709] text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-zinc-950/80 border border-rose-500/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Kode Klaim Tidak Valid</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              href="/claim"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-200 border border-zinc-800 font-mono transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Portal Klaim</span>
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
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col justify-between selection:bg-violet-500/30 selection:text-violet-200">
      {/* Header */}
      <header className="border-b border-white/[0.06] backdrop-blur-md bg-zinc-950/60 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/claim" className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal Klaim</span>
          </Link>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-zinc-500">Status:</span>
            {isRevealed ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold flex items-center gap-1">
                <Eye className="w-3 h-3" />
                Sudah Dibuka ({claimData.reveal_count || 1}x)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Terkunci (Belum Dibuka)
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full space-y-6">
        {/* Product Identity Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/80 border border-white/[0.08] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-violet-400 uppercase tracking-wider mb-1">
                <span>{claimData.platform}</span>
                <span>•</span>
                <span>Garansi {claimData.warranty_days} Hari</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {claimData.product_title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-zinc-400 mt-2">
                <span>Pembeli: <strong className="text-zinc-200">{claimData.buyer_username}</strong></span>
                <span>Pesanan: <strong className="text-zinc-200">{claimData.order_id}</strong></span>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">Serial Garansi:</span>
              <span className="text-xs font-mono font-bold text-violet-300 bg-violet-950/40 px-2.5 py-1 rounded-lg border border-violet-500/30 inline-block mt-0.5">
                {claimData.warranty_code}
              </span>
            </div>
          </div>
        </div>

        {/* JIKA KREDENSIAL SUDAH DI-REVEAL SEBELUMNYA -> BUKTI FORENSIK AUDIT */}
        {isRevealed && revealDateStr && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-amber-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-xs uppercase font-mono tracking-wider text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Bukti Forensik: Kredensial Ini Telah Dibuka</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-200/90">
              Kredensial digital ini pertama kali di-reveal pada tanggal <strong>{revealDateStr} WIB</strong>.
              {claimData.access_ip && (
                <span> Tercatat dari IP: <code className="bg-black/30 px-1 py-0.5 rounded text-white">{claimData.access_ip}</code>.</span>
              )}
              {claimData.reveal_count > 1 && (
                <span> Total dibuka sebanyak <strong>{claimData.reveal_count} kali</strong>.</span>
              )}
            </p>
            <div className="text-[11px] font-mono text-amber-400/80 pt-1 border-t border-amber-500/20">
              ⚖️ Sesuai SOP Shopee &amp; Toko Akshara, komplain "tidak bisa login / akun invalid" setelah waktu pembukaan ini <strong>TIDAK DAPAT DITERIMA</strong> tanpa rekaman video layar (screen recording) tanpa jeda (no-cut &amp; unedited) dari sebelum link dibuka.
            </div>
          </div>
        )}

        {/* KONTEN KREDENSIAL JIKA SUDAH TERBUKA */}
        {isRevealed ? (
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-950/90 border border-violet-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                <Unlock className="w-4 h-4" />
                <span>Data Kredensial &amp; Lisensi Resmi</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(claimData.credential_data || "")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 border border-zinc-800 transition-colors cursor-pointer select-none"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "Tersalin!" : "Salin Kredensial"}</span>
              </button>
            </div>

            {/* Credential Raw Display Box */}
            <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed select-all">
              {claimData.credential_data || "Memuat data kredensial..."}
            </div>

            {/* Panduan 3 Langkah Keamanan */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-violet-400" />
                <span>Panduan 3-Langkah Wajib Setelah Menerima Akun / Key:</span>
              </h3>
              <div className="space-y-2 text-xs text-zinc-300 leading-relaxed font-sans">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/[0.04]">
                  <strong className="text-white block font-mono text-[11px] mb-0.5">1. Login &amp; Uji Coba Game</strong>
                  Masuk ke launcher game (Steam/Microsoft) menggunakan kredensial di atas sambil tetap merekam layar.
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/[0.04]">
                  <strong className="text-white block font-mono text-[11px] mb-0.5">2. Amankan Akun (Wajib Ganti Password)</strong>
                  Untuk akun Full Access: segera ubah Email dan Password ke milik Anda pribadi, lalu aktifkan Two-Factor Authentication (2FA).
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/[0.04]">
                  <strong className="text-white block font-mono text-[11px] mb-0.5">3. Konfirmasi Pesanan &amp; Klaim Garansi Toko</strong>
                  Kembali ke aplikasi Shopee, klik <em>"Pesanan Diterima"</em>, dan berikan ulasan bintang 5 untuk mengaktifkan masa garansi toko selama {claimData.warranty_days} hari penuh.
                </div>
              </div>
            </div>

            {/* VIP RETENTION FLYWHEEL - 0% MARKETPLACE FEE CONVERSION */}
            {(() => {
              const vipCode = `VIP-${code.replace("AKSH-", "")}`;
              const supportWa = process.env.NEXT_PUBLIC_SUPPORT_WA || "6281234567890";
              const buyerUser = claimData.buyer_username || "Kak";
              const waMessage = encodeURIComponent(
                `Halo Admin Akshara! Saya pembeli resmi (Kode Klaim: ${code} / User: ${buyerUser}). Saya ingin menggunakan Voucher VIP [${vipCode}] untuk repeat order harga khusus tanpa biaya admin marketplace!`
              );
              const waLink = `https://wa.me/${supportWa}?text=${waMessage}`;

              return (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950/40 via-zinc-950 to-emerald-950/30 border border-amber-500/40 p-5 sm:p-6 shadow-2xl space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 text-left">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-400">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>KARTU MEMBER VIP RESMI</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <span>🎁 REWARD EKSKLUSIF: DISKON Rp 15.000 – Rp 25.000!</span>
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed text-left">
                    Hemat lebih banyak! Pembelian repeat order langsung via <strong>Official Direct Store Akshara</strong> berbiaya <strong>10%–15% lebih murah</strong> dibanding Shopee karena 100% bebas dari potongan admin marketplace 8%. Dilengkapi pengiriman vault kilat 5 detik &amp; QRIS resmi.
                  </p>

                  <div className="p-3.5 rounded-xl bg-black/60 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-zinc-400">Kode Voucher VIP:</span>
                      <code className="text-sm font-mono font-bold text-amber-400 tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {vipCode}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleCopy(vipCode)}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-amber-300 border border-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode VIP</span>
                      </button>

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Klaim Diskon (WhatsApp VIP)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 text-left">
                    <span>⚡ Berlaku permanen untuk semua game di katalog Akshara Gaming Center.</span>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* JIKA BELUM DIBUKA -> TAMPILKAN GERBANG VERIFIKASI KEAMANAN */
          <div className="p-6 sm:p-8 rounded-2xl bg-zinc-950/90 border border-white/[0.08] space-y-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-400 mx-auto flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Kredensial Siap Dibuka
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Kredensial pesanan Anda masih tersimpan aman dan terenkripsi di vault. 
                Sebelum membuka, harap baca peringatan SOP perlindungan garansi di bawah ini.
              </p>
            </div>

            {/* Input Passcode */}
            <div className="max-w-md mx-auto text-left">
              <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1.5">
                Passcode PIN Rahasia Anda:
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="password"
                  placeholder="Masukkan PIN rahasia dari Shopee"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 tracking-widest"
                />
              </div>
            </div>

            {/* Legal Warning Notice */}
            <div className="p-4 sm:p-5 rounded-xl bg-rose-950/20 border border-rose-500/40 text-left space-y-2 max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Peringatan Wajib Perlindungan Pembeli &amp; Toko:</span>
              </div>
              <ul className="text-xs text-rose-200/90 space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
                <li>
                  Saat Anda menekan tombol di bawah, <strong>waktu pembukaan detik ini, IP Address, dan perangkat Anda akan dicatat permanen</strong> sebagai bukti transaksi resmi ke server Shopee.
                </li>
                <li>
                  <strong>Wajib merekam video layar (screen recording) tanpa jeda (no-cut &amp; unedited)</strong> dari sebelum menekan tombol buka sampai berhasil login ke dalam game.
                </li>
                <li>
                  Segala bentuk klaim <em>"akun tidak bisa login"</em> atau <em>"key sudah terpakai"</em> setelah kredensial dibuka tidak akan diterima tanpa rekaman video tanpa jeda dari detik awal.
                </li>
              </ul>
            </div>

            {/* Checkbox Persetujuan */}
            <div className="max-w-lg mx-auto text-left pt-2">
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 cursor-pointer select-none hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-700 text-violet-600 focus:ring-violet-500 bg-zinc-950 cursor-pointer"
                />
                <span className="text-xs text-zinc-300 leading-relaxed font-medium">
                  Saya telah membaca SOP di atas dan telah menyiapkan perekaman video layar/HP tanpa jeda (no-cut) sebelum membuka data akun/key ini.
                </span>
              </label>
            </div>

            {/* Tombol Reveal */}
            <div className="pt-2 max-w-lg mx-auto">
              <button
                type="button"
                disabled={!acknowledged || revealing}
                onClick={handleReveal}
                className="w-full py-3.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xl shadow-violet-600/25 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Unlock className="w-4 h-4" />
                <span>{revealing ? "Merekam Audit & Membuka..." : "Buka Kredensial & Mulai Garansi"}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-6 text-center text-xs text-zinc-600 font-mono">
        <p>AKSHARA GAMING CENTER • DIGITAL FORENSIC VAULT • KODE: {code}</p>
      </footer>
    </div>
  );
}

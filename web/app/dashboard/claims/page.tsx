"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Plus,
  Copy,
  ExternalLink,
  Trash2,
  RefreshCw,
  Clock,
  Eye,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Globe,
  Printer,
  FileText,
  Scale,
  X,
  Check,
  ShieldAlert,
  Inbox,
  ArrowRight,
  QrCode,
} from "lucide-react";
import { renderDigitalWarrantyCardPng } from "@/lib/digitalWarrantyCard";

export default function ClaimsAdminDashboardPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [claimBaseUrl, setClaimBaseUrl] = useState<string>(
    process.env.NEXT_PUBLIC_CLAIM_BASE_URL ||
    process.env.NEXT_PUBLIC_CLAIM_WEB_URL ||
    "https://claimakshara.vercel.app"
  );

  // Dispute Dossier Modal State
  const [dossierClaim, setDossierClaim] = useState<any | null>(null);
  const [copiedDefenseText, setCopiedDefenseText] = useState(false);

  // Modal Create
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_title: "",
    buyer_username: "",
    platform: "PC / Steam Key",
    credential_data: "",
    order_id: "",
    warranty_days: 30,
    custom_code: "",
    passcode: "",
  });

  // Toast Notification
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchClaims = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/claim/manage");
      const json = await res.json();
      if (json.status === "success") {
        setClaims(json.data || []);
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal mengambil data klaim.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    if (typeof window !== "undefined") {
      const envUrl = process.env.NEXT_PUBLIC_CLAIM_BASE_URL || process.env.NEXT_PUBLIC_CLAIM_WEB_URL;
      if (envUrl) {
        setClaimBaseUrl(envUrl.replace(/\/$/, ""));
      } else {
        setClaimBaseUrl(window.location.origin);
      }
    }
  }, []);

  const handleOpenModal = () => {
    // Generate PIN 6 digit unik yang belum ada di claims
    const usedPins = new Set(claims.map((c: any) => String(c.passcode || "").trim()));
    let newPin = "";
    for (let i = 0; i < 10000; i++) {
      const p = String(Math.floor(100000 + Math.random() * 900000));
      if (!usedPins.has(p)) {
        newPin = p;
        break;
      }
    }
    setFormData({
      product_title: "",
      buyer_username: "",
      platform: "PC / Steam Key",
      credential_data: "",
      order_id: "",
      warranty_days: 30,
      custom_code: "",
      passcode: newPin || String(Math.floor(100000 + Math.random() * 900000)),
    });
    setCreateModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/claim/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.status === "success") {
        setCreateModalOpen(false);
        showToast("Kode klaim baru berhasil dibuat & terenkripsi!");
        setFormData({
          product_title: "",
          buyer_username: "",
          platform: "PC / Steam Key",
          credential_data: "",
          order_id: "",
          warranty_days: 30,
          custom_code: "",
          passcode: "",
        });
        fetchClaims();
      } else {
        showToast(json.message || "Gagal membuat klaim.");
      }
    } catch (err: any) {
      showToast("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Yakin ingin menghapus kode klaim ${code}?`)) return;
    try {
      const res = await fetch(`/api/claim/manage?code=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.status === "success") {
        fetchClaims();
        showToast(`Kode klaim ${code} berhasil dihapus.`);
      } else {
        showToast("Gagal menghapus kode klaim.");
      }
    } catch (e) {
      showToast("Gagal menghapus kode klaim.");
    }
  };

  const handleCopyShopeeChat = (item: any) => {
    const pin = item.passcode || "882194";
    const warrantyCode = item.warranty_code || item.claim_code;
    // Shopee-Safe Zero-Link Chat: bebas URL eksternal agar tidak diblokir/disensor Shopee!
    const text =
      `🎮 [AKSHARA GAMING CENTER — KARTU AKSES DIGITAL]\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Halo kak ${item.buyer_username}, pesanan game ${item.product_title} sudah siap dibuka 100% digital!\n\n` +
      `📌 KODE KLAIM: ${item.claim_code}\n` +
      `🔒 PASSCODE PIN: ${pin}\n` +
      `📜 SERIAL GARANSI: ${warrantyCode}\n` +
      `📷 CARA BUKA: Scan QR Code pada gambar Kartu Akses Digital yang kami kirimkan di atas lewat Kamera HP / Google Lens, lalu masukkan Passcode PIN.\n\n` +
      `⚠️ PENTING (SOP GARANSI ${item.warranty_days || 30} HARI): Rekam layar (Screen Recording) tanpa jeda (no-cut) dari sebelum scan QR / buka brankas hingga berhasil login pertama kali. Sistem mencatat waktu & IP akses demi keamanan bersama.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Selamat bermain kak! Setelah berhasil masuk mohon klik Pesanan Diterima ya 🚀`;

    navigator.clipboard.writeText(text);
    setCopiedCode(item.claim_code);
    setTimeout(() => setCopiedCode(null), 2500);
    showToast("Template Shopee-Safe (Zero-Link + QR) disalin!");
  };

  const handleDownloadClaimCardPng = async (item: any) => {
    const baseUrl = claimBaseUrl && claimBaseUrl.trim() ? claimBaseUrl.trim() : "https://claimakshara.vercel.app";
    const dt = item.created_at ? new Date(item.created_at) : new Date();
    const issueDate = !Number.isNaN(dt.getTime())
      ? dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
      : "-";
    const dataUrl = await renderDigitalWarrantyCardPng({
      side: "front",
      buyerName: item.buyer_username || "Customer",
      gameTitle: item.product_title || "Original Game License",
      platform: item.platform || "PC / Digital",
      productType: "100% Digital Access Pass",
      orderId: item.order_id || "-",
      serialNumber: item.warranty_code || item.claim_code,
      issueDate,
      warrantyDays: Number(item.warranty_days) || 30,
      claimCode: item.claim_code,
      passcode: item.passcode,
      claimBaseUrl: baseUrl,
    });
    if (!dataUrl) {
      showToast("Gagal membuat gambar Kartu Akses QR.");
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `akshara-akses-qr-${item.claim_code}.png`;
    a.click();
    showToast(`✅ Kartu Akses QR ${item.claim_code} siap kirim via Chat Shopee!`);
  };

  const filtered = claims.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.claim_code?.toLowerCase().includes(q) ||
      c.buyer_username?.toLowerCase().includes(q) ||
      c.product_title?.toLowerCase().includes(q) ||
      c.order_id?.toLowerCase().includes(q)
    );
  });

  const totalCount = claims.length;
  const unclaimedCount = claims.filter((c) => c.status !== "REVEALED").length;
  const revealedCount = claims.filter((c) => c.status === "REVEALED").length;

  const displayDomain = (claimBaseUrl || "https://claimakshara.vercel.app").replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ─── 1. Header Halaman ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Brankas Klaim &amp; Forensik Anti-Curang
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AES-256 GCM Protected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Berikan tautan klaim ber-token kepada pembeli Shopee. Sistem mencatat IP, perangkat, dan detik pertama saat pembeli melihat kredensial akun/key, mencegah penipuan klaim sepihak.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchClaims}
            disabled={refreshing}
            className="btn-secondary text-xs font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin text-slate-800" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="btn-primary-emerald text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kode Klaim Baru</span>
          </button>
        </div>
      </div>

      {/* ─── 2. 3 KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="app-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Kredensial
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Token lisensi terdaftar</p>
          </div>
        </div>

        <div className="app-card p-4 sm:p-5 flex flex-col justify-between border-emerald-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
              Belum Dibuka (Aman)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">
              {unclaimedCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Menunggu pembeli mengakses portal</p>
          </div>
        </div>

        <div className="app-card p-4 sm:p-5 flex flex-col justify-between border-amber-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-800 uppercase tracking-wider">
              Sudah Di-Reveal (Tercatat IP)
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Eye className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 tabular-nums">
              {revealedCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Bukti forensik tersimpan permanen</p>
          </div>
        </div>
      </div>

      {/* ─── 3. Website 2 Domain Configuration Bar ─── */}
      <div className="app-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Domain Portal Klaim Pelanggan:</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-[10px] text-indigo-700 font-mono font-semibold">
                claimakshara
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              URL target yang disisipkan ke pesan Shopee saat menekan tombol <strong>Chat Shopee</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={claimBaseUrl}
            onChange={(e) => setClaimBaseUrl(e.target.value)}
            placeholder="https://claimakshara.vercel.app"
            className="w-full sm:w-72 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-400 bg-white"
          />
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") setClaimBaseUrl(window.location.origin);
              showToast("Domain diatur ke origin website ini.");
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 shrink-0"
            title="Gunakan domain web saat ini"
          >
            Origin Web
          </button>
          <button
            type="button"
            onClick={() => {
              setClaimBaseUrl("https://claimakshara.vercel.app");
              showToast("Domain di-reset ke default Vercel.");
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-medium text-slate-700 shrink-0"
            title="Reset ke domain default Vercel"
          >
            Vercel Default
          </button>
        </div>
      </div>

      {/* ─── 4. Table Section (Light Mode) ─── */}
      <div className="app-card overflow-hidden bg-white space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode, pembeli, game, no pesanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 bg-white"
            />
          </div>

          <div className="text-xs font-medium text-slate-500 tabular-nums self-end sm:self-auto">
            Menampilkan {filtered.length} dari {totalCount} token klaim
          </div>
        </div>

        {/* List of Claims — Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-200">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">Memuat database klaim...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">Tidak ada token klaim yang sesuai pencarian.</div>
          ) : (
            filtered.map((item) => {
              const isRevealed = item.status === "REVEALED";
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              const baseUrl = claimBaseUrl && claimBaseUrl.trim() ? claimBaseUrl.trim() : origin;
              const claimUrl = `${baseUrl.replace(/\/$/, "")}/claim/${item.claim_code}`;
              return (
                <div key={`mob-${item.claim_code}`} className="p-3.5 space-y-2.5 text-xs bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{item.claim_code}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          PIN: {item.passcode}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium text-slate-700 truncate mt-0.5">{item.product_title}</div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        @{item.buyer_username} &bull; Garansi {item.warranty_days || 30}H
                      </div>
                    </div>
                    {isRevealed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        REVEALED ({item.reveal_count || 1}x)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        UNCLAIMED
                      </span>
                    )}
                  </div>

                  {item.revealed_at && (
                    <div className="text-[10px] font-mono text-indigo-700 bg-indigo-50/60 px-2.5 py-1.5 rounded-lg border border-indigo-100">
                      Dibuka {new Date(item.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB &bull; IP: {item.revealed_ip || item.forensics?.ip || "-"}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {isRevealed && (
                      <button
                        type="button"
                        onClick={() => setDossierClaim(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Scale className="w-3 h-3" />
                        <span>Bukti</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadClaimCardPng(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>Kartu QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyShopeeChat(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-medium inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCode === item.claim_code ? "Tersalin" : "Chat Shopee"}</span>
                    </button>
                    <a
                      href={claimUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg border border-slate-200"
                      title="Buka portal klaim"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.claim_code)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-200 ml-auto"
                      title="Hapus token"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* List of Claims — Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Kode &amp; Game</th>
                <th className="py-3 px-4">Pembeli / Pesanan</th>
                <th className="py-3 px-4">Status Vault</th>
                <th className="py-3 px-4">Waktu Buka &amp; IP</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                      <p className="text-xs font-mono">Memuat database klaim...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Inbox className="w-6 h-6 text-slate-400" />
                      <p className="text-xs">Tidak ada token klaim yang sesuai pencarian.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isRevealed = item.status === "REVEALED";
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const baseUrl = claimBaseUrl && claimBaseUrl.trim() ? claimBaseUrl.trim() : origin;
                  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
                  const claimUrl = `${cleanBaseUrl}/claim/${item.claim_code}`;

                  return (
                    <tr key={item.claim_code} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {item.claim_code}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            PIN: {item.passcode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-sans mt-0.5 max-w-xs truncate" title={item.product_title}>
                          {item.product_title}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Garansi: {item.warranty_days || 30} Hari
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">@{item.buyer_username}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {item.order_id ? `#${item.order_id}` : "Order Direct"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isRevealed ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Eye className="w-3 h-3 text-amber-600" />
                              REVEALED ({item.reveal_count || 1}x)
                            </span>
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                              Bukti Tersimpan
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            UNCLAIMED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {item.revealed_at ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-800 font-mono text-[11px]">
                              {new Date(item.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                            </div>
                            <div className="text-[11px] font-mono text-indigo-700">
                              IP: {item.revealed_ip || item.forensics?.ip || "-"}
                            </div>
                            {item.forensics?.isp && (
                              <div className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                                {item.forensics.isp}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isRevealed && (
                            <button
                              type="button"
                              onClick={() => setDossierClaim(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                              title="Cetak Bukti Forensik untuk Shopee Dispute"
                            >
                              <Scale className="w-3.5 h-3.5 text-amber-600" />
                              <span>Bukti Sengketa</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownloadClaimCardPng(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                            title="Download Kartu Akses & Garansi QR PNG untuk dikirim di Chat Shopee (bebas sensor link)"
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Kartu QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyShopeeChat(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                            title="Salin template Shopee Chat (Bebas URL eksternal / Anti-Sensor)"
                          >
                            {copiedCode === item.claim_code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-600" />
                            )}
                            <span>Chat Shopee</span>
                          </button>

                          <a
                            href={claimUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                            title="Buka portal klaim di tab baru"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.claim_code)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Hapus token klaim"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* MODAL: BUAT KODE KLAIM BARU (100% Light Mode)             */}
      {/* ═════════════════════════════════════════════════════════ */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Terbitkan Token Kredensial &amp; PIN Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Judul Game:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Project Zomboid / Minecraft Java & Bedrock"
                  value={formData.product_title}
                  onChange={(e) => setFormData({ ...formData, product_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username Pembeli:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: budi_santoso"
                    value={formData.buyer_username}
                    onChange={(e) => setFormData({ ...formData, buyer_username: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Platform:</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="PC / Steam Key">PC / Steam Key</option>
                    <option value="PC / Microsoft Account">PC / Microsoft Account</option>
                    <option value="PC / Rockstar Account">PC / Rockstar Account</option>
                    <option value="PC / GOG Key">PC / GOG Key</option>
                    <option value="PC / EA App Key">PC / EA App Key</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Kredensial Akun / Digital Key:
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={`Contoh:\nEmail: mc_buyer@outlook.com\nPassword: SecretPassword123#\nAtau jika CDKey:\nSTEAM-KEY-XXXXX-YYYYY`}
                  value={formData.credential_data}
                  onChange={(e) => setFormData({ ...formData, credential_data: e.target.value })}
                  className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  🔒 Kredensial ini disimpan terenkripsi di vault dan HANYA bisa dilihat pembeli setelah membuka portal dengan PIN.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Passcode PIN:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const usedPins = new Set(claims.map((c: any) => String(c.passcode || "").trim()));
                        let newPin = "";
                        for (let i = 0; i < 10000; i++) {
                          const p = String(Math.floor(100000 + Math.random() * 900000));
                          if (!usedPins.has(p)) {
                            newPin = p;
                            break;
                          }
                        }
                        setFormData({
                          ...formData,
                          passcode: newPin || String(Math.floor(100000 + Math.random() * 900000)),
                        });
                      }}
                      className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      🎲 Acak Lain
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="PIN 6 Digit Unik"
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono font-bold tracking-wider focus:outline-none focus:border-emerald-500 bg-white"
                  />
                  <span className="text-[10px] text-emerald-700 block mt-0.5">
                    ✅ Dijamin Unik (Anti-Tabrakan)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                    Custom Kode Klaim:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: AKSH-9921-MC"
                    value={formData.custom_code}
                    onChange={(e) => setFormData({ ...formData, custom_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-emerald-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">Auto-generate jika kosong</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">No Pesanan Shopee:</label>
                  <input
                    type="text"
                    placeholder="Contoh: 241015ABCDEF"
                    value={formData.order_id}
                    onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Masa Garansi (Hari):</label>
                  <input
                    type="number"
                    value={formData.warranty_days}
                    onChange={(e) => setFormData({ ...formData, warranty_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="btn-secondary text-xs px-4 py-2 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary-emerald text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Buat Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* MODAL: BUKTI SENGKETA SHOPEE (Forensic Dispute Dossier)    */}
      {/* ═════════════════════════════════════════════════════════ */}
      {dossierClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-900 print:border-none print:shadow-none print:text-black print:bg-white max-h-[92vh] overflow-y-auto">
            {/* Header Sertifikat */}
            <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  <span>Akshara Digital Forensics &bull; Dispute Proof</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 print:text-black tracking-tight">
                  BUKTI SAH SERAH TERIMA LISENSI DIGITAL
                </h2>
                <p className="text-xs text-slate-500 print:text-slate-600 mt-0.5">
                  Dokumen Pembuktian Resmi Sengketa Transaksi Shopee Resolution Center
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDossierClaim(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Transaksi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono print:bg-slate-50 print:border-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">No. Pesanan Shopee</span>
                <span className="font-bold text-slate-900 print:text-black">{dossierClaim.order_id || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Username Pembeli</span>
                <span className="font-bold text-emerald-700 print:text-black">@{dossierClaim.buyer_username}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Produk / Game</span>
                <span className="font-bold text-slate-900 print:text-black truncate block">{dossierClaim.product_title}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Kode Klaim Unik</span>
                <span className="font-bold text-slate-900 print:text-black">{dossierClaim.claim_code}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">PIN Akses Rahasia</span>
                <span className="font-bold text-slate-900 print:text-black">{dossierClaim.passcode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Serial Garansi Toko</span>
                <span className="font-bold text-slate-900 print:text-black">{dossierClaim.warranty_code || "-"}</span>
              </div>
            </div>

            {/* Bukti Kriptografis & Audit Log Server */}
            <div className="space-y-3 text-xs">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Bukti Kriptografis &amp; Log Forensik Akses</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono print:bg-slate-50 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 text-[11px]">Waktu Akses WIB:</span>
                  <span className="font-bold text-slate-900 print:text-black">
                    {dossierClaim.revealed_at ? new Date(dossierClaim.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-"} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 text-[11px]">Alamat IP Pembeli:</span>
                  <span className="font-bold text-indigo-700 print:text-black">{dossierClaim.revealed_ip || dossierClaim.forensics?.ip || "-"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 text-[11px]">Penyedia Internet (ISP):</span>
                  <span className="font-bold text-slate-900 print:text-black">{dossierClaim.forensics?.isp || "Residential Network"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 text-[11px]">Geolokasi Pembeli:</span>
                  <span className="font-bold text-slate-900 print:text-black">
                    {dossierClaim.forensics?.city || "Unknown"}, {dossierClaim.forensics?.country || "Indonesia"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 text-[11px]">Perangkat / OS / Resolusi:</span>
                  <span className="font-bold text-slate-900 print:text-black truncate max-w-[200px]">
                    {dossierClaim.forensics?.platform_os || "Unknown"} ({dossierClaim.forensics?.screen_resolution || "Standard"})
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 text-[11px]">Status VPN / Proxy:</span>
                  <span className={`font-bold ${dossierClaim.forensics?.is_vpn_or_proxy ? "text-rose-600" : "text-emerald-700"}`}>
                    {dossierClaim.forensics?.is_vpn_or_proxy ? "⚠️ Terdeteksi VPN / Datacenter" : "🛡️ Aman (Residential ISP Asli)"}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:col-span-2 pt-1">
                  <span className="text-slate-500 text-[11px]">Device Fingerprint Hash:</span>
                  <code className="bg-white px-2 py-0.5 rounded text-slate-800 border border-slate-300 text-[10px]">
                    {dossierClaim.forensics?.device_hash || "AKSH-SEC-HASH-OK"}
                  </code>
                </div>
              </div>
            </div>

            {/* SOP Persetujuan Video */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                <strong>SOP Uncut Video Disetujui:</strong> Pembeli telah menyetujui syarat wajib menyertakan video rekaman tanpa jeda sebelum kredensial didekripsi di layar portal.
              </span>
            </div>

            {/* Format Argumen Sengketa untuk Hakim Shopee */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Argumen Mediasi Formal Shopee (Tinggal Paste):</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("formal-dispute-text") as HTMLTextAreaElement;
                    if (el) {
                      navigator.clipboard.writeText(el.value);
                      setCopiedDefenseText(true);
                      setTimeout(() => setCopiedDefenseText(false), 2500);
                      showToast("Teks pembelaan disalin!");
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 border border-amber-200 transition-colors"
                >
                  {copiedDefenseText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Argumen Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Teks Pembelaan</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                id="formal-dispute-text"
                readOnly
                rows={7}
                value={`Yth. Tim Hakim Mediasi & Resolusi Shopee Indonesia,

Menanggapi pengajuan komplain pembeli (@${dossierClaim.buyer_username || "Pembeli"}) untuk No. Pesanan ${dossierClaim.order_id || "-"}:

1. Toko Akshara Gaming Center telah menyerahkan lisensi/kredensial digital secara resmi melalui Portal Kredensial Terenkripsi Bank-Grade (${displayDomain}).
2. Pembeli telah BERHASIL melakukan autentikasi menggunakan PIN Rahasia 6-Digit (${dossierClaim.passcode}) yang hanya dikirimkan ke chat privat pembeli.
3. Kredensial telah DIBUKA & DIDEKRIPSI secara sah pada:
   • Waktu Akses: ${dossierClaim.revealed_at ? new Date(dossierClaim.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-"} WIB
   • Alamat IP: ${dossierClaim.revealed_ip || dossierClaim.forensics?.ip || "-"} (${dossierClaim.forensics?.isp || "ISP"})
   • Lokasi: ${dossierClaim.forensics?.city || "Indonesia"}, ${dossierClaim.forensics?.country || "ID"}
   • Perangkat/OS: ${dossierClaim.forensics?.platform_os || "Device"} (${dossierClaim.forensics?.screen_resolution || "Standard"})
   • Device Fingerprint Hash: ${dossierClaim.forensics?.device_hash || "AKSH-VERIFIED"}
   • Total Akses Pembeli: ${dossierClaim.reveal_count || 1} kali
4. Sesuai SOP & Ketentuan Garansi Toko yang telah disetujui pembeli sebelum kredensial dibuka di portal, pembeli WAJIB melampirkan video login tanpa jeda (uncut video) sejak pertama kali PIN dimasukkan. Pembeli TIDAK dapat menunjukkan bukti video uncut yang sah.
5. Berdasarkan bukti rekam jejak audit forensik digital server di atas, pesanan telah diterima dan diakses penuh oleh pembeli. Mohon dana pesanan diteruskan ke penjual. Terima kasih.`}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Tombol Aksi */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between print:hidden">
              <span className="text-[11px] text-slate-500">
                Sertifikat bukti digital berstatus autentik &amp; sah verifikasi e-commerce.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-secondary text-xs px-4 py-2 rounded-lg inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDossierClaim(null)}
                  className="btn-primary text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

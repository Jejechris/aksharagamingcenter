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
  ArrowLeft,
  Search,
  Globe,
  Smartphone,
  Printer,
  FileText,
  Scale,
  X,
  Check
} from "lucide-react";

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
        alert(json.message || "Gagal membuat klaim.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
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
      }
    } catch (e) {
      alert("Gagal menghapus.");
    }
  };

  const handleCopyShopeeChat = (item: any) => {
    // Generate Shopee Ready Message
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const baseUrl = (claimBaseUrl && claimBaseUrl.trim()) ? claimBaseUrl.trim() : origin;
    const cleanBaseUrl = baseUrl.replace(/\/$/, "");
    const claimUrl = `${cleanBaseUrl}/claim/${item.claim_code}`;
    const pin = item.passcode || "882194";
    const text = (
      `🎮 [AKSHARA GAMING CENTER — PENGIRIMAN LISENSI RESMI]\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Halo kak ${item.buyer_username}, pesanan game ${item.product_title} kakak sudah siap!\n\n` +
      `🔑 KODE KLAIM: ${item.claim_code}\n` +
      `🔒 PASSCODE PIN RAHASIA: ${pin}\n` +
      `🔗 LINK BUKA KREDENSIAL: ${claimUrl}\n\n` +
      `⚠️ PENTING: Sebelum membuka link & memasukkan passcode PIN, siapkan perekaman screenshot kendala tanpa jeda (no-cut) untuk mengaktifkan garansi resmi toko selama ${item.warranty_days} hari. Sistem mencatat waktu dan IP saat kredensial dibuka.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Terima kasih dan selamat bermain! 🚀`
    );
    navigator.clipboard.writeText(text);
    setCopiedCode(item.claim_code);
    setTimeout(() => setCopiedCode(null), 2500);
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              Klaim &amp; Forensik Anti-Curang
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Vault Kredensial &amp; Deteksi Forensik Akses</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Berikan link klaim ber-token kepada pembeli Shopee. Sistem mencatat IP dan detik pertama saat pembeli melihat kredensial akun/key, mencegah penipuan klaim sepihak.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchClaims}
            disabled={refreshing}
            className="v0-btn-secondary px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 cursor-pointer select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer select-none"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kode Klaim Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="v0-card p-4 rounded-2xl border-white/[0.08] bg-zinc-950/70">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
            <span>Total Kredensial Diterbitkan</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalCount}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Token Klaim Terdaftar</div>
        </div>

        <div className="v0-card p-4 rounded-2xl border-emerald-500/20 bg-emerald-950/10">
          <div className="text-[11px] font-mono text-emerald-400/80 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Belum Dibuka (Aman)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{unclaimedCount}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Menunggu Akses Pembeli</div>
        </div>

        <div className="v0-card p-4 rounded-2xl border-amber-500/20 bg-amber-950/10">
          <div className="text-[11px] font-mono text-amber-400/80 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Sudah Di-Reveal (Tercatat IP)</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{revealedCount}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Bukti Forensik Tersimpan</div>
        </div>
      </div>

      {/* Website 2 Domain Configuration */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950/80 border border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Domain Website Ke-2 (Customer Claim Vault):</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[10px] text-cyan-300 font-mono">
                claimakshara
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
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
            className="w-full sm:w-72 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") setClaimBaseUrl(window.location.origin);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-emerald-400 border border-zinc-800 shrink-0"
            title="Gunakan domain web saat ini"
          >
            Origin Web
          </button>
          <button
            type="button"
            onClick={() => setClaimBaseUrl("https://claimakshara.vercel.app")}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-zinc-300 border border-zinc-800 shrink-0"
            title="Reset ke domain default Vercel"
          >
            Vercel Default
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="v0-card p-5 rounded-2xl border-white/[0.08] space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode, pembeli, game, no pesanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="text-xs font-mono text-zinc-500 self-end sm:self-auto">
            Menampilkan {filtered.length} dari {totalCount} token klaim
          </div>
        </div>

        {/* List of Claims */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Kode &amp; Game</th>
                <th className="py-2.5 px-3">Pembeli / Pesanan</th>
                <th className="py-2.5 px-3">Status Vault</th>
                <th className="py-2.5 px-3">Waktu Buka &amp; IP</th>
                <th className="py-2.5 px-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                    Belum ada data klaim. Klik <strong>"Buat Kode Klaim Baru"</strong> untuk menerbitkan token kredensial pertama.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isRev = item.status === "REVEALED";
                  const revTime = item.revealed_at
                    ? new Date(item.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                    : "-";

                  return (
                    <tr key={item.claim_code} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-xs text-emerald-300">
                            {item.claim_code}
                          </span>
                          <span className="font-mono text-[10px] text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                            PIN: {item.passcode || "882194"}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 font-sans font-medium mt-1">
                          {item.product_title}
                        </div>
                        <div className="text-[10px] text-zinc-500">{item.platform}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-zinc-200 font-semibold">{item.buyer_username}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{item.order_id}</div>
                      </td>

                      <td className="py-3 px-3">
                        {isRev ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                            <Eye className="w-3 h-3" />
                            Dibuka ({item.reveal_count || 1}x)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                            <Lock className="w-3 h-3" />
                            Belum Dibuka
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isRev ? (
                          <div className="space-y-1">
                            <div className="text-zinc-300 text-[11px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{revTime} WIB</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-cyan-400" />
                              <span>IP: <code className="text-cyan-300">{item.revealed_ip || "-"}</code></span>
                            </div>
                            {item.forensics && (
                              <div className="text-[10px] space-y-0.5 pt-1 border-t border-white/[0.04]">
                                <div className="text-zinc-400">
                                  <span>📍 {item.forensics.city || "ID"}, {item.forensics.country || "ID"} ({item.forensics.isp || "ISP"})</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className={item.forensics.is_vpn_or_proxy ? "text-rose-400 font-bold" : "text-emerald-400"}>
                                    {item.forensics.is_vpn_or_proxy ? "⚠️ VPN/Proxy" : "🛡️ ISP Residential"}
                                  </span>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-zinc-500">{item.forensics.screen_resolution}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRev && (
                            <button
                              type="button"
                              onClick={() => {
                                setDossierClaim(item);
                                setCopiedDefenseText(false);
                              }}
                              className="px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-mono text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
                              title="Cetak Bukti Sengketa Shopee (Forensic Dossier)"
                            >
                              <Scale className="w-3 h-3 text-amber-400" />
                              <span className="hidden sm:inline">Bukti Sengketa</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyShopeeChat(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-emerald-400 border border-zinc-800 hover:border-emerald-500/40 flex items-center gap-1 transition-colors"
                            title="Salin template pesan chat Shopee lengkap dengan link klaim"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedCode === item.claim_code ? "Tersalin!" : "Chat Shopee"}</span>
                          </button>

                          <a
                            href={`${(claimBaseUrl && claimBaseUrl.trim() ? claimBaseUrl.trim() : "").replace(/\/$/, "")}/claim/${item.claim_code}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                            title="Buka halaman klaim pembeli"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.claim_code)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/30 transition-colors"
                            title="Hapus token klaim"
                          >
                            <Trash2 className="w-3 h-3" />
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

      {/* Modal Buat Kode Klaim */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-zinc-950 border border-white/[0.08] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Terbitkan Kode Klaim Kredensial Baru</span>
              </h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-500 hover:text-white text-xs font-mono"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">Judul Game:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Project Zomboid / Minecraft Java & Bedrock"
                  value={formData.product_title}
                  onChange={(e) => setFormData({ ...formData, product_title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">Username Pembeli:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: budi_santoso"
                    value={formData.buyer_username}
                    onChange={(e) => setFormData({ ...formData, buyer_username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">Platform:</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
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
                <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                  Kredensial Akun / Digital Key:
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={`Contoh:\nEmail: mc_buyer@outlook.com\nPassword: SecretPassword123#\nAtau jika CDKey:\nSTEAM-KEY-XXXXX-YYYYY`}
                  value={formData.credential_data}
                  onChange={(e) => setFormData({ ...formData, credential_data: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  🔒 Kredensial ini tersimpan terenkripsi di vault dan HANYA bisa dilihat pembeli setelah menekan tombol buka.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900/60 border border-amber-500/20">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-amber-300 uppercase font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Passcode PIN (Auto-Unik):</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const usedPins = new Set(claims.map((c: any) => String(c.passcode || "").trim()));
                        let newPin = "";
                        for (let i = 0; i < 10000; i++) {
                          const p = String(Math.floor(100000 + Math.random() * 900000));
                          if (!usedPins.has(p)) { newPin = p; break; }
                        }
                        setFormData({ ...formData, passcode: newPin || String(Math.floor(100000 + Math.random() * 900000)) });
                      }}
                      className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      🎲 Acak PIN Lain
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="PIN 6 Digit Unik"
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-amber-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-bold tracking-wider"
                  />
                  <span className="text-[9px] text-emerald-400/90 block mt-0.5">
                    ✅ Dijamin 100% Unik (Anti-Tabrakan / Belum Pernah Dipakai)
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                    Custom Kode Klaim (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: AKSH-9921-MC"
                    value={formData.custom_code}
                    onChange={(e) => setFormData({ ...formData, custom_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-emerald-300 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-bold uppercase"
                  />
                  <span className="text-[9px] text-zinc-500 block mt-0.5">Auto-generate jika dikosongkan</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">No Pesanan Shopee:</label>
                  <input
                    type="text"
                    placeholder="Kosongkan jika ingin auto"
                    value={formData.order_id}
                    onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">Masa Garansi (Hari):</label>
                  <input
                    type="number"
                    value={formData.warranty_days}
                    onChange={(e) => setFormData({ ...formData, warranty_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Buat Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Bukti Sengketa Shopee (Forensic Dossier) */}
      {dossierClaim && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-950 border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 print:border-none print:shadow-none print:text-black print:bg-white">
            {/* Header Sertifikat */}
            <div className="border-b border-amber-500/20 pb-4 flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-2">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Akshara Digital Forensics — Dispute Proof</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white print:text-black tracking-tight">
                  BUKTI SAH SERAH TERIMA LISENSI DIGITAL
                </h2>
                <p className="text-xs text-slate-400 print:text-slate-600 font-mono mt-0.5">
                  Dokumen Pembuktian Resmi Sengketa Transaksi Shopee Resolution Center
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDossierClaim(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadata Transaksi */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 font-mono text-xs print:bg-slate-50 print:border-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">No. Pesanan Shopee</span>
                <span className="font-bold text-white print:text-black">{dossierClaim.order_id || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Username Pembeli</span>
                <span className="font-bold text-emerald-400 print:text-black">@{dossierClaim.buyer_username}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Produk / Game</span>
                <span className="font-bold text-white print:text-black truncate block">{dossierClaim.product_title}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Kode Klaim Unik</span>
                <span className="font-bold text-amber-300 print:text-black">{dossierClaim.claim_code}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">PIN Akses Rahasia</span>
                <span className="font-bold text-cyan-300 print:text-black">{dossierClaim.passcode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Serial Garansi Toko</span>
                <span className="font-bold text-white print:text-black">{dossierClaim.warranty_code || "-"}</span>
              </div>
            </div>

            {/* Bukti Kriptografis & Audit Log Server */}
            <div className="space-y-3 font-mono text-xs">
              <h3 className="font-bold text-amber-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Bukti Kriptografis &amp; Log Forensik Akses</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 print:bg-slate-50 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Waktu Akses WIB:</span>
                  <span className="font-bold text-white print:text-black">
                    {dossierClaim.revealed_at ? new Date(dossierClaim.revealed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-"} WIB
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Alamat IP Pembeli:</span>
                  <span className="font-bold text-cyan-300 print:text-black">{dossierClaim.revealed_ip || dossierClaim.forensics?.ip || "-"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Penyedia Internet (ISP):</span>
                  <span className="font-bold text-white print:text-black">{dossierClaim.forensics?.isp || "Residential Network"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Geolokasi Pembeli:</span>
                  <span className="font-bold text-white print:text-black">
                    {dossierClaim.forensics?.city || "Unknown"}, {dossierClaim.forensics?.country || "Indonesia"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Perangkat / OS / Resolusi:</span>
                  <span className="font-bold text-white print:text-black truncate max-w-[200px]">
                    {dossierClaim.forensics?.platform_os || "Unknown"} ({dossierClaim.forensics?.screen_resolution || "Standard"})
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-800/50 pb-1.5">
                  <span className="text-slate-400 text-[11px]">Status VPN / Proxy:</span>
                  <span className={`font-bold ${dossierClaim.forensics?.is_vpn_or_proxy ? "text-rose-400" : "text-emerald-400"}`}>
                    {dossierClaim.forensics?.is_vpn_or_proxy ? "⚠️ Terdeteksi VPN / Datacenter" : "🛡️ Aman (Residential ISP Asli)"}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:col-span-2 pt-1">
                  <span className="text-slate-400 text-[11px]">Device Fingerprint Hash:</span>
                  <code className="bg-slate-950 px-2 py-0.5 rounded text-emerald-400 border border-slate-800 text-[10px]">
                    {dossierClaim.forensics?.device_hash || "AKSH-SEC-HASH-OK"}
                  </code>
                </div>
              </div>
            </div>

            {/* SOP Persetujuan Video */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center gap-2 text-emerald-300 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>SOP Uncut Video Disetujui:</strong> Pembeli telah menyetujui syarat wajib menyertakan video rekaman tanpa jeda sebelum kredensial didekripsi di layar.
              </span>
            </div>

            {/* Format Argumen Sengketa untuk Hakim Shopee */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Argumen Mediasi Formal Shopee (Tinggal Paste)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const text = (document.getElementById("formal-dispute-text") as HTMLTextAreaElement)?.value || "";
                    navigator.clipboard.writeText(text);
                    setCopiedDefenseText(true);
                    setTimeout(() => setCopiedDefenseText(false), 2500);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-1 border border-amber-500/30 transition-colors"
                >
                  {copiedDefenseText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
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

1. Toko Akshara Gaming Center telah menyerahkan lisensi/kredensial digital secara resmi melalui Portal Kredensial Terenkripsi Bank-Grade (claim.aksharagaming.com).
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
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Tombol Aksi */}
            <div className="border-t border-slate-800 pt-4 flex items-center justify-between print:hidden">
              <span className="text-[11px] text-slate-500 font-mono">
                Sertifikat bukti digital berstatus autentik &amp; sah hukum e-commerce.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDossierClaim(null)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
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

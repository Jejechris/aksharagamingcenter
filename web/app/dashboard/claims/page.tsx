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
  Smartphone
} from "lucide-react";

export default function ClaimsAdminDashboardPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
  }, []);

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
    const host = window.location.origin;
    const claimUrl = `${host}/claim/${item.claim_code}`;
    const pin = item.passcode || "882194";
    const text = (
      `🎮 [AKSHARA GAMING CENTER — PENGIRIMAN LISENSI RESMI]\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Halo kak ${item.buyer_username}, pesanan game ${item.product_title} kakak sudah siap!\n\n` +
      `🔑 KODE KLAIM: ${item.claim_code}\n` +
      `🔒 PASSCODE PIN RAHASIA: ${pin}\n` +
      `🔗 LINK BUKA KREDENSIAL: ${claimUrl}\n\n` +
      `⚠️ PENTING: Sebelum membuka link & memasukkan passcode, siapkan perekaman video unboxing tanpa jeda (no-cut) untuk mengaktifkan garansi resmi toko selama ${item.warranty_days} hari. Sistem mencatat waktu dan IP saat kredensial dibuka.\n` +
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
            onClick={() => setCreateModalOpen(true)}
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
                          <div>
                            <div className="text-zinc-300 text-[11px] font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>{revTime} WIB</span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-cyan-400" />
                              <span>IP: <code className="text-cyan-300">{item.revealed_ip || "-"}</code></span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyShopeeChat(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-emerald-400 border border-zinc-800 hover:border-emerald-500/40 flex items-center gap-1 transition-colors"
                            title="Salin template pesan chat Shopee lengkap dengan link klaim"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedCode === item.claim_code ? "Tersalin!" : "Chat Shopee"}</span>
                          </button>

                          <Link
                            href={`/claim/${item.claim_code}`}
                            target="_blank"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                            title="Buka halaman klaim pembeli"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Link>

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
    </div>
  );
}

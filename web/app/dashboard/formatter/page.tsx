"use client";

import React, { useState, useEffect } from "react";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import Link from "next/link";
import GameSelectorCombobox from "@/app/components/GameSelectorCombobox";
import {
  Sparkles,
  Copy,
  Check,
  Key,
  ShieldCheck,
  RefreshCw,
  MessageSquare,
  Eye,
  EyeOff,
  ShoppingBag,
  CheckCircle2,
  HelpCircle,
  Tag,
  ArrowRight,
  ExternalLink,
  Smartphone,
  Send,
  Lock,
} from "lucide-react";

interface CatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
}

export default function FormatterPage() {
  const [catalogGames, setCatalogGames] = useState<CatalogItem[]>([]);
  const [rawCredentials, setRawCredentials] = useState("");
  const [gameTitle, setGameTitle] = useState("Terraria");
  const [platform, setPlatform] = useState("Steam");
  const [buyerName, setBuyerName] = useState("Kak Dimas");
  const [channel, setChannel] = useState<"Shopee" | "WhatsApp" | "Tokopedia">("Shopee");
  const [deliveryMode, setDeliveryMode] = useState<"digital" | "physical_envelope">("digital");
  const [tone, setTone] = useState("Ramah, Hangat & Profesional");

  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<{
    parsed_user: string;
    parsed_password: string;
    additional_info: string;
    formatted_message: string;
    security_steps: string[];
  } | null>(null);

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Toast Banner
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Fetch active catalog games using fetchSmartCatalog
  useEffect(() => {
    async function loadCatalog() {
      try {
        const mergedData = await fetchSmartCatalog();
        if (mergedData && Array.isArray(mergedData) && mergedData.length > 0) {
          setCatalogGames(mergedData);
          const first = mergedData[0];
          setGameTitle(first.title);
          setPlatform(first.platform);
          setRawCredentials(
            `${first.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_user@domain.com:AksharaPass123! | access: full`
          );
        }
      } catch (e) {
        console.error("Gagal memuat katalog pintar:", e);
      }
    }
    loadCatalog();
  }, []);

  const handleLoadSample = (sampleType: "terraria" | "minecraft" | "gtav" | "eneba_cdkey") => {
    if (sampleType === "eneba_cdkey") {
      setGameTitle("Terraria");
      setPlatform("Steam");
      setBuyerName("Kak Dimas");
      setRawCredentials("E387N-98Q2B-T7Y9P | Eneba Official Steam Key (Global)");
    } else if (sampleType === "terraria") {
      setGameTitle("Terraria");
      setPlatform("Steam");
      setBuyerName("Kak Dimas");
      setRawCredentials("terraria_player99:TerrariaGod2024! | steam_guard: off");
    } else if (sampleType === "minecraft") {
      setGameTitle("Minecraft: Java & Bedrock Edition");
      setPlatform("PC / Microsoft");
      setBuyerName("Kak Rian");
      setRawCredentials("minecrafter_id@outlook.com:DiamondPickaxe#999 | mail_access: full");
    } else if (sampleType === "gtav") {
      setGameTitle("Grand Theft Auto V: Premium Edition");
      setPlatform("Rockstar / Steam");
      setBuyerName("Kak Alvin");
      setRawCredentials("alvin_heist:LosSantos2025! | recovery_mail: active");
    }
  };

  const handleLoadCatalogGame = (g: CatalogItem) => {
    setGameTitle(g.title);
    setPlatform(g.platform);
    setRawCredentials(
      `${g.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_ready:AksharaPass2025! | platform: ${g.platform}`
    );
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawCredentials.trim()) {
      showToast("Kredensial mentah wajib diisi.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/format-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_credentials: rawCredentials,
          game_title: gameTitle,
          platform: platform,
          buyer_name: buyerName,
          channel: channel,
          tone: tone,
          delivery_mode: deliveryMode,
        }),
      });

      const json = await res.json();
      if (json.status === "success" && json.data) {
        setParsedData(json.data);
        showToast("Pesan pengiriman berhasil diformat oleh AI!");
      } else {
        showToast(json.error || "Gagal memformat kredensial.");
      }
    } catch (err) {
      console.error("Format error:", err);
      showToast("Terjadi kesalahan koneksi AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: "all" | "user" | "pass") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "all") {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
      showToast("Pesan lengkap disalin ke clipboard!");
    } else if (type === "user") {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
      showToast("Username / CDKey disalin!");
    } else if (type === "pass") {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
      showToast("Password disalin!");
    }
  };

  const channelOptions: {
    id: "Shopee" | "WhatsApp" | "Tokopedia";
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: "Shopee", label: "Shopee Chat", icon: <ShoppingBag className="w-3.5 h-3.5 text-orange-500" /> },
    { id: "WhatsApp", label: "WhatsApp Direct", icon: <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> },
    { id: "Tokopedia", label: "Tokopedia Chat", icon: <ShoppingBag className="w-3.5 h-3.5 text-green-600" /> },
  ];

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
              AI Account Delivery Formatter
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Gemini Flash AI
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ubah kredensial raw supplier G2G/Eneba menjadi template pesan serah terima yang sopan, terstruktur, anti-banned, dan siap kirim ke {channel}.
          </p>
        </div>

        <Link
          href={`/dashboard/description?game=${encodeURIComponent(gameTitle)}`}
          className="btn-secondary text-xs font-medium px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <span>Buat Listing &amp; Copy Shopee</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
        </Link>
      </div>

      {/* Smart Searchable Portfolio Selector & Quick Samples */}
      <div className="space-y-2.5 animate-fade-up">
        {catalogGames.length > 0 ? (
          <GameSelectorCombobox
            label="Pilih Game dari Portofolio Katalog"
            actionLink={{ label: "Buka Katalog →", href: "/dashboard/catalog" }}
            games={catalogGames}
            selectedGameTitle={gameTitle}
            onSelect={(g) => handleLoadCatalogGame(g)}
          />
        ) : (
          <div className="app-card p-3 sm:p-4 bg-white flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>Preset Sampel Cepat:</span>
            </span>
            {[
              { key: "terraria" as const, label: "🎮 Terraria (Steam)" },
              { key: "minecraft" as const, label: "⛏️ Minecraft (Microsoft)" },
              { key: "gtav" as const, label: "🚗 GTA V (Rockstar)" },
              { key: "eneba_cdkey" as const, label: "🔑 Eneba CDKey" },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => handleLoadSample(s.key)}
                className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors btn-tactile"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. Main Workspace 2 Kolom ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Input Form (col-span-6) */}
        <div className="lg:col-span-6 space-y-5">
          <form onSubmit={handleGenerate} className="app-card p-5 sm:p-6 space-y-4 bg-white">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Parameter Pengiriman Akun
            </h3>

            {/* Saluran Penjualan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Saluran Penjualan (Channel Target)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {channelOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setChannel(opt.id)}
                    className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      channel === opt.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Pengiriman (Label Rapi Sesuai Spesifikasi) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mode Pengiriman
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryMode("digital")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    deliveryMode === "digital"
                      ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900">Full Digital (Instant)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Pengiriman langsung via Chat / Portal Klaim
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMode("physical_envelope")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    deliveryMode === "physical_envelope"
                      ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-900">Hybrid + Kartu Garansi</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Disertai pengiriman resi / kartu garansi fisik
                  </div>
                </button>
              </div>
            </div>

            {/* Metadata Pesanan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Game</label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Platform</label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pembeli</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Contoh: Kak Dimas"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>

            {/* Raw Credentials Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Data Mentah Kredensial (Raw dari Supplier)
                </label>
                <span className="text-[11px] text-slate-400">username:password atau CDKey</span>
              </div>
              <textarea
                rows={4}
                required
                value={rawCredentials}
                onChange={(e) => setRawCredentials(e.target.value)}
                placeholder="Contoh: user123@outlook.com:SecretPass#999 | steam_guard: off"
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500 bg-white"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary text-xs font-semibold py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Sedang Menyusun Pesan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Format Pesan Pengiriman Sekarang</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Hasil Format & Kredensial Terurai (col-span-6) */}
        <div className="lg:col-span-6 space-y-5">
          {parsedData ? (
            <div className="space-y-5">
              {/* Box Kredensial Terurai */}
              <div className="app-card p-5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Kredensial Terurai (Clean Extracted)
                  </h4>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? "Sembunyikan" : "Tampilkan"}</span>
                  </button>
                </div>

                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">ID / Username / Key:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{parsedData.parsed_user || "-"}</span>
                      {parsedData.parsed_user && (
                        <button
                          onClick={() => copyToClipboard(parsedData.parsed_user, "user")}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Salin username"
                        >
                          {copiedUser ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {parsedData.parsed_password && (
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500">Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {showPassword ? parsedData.parsed_password : "••••••••••••"}
                        </span>
                        <button
                          onClick={() => copyToClipboard(parsedData.parsed_password, "pass")}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Salin password"
                        >
                          {copiedPass ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {parsedData.additional_info && (
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500">Catatan Tambahan:</span>
                      <span className="text-slate-700 truncate max-w-[220px]">
                        {parsedData.additional_info}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Box Pesan Siap Kirim */}
              <div className="app-card p-5 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Pesan Siap Kirim ({channel})
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(parsedData.formatted_message, "all")}
                      className="btn-secondary text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                    >
                      {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAll ? "Tersalin!" : "Salin Pesan"}</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] whitespace-pre-wrap text-slate-800 leading-relaxed max-h-96 overflow-y-auto">
                  {parsedData.formatted_message}
                </pre>
              </div>

              {/* Langkah Pengamanan Akun */}
              {parsedData.security_steps && parsedData.security_steps.length > 0 && (
                <div className="app-card p-4 sm:p-5 bg-emerald-50 border-emerald-200 space-y-2">
                  <h4 className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Langkah Pengamanan &amp; SOP Garansi yang Disertakan:</span>
                  </h4>
                  <ul className="text-xs text-emerald-950 space-y-1 list-disc list-inside">
                    {parsedData.security_steps.map((step, idx) => (
                      <li key={idx} className="leading-snug">{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* Empty State */
            <div className="app-card p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Belum ada pesan yang diformat
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Masukkan data mentah kredensial di sebelah kiri dan klik &quot;Format Pesan Pengiriman Sekarang&quot;.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

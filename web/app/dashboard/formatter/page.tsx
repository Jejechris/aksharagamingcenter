"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Copy,
  Check,
  Key,
  ShieldCheck,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Eye,
  EyeOff,
  FileCheck2,
  Smartphone,
  ShoppingBag,
  CheckCircle2,
  HelpCircle,
  Info,
  Tag,
  Store,
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

  // Fetch active catalog games from DB
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/catalog");
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
          setCatalogGames(json.data);
          const first = json.data[0];
          setGameTitle(first.title);
          setPlatform(first.platform);
          setRawCredentials(`${first.title.toLowerCase().replace(/[^a-z0-9]/g, '')}_user@domain.com:AksharaPass123! | access: full`);
        }
      } catch (e) {
        console.error("Failed to fetch catalog:", e);
      }
    }
    loadCatalog();
  }, []);

  const handleLoadSample = (sampleType: "terraria" | "minecraft" | "gtav") => {
    if (sampleType === "terraria") {
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
    setRawCredentials(`${g.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_ready:AksharaPass2025! | platform: ${g.platform}`);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawCredentials.trim()) return;

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
      }
    } catch (err) {
      console.error("Format error:", err);
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
    } else if (type === "user") {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else if (type === "pass") {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const channelOptions: {
    id: "Shopee" | "WhatsApp" | "Tokopedia";
    label: string;
    color: string;
    icon: React.ReactNode;
  }[] = [
    { id: "Shopee", label: "Shopee", color: "text-orange-400", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: "WhatsApp", label: "WhatsApp", color: "text-emerald-400", icon: <Smartphone className="w-3.5 h-3.5" /> },
    { id: "Tokopedia", label: "Tokopedia", color: "text-green-400", icon: <ShoppingBag className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-slate-400">AI Formatter</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            AI Account Formatter
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              Gemini Flash
            </span>
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Ubah data mentah akun game dari supplier G2G menjadi pesan serah terima yang rapi, profesional, dan siap kirim ke {channel}.
          </p>
        </div>
      </div>

      {/* Quick Presets & Portfolio Games */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
          {catalogGames.length > 0 ? (
            <>
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              <span>Portofolio Aktif:</span>
            </>
          ) : (
            <>
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Contoh cepat:</span>
            </>
          )}
        </span>
        {catalogGames.length > 0 ? (
          catalogGames.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => handleLoadCatalogGame(g)}
              className={`px-3 py-1 rounded-xl text-[11px] font-mono transition-all border ${
                gameTitle.toLowerCase() === g.title.toLowerCase()
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold"
                  : "bg-zinc-950/80 border-zinc-800 hover:border-purple-500/40 text-slate-400 hover:text-purple-300"
              }`}
            >
              🎮 {g.title.split(":")[0]} ({g.platform})
            </button>
          ))
        ) : (
          [
            { key: "terraria" as const, label: "🎮 Terraria (Steam)" },
            { key: "minecraft" as const, label: "⛏️ Minecraft (Microsoft)" },
            { key: "gtav" as const, label: "🚗 GTA V (Rockstar)" },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => handleLoadSample(s.key)}
              className="px-3 py-1 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-purple-500/40 text-[11px] font-mono text-slate-400 hover:text-purple-300 transition-all"
            >
              {s.label}
            </button>
          ))
        )}
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: Input Form */}
        <form onSubmit={handleGenerate} className="v0-card rounded-2xl p-5 sm:p-6 space-y-5 card-division-formatter">

          {/* Channel Selector */}
          <div>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Channel Tujuan</h2>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
            </div>
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/60 border border-white/[0.06]">
              {channelOptions.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                    channel === ch.id
                      ? "bg-white/10 text-white border border-white/[0.1]"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <span className={channel === ch.id ? ch.color : ""}>{ch.icon}</span>
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Mode */}
          <div>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Mode Pengiriman</h2>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMode("digital")}
                className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  deliveryMode === "digital"
                    ? "bg-purple-500/10 border-purple-500/40 text-purple-200"
                    : "bg-zinc-950/60 border-zinc-800 text-slate-500 hover:text-slate-300 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-mono font-semibold">Digital</span>
                </div>
                <span className="text-[10px] font-mono text-slate-600">⚡ Non-Fisik / Instant</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode("physical_envelope")}
                className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  deliveryMode === "physical_envelope"
                    ? "bg-purple-500/10 border-purple-500/40 text-purple-200"
                    : "bg-zinc-950/60 border-zinc-800 text-slate-500 hover:text-slate-300 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-mono font-semibold">Amplop A6</span>
                </div>
                <span className="text-[10px] font-mono text-slate-600">📦 Paket Fisik / Resi</span>
              </button>
            </div>
          </div>

          {/* Raw Credentials */}
          <div>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-purple-400" />
                Raw Credentials
              </h2>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
            </div>
            <textarea
              rows={4}
              value={rawCredentials}
              onChange={(e) => setRawCredentials(e.target.value)}
              placeholder={"Contoh:\nsteve_miner@outlook.com:PasswordSuperAman123!\n\natau:\nUsername: gamer_id\nPassword: secret_pass\nMail: full_access"}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all resize-none"
              required
            />
          </div>

          {/* Metadata */}
          <div>
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Metadata Pesanan</h2>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
            </div>

            {catalogGames.length > 0 && (
              <div className="mb-3">
                <label className="text-[10px] font-mono uppercase tracking-widest text-purple-400 block mb-1">
                  Pilih Cepat dari Portofolio ({catalogGames.length} Game)
                </label>
                <select
                  onChange={(e) => {
                    const sel = catalogGames.find(g => g.id === e.target.value);
                    if (sel) handleLoadCatalogGame(sel);
                  }}
                  className="w-full bg-zinc-950 border border-purple-500/30 rounded-xl px-3 py-2 text-xs font-mono text-purple-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Pilih Game Portofolio --</option>
                  {catalogGames.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.platform})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Nama Game</label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="misal: Terraria"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-purple-500/60 transition-all appearance-none cursor-pointer"
                >
                  <option value="Steam">Steam</option>
                  <option value="PC / Microsoft">PC / Microsoft</option>
                  <option value="Rockstar / Steam">Rockstar / Steam</option>
                  <option value="EA App / PC">EA App / PC</option>
                  <option value="PlayStation 5">PlayStation 5</option>
                  <option value="Xbox Series X/S">Xbox Series X/S</option>
                  <option value="Epic Games">Epic Games</option>
                  <option value="Ubisoft Connect">Ubisoft Connect</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Nama Pembeli</label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="misal: Kak Dimas"
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-slate-600">Gaya Bahasa</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-purple-500/60 transition-all appearance-none cursor-pointer"
                >
                  <option value="Ramah, Hangat & Profesional">Ramah & Hangat</option>
                  <option value="Singkat, Tepat & Padat">Singkat & Padat</option>
                  <option value="Eksklusif VIP Member">Eksklusif VIP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Generate CTA */}
          <button
            type="submit"
            disabled={isLoading || !rawCredentials.trim()}
            className="w-full v0-btn-primary py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Gemini sedang merangkai pesan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Format Serah Terima ({channel})
              </>
            )}
          </button>

          {/* SOP Footer */}
          <div className="pt-1 border-t border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Standar Serah Terima Akshara
            </div>
            <ul className="text-[10px] font-mono text-slate-600 space-y-1 pl-4 list-disc leading-relaxed">
              <li>Akun wajib <span className="text-slate-500">Full Access</span> (pembeli bisa ganti email &amp; password sendiri).</li>
              <li>Pesan menyertakan <span className="text-slate-500">3 Langkah Pengamanan Akun</span>.</li>
              <li>Edukasi pembeli soal <span className="text-slate-500">Kartu Garansi A6 &amp; Video No-Cut</span>.</li>
            </ul>
          </div>
        </form>

        {/* RIGHT: Result Panel */}
        <div className="v0-card rounded-2xl p-5 sm:p-6 card-division-formatter">
          {parsedData ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">

              <div className="flex items-center gap-4">
                <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Hasil Format</h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  channel === "Shopee"
                    ? "bg-orange-500/10 text-orange-300 border-orange-500/20"
                    : channel === "WhatsApp"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    : "bg-green-500/10 text-green-300 border-green-500/20"
                }`}>
                  {channel} Mode
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                <Info className="w-3 h-3 text-purple-400 shrink-0" />
                Game: <span className="text-slate-300">{gameTitle}</span>
                <span className="text-slate-700">·</span>
                <span>{platform}</span>
              </div>

              {/* Credentials */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3">
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 block mb-0.5">Email / Username</span>
                    <span className="text-xs font-mono text-slate-200 truncate block select-all font-semibold">
                      {parsedData.parsed_user || "(tidak terdeteksi)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(parsedData.parsed_user, "user")}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 text-slate-500 hover:text-purple-300 transition-all shrink-0"
                    title="Salin Username"
                  >
                    {copiedUser ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-3">
                  <div className="min-w-0 pr-3">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 block mb-0.5">Password</span>
                    <span className="text-xs font-mono text-purple-300 truncate block select-all font-semibold">
                      {showPassword ? parsedData.parsed_password || "(kosong)" : "••••••••••••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-slate-500 hover:text-slate-300 transition-all"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(parsedData.parsed_password, "pass")}
                      className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500/40 text-slate-500 hover:text-purple-300 transition-all"
                    >
                      {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {parsedData.additional_info && (
                  <div className="text-[11px] font-mono text-slate-400 bg-zinc-950/80 rounded-xl px-4 py-2.5 border border-zinc-800 flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>Info: <span className="text-purple-300">{parsedData.additional_info}</span></span>
                  </div>
                )}
              </div>

              {/* Formatted Message */}
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                    Pesan Siap Kirim
                  </h2>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
                </div>

                <div className="relative group">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap max-h-[340px] overflow-y-auto">
                    {parsedData.formatted_message}
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(parsedData.formatted_message, "all")}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
                        copiedAll
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-zinc-900/90 text-slate-400 border-zinc-700 hover:text-white hover:border-purple-500/40"
                      }`}
                    >
                      {copiedAll ? (
                        <><Check className="w-3 h-3" /> Tersalin!</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy</>
                      )}
                    </button>
                    {channel === "WhatsApp" && (
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(parsedData.formatted_message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold hover:bg-emerald-500/30 transition-all"
                      >
                        <Smartphone className="w-3 h-3" /> WA Web
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-600 px-1">
                  <span>Channel: <span className={channel === "Shopee" ? "text-orange-400" : channel === "WhatsApp" ? "text-emerald-400" : "text-green-400"}>{channel}</span></span>
                  <span>Tone: <span className="text-slate-500">{tone}</span></span>
                </div>
              </div>

              {/* Security Steps */}
              {parsedData.security_steps && parsedData.security_steps.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Langkah Pengamanan
                    </h2>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
                  </div>
                  <ul className="space-y-2">
                    {parsedData.security_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[11px] font-mono text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center min-h-[420px] space-y-4">
              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                <Sparkles className="w-8 h-8 text-purple-400/40" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-slate-300">Belum Ada Pesan yang Diformat</h3>
                <p className="text-[12px] text-slate-600 max-w-xs leading-relaxed">
                  Masukkan kredensial akun mentah di form kiri lalu klik{" "}
                  <span className="text-purple-400 font-mono">Generate Format Serah Terima</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleLoadSample("terraria")}
                className="text-[11px] font-mono text-purple-500 hover:text-purple-300 underline underline-offset-4 transition-colors"
              >
                Coba contoh Terraria (Steam) →
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

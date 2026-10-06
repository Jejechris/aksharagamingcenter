"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Activity,
  Terminal,
  ShieldCheck,
  RefreshCw,
  Zap,
  Globe,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  KeyRound,
  ExternalLink,
  MessageSquare,
  PackageSearch,
  Sparkles
} from "lucide-react";

export default function BotHealthMonitoringPage() {
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customWebhookUrl, setCustomWebhookUrl] = useState("");
  const [testMessage, setTestMessage] = useState("Halo Senna! Tes koneksi bot dari dashboard monitoring Akshara.");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [triggeringSentry, setTriggeringSentry] = useState(false);
  const [sentryResult, setSentryResult] = useState<string | null>(null);

  const handleTriggerSentry = async () => {
    setTriggeringSentry(true);
    setSentryResult(null);
    try {
      const res = await fetch("/api/cron/sentry?heartbeat=true");
      const json = await res.json();
      if (json.status === "success") {
        setSentryResult(`✅ Audit sukses! Diaudit: ${json.auditedCount} seller, ${json.alertsDispatched} alert stok dikirim ke Telegram.`);
      } else {
        setSentryResult(`Gagal: ${json.message || "Unknown error"}`);
      }
    } catch (e: any) {
      setSentryResult(`Error: ${e.message}`);
    } finally {
      setTriggeringSentry(false);
    }
  };

  const fetchWebhookStatus = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/telegram/webhook");
      const json = await res.json();
      setWebhookInfo(json.webhookInfo?.result || null);
      if (json.webhookInfo?.result?.url) {
        setCustomWebhookUrl(json.webhookInfo.result.url);
      } else if (typeof window !== "undefined") {
        setCustomWebhookUrl(`${window.location.origin}/api/telegram/webhook`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWebhookStatus();
  }, []);

  const handleSetWebhook = async () => {
    if (!customWebhookUrl) {
      alert("Masukkan URL webhook Vercel Anda.");
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(`/api/telegram/webhook?action=set&url=${encodeURIComponent(customWebhookUrl)}`);
      const json = await res.json();
      if (json.result?.ok) {
        alert("✅ Webhook berhasil diaktifkan ke Vercel! Bot sekarang online 24/7 di cloud.");
      } else {
        alert("Gagal: " + JSON.stringify(json));
      }
      fetchWebhookStatus();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteWebhook = async () => {
    if (!confirm("Beralih ke mode daemon laptop? Ini akan menghapus webhook cloud.")) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/telegram/webhook?action=delete`);
      const json = await res.json();
      if (json.result?.ok) {
        alert("✅ Webhook dihapus. Sekarang Anda dapat menjalankan run_bot.bat di laptop tanpa konflik.");
      }
      fetchWebhookStatus();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("https://api.telegram.org/bot8911523018:AAFvUAesNmjOov7gWiuL9Sf9DePavy2fUpI/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "7025906160",
          text: `🚀 *[TES KONEKSI MONITORING BOT]*\n━━━━━━━━━━━━━━━━━━━━━━\n${testMessage}\n━━━━━━━━━━━━━━━━━━━━━━\nStatus: 🟢 VERIFIED ONLINE`,
          parse_mode: "Markdown"
        })
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult("✅ Pesan berhasil terkirim ke Telegram HP Anda!");
      } else {
        setTestResult(`❌ Gagal: ${data.description}`);
      }
    } catch (e: any) {
      setTestResult(`❌ Error: ${e.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const isWebhookActive = !!webhookInfo?.url;

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
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">
              Bot &amp; Sentry Health
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-cyan-400" />
            <span>Telegram Bot &amp; Market Sentry Monitoring Deck</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Pusat pemantauan status kesehatan bot, pengalihan mode cloud webhook (Vercel 24/7) vs daemon lokal laptop, serta pengujian pesan langsung ke HP Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchWebhookStatus}
            disabled={refreshing}
            className="v0-btn-secondary px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 cursor-pointer select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>{refreshing ? "Memeriksa..." : "Refresh Status"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="v0-card p-4 rounded-2xl border-white/[0.08] bg-zinc-950/70">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            <span>Identitas Bot</span>
          </div>
          <div className="text-sm font-bold font-mono text-white truncate">Akshara Ops Bot</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">ID: 8911523018</div>
        </div>

        <div className="v0-card p-4 rounded-2xl border-cyan-500/20 bg-cyan-950/10">
          <div className="text-[11px] font-mono text-cyan-400/80 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode Operasional</span>
          </div>
          <div className="text-sm font-bold font-mono text-cyan-300">
            {isWebhookActive ? "⚡ Cloud Webhook (24/7)" : "💻 Polling Daemon (Lokal)"}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">
            {isWebhookActive ? "Aktif di server Vercel" : "Menunggu run_bot.bat"}
          </div>
        </div>

        <div className="v0-card p-4 rounded-2xl border-emerald-500/20 bg-emerald-950/10">
          <div className="text-[11px] font-mono text-emerald-400/80 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin Channel (HITL)</span>
          </div>
          <div className="text-sm font-bold font-mono text-emerald-300">7025906160</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Terverifikasi HP Senna</div>
        </div>

        <div className="v0-card p-4 rounded-2xl border-white/[0.08] bg-zinc-950/70">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span>Pending Updates</span>
          </div>
          <div className="text-sm font-bold font-mono text-white">
            {webhookInfo?.pending_update_count ?? 0} Pesan
          </div>
          <div className="text-[10px] text-zinc-500 font-mono mt-1">Antrean sinkronisasi Telegram</div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kolom 1: Mode & Webhook Switcher */}
        <div className="v0-card p-5 rounded-2xl border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Pengaturan Jalur Hosting Bot
            </h2>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Anda dapat memilih apakah bot dijalankan di **Cloud Vercel (Online 24/7 tanpa laptop)** atau dijalankan secara **Lokal di Komputer/Laptop (via run_bot.bat)**.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase block mb-1">
                URL Webhook Vercel:
              </label>
              <input
                type="text"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                placeholder="https://<domain-vercel>/api/telegram/webhook"
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={refreshing}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20 cursor-pointer select-none disabled:opacity-50"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Aktifkan Webhook Vercel (24/7)</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteWebhook}
                disabled={refreshing}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-800 flex items-center gap-1.5 transition-all cursor-pointer select-none"
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Beralih ke Daemon Laptop</span>
              </button>
            </div>
          </div>

          {/* Webhook Status Inspector Box */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 font-mono text-[11px] space-y-1.5 text-zinc-400">
            <div className="text-zinc-300 font-bold uppercase text-[10px] tracking-wider mb-1">
              Hasil Inspeksi Telegram Server:
            </div>
            <div>URL Terdaftar: <code className="text-cyan-300">{webhookInfo?.url || "(Tidak ada - Mode Polling)"}</code></div>
            <div>Sertifikat Khusus: {webhookInfo?.has_custom_certificate ? "Ya" : "Tidak"}</div>
            <div>Error Terakhir: <span className={webhookInfo?.last_error_message ? "text-rose-400" : "text-emerald-400"}>{webhookInfo?.last_error_message || "0 (Normal)"}</span></div>
          </div>
        </div>

        {/* Kolom 2: Live Ping & Remote Command Tester */}
        <div className="v0-card p-5 rounded-2xl border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Uji Coba Kirim Pesan ke HP Senna
            </h2>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Kirimkan pesan diagnostik uji coba langsung ke akun Telegram pribadi Anda untuk memverifikasi transmisi jaringan.
          </p>

          <div className="space-y-3 pt-1">
            <textarea
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
            />

            <button
              type="button"
              onClick={handleSendTestMessage}
              disabled={sendingTest}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer select-none disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingTest ? "Mengirim..." : "Kirim Pesan Uji Coba"}</span>
            </button>

            {testResult && (
              <p className="text-xs font-mono pt-1 text-zinc-300">{testResult}</p>
            )}
          </div>
        </div>
      </div>

      {/* 24/7 Cloud Market Sentry Card */}
      <div className="v0-card p-5 rounded-2xl border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-zinc-950 to-zinc-950 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <span>24/7 Cloud Market Sentry &amp; Auto-Alerts</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">Real-time Cloud</span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Bot kini berjalan otonom di cloud via GitHub Actions &amp; Vercel Serverless. Pemeriksaan stok dan harga G2G SLS dilakukan otomatis setiap 15 menit tanpa perlu membuka halaman web atau menghidupkan laptop.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTriggerSentry}
              disabled={triggeringSentry}
              className="px-3.5 py-2 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${triggeringSentry ? "animate-spin text-amber-300" : ""}`} />
              <span>{triggeringSentry ? "Memeriksa SLS..." : "Trigger Audit &amp; Kirim Laporan ke HP"}</span>
            </button>
          </div>
        </div>

        {sentryResult && (
          <div className="p-2.5 rounded-lg bg-zinc-900 border border-cyan-500/30 text-xs font-mono text-cyan-300">
            {sentryResult}
          </div>
        )}
      </div>

      {/* Directory of Commands */}
      <div className="v0-card p-5 rounded-2xl border-white/[0.08] space-y-3">
        <h2 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Daftar Command Aktif di Smartphone:</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="font-bold text-cyan-400 block">/stock</span>
            <span className="text-[11px] text-zinc-400 font-sans mt-0.5 block">Audit live ribuan unit stok G2G SLS API.</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="font-bold text-violet-400 block">/canvas &lt;game&gt;</span>
            <span className="text-[11px] text-zinc-400 font-sans mt-0.5 block">Auto generate gambar thumbnail Shopee 1080x1080.</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="font-bold text-emerald-400 block">/format &lt;game&gt;</span>
            <span className="text-[11px] text-zinc-400 font-sans mt-0.5 block">Format chat pengiriman 3-langkah anti-hackback.</span>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="font-bold text-amber-400 block">/quant &lt;jual&gt; &lt;modal&gt;</span>
            <span className="text-[11px] text-zinc-400 font-sans mt-0.5 block">Kalkulasi margin bersih Rupiah &amp; BEP.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

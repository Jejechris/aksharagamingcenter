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
  MessageSquare,
  Sparkles,
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Toast Notification
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleTriggerSentry = async () => {
    setTriggeringSentry(true);
    setSentryResult(null);
    try {
      const res = await fetch("/api/cron/sentry?heartbeat=true");
      const json = await res.json();
      if (json.status === "success") {
        setSentryResult(`✅ Audit sukses! Diaudit: ${json.auditedCount} seller, ${json.alertsDispatched} alert stok dikirim ke Telegram.`);
        showToast(`Audit Sentry sukses: ${json.auditedCount} seller diaudit.`);
      } else {
        setSentryResult(`Gagal: ${json.message || "Unknown error"}`);
        showToast(json.message || "Gagal memicu Sentry.", "error");
      }
    } catch (e: any) {
      setSentryResult(`Error: ${e.message}`);
      showToast(`Error: ${e.message}`, "error");
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
      showToast("Masukkan URL webhook Vercel Anda.", "error");
      return;
    }
    setRefreshing(true);
    try {
      const res = await fetch(`/api/telegram/webhook?action=set&url=${encodeURIComponent(customWebhookUrl)}`);
      const json = await res.json();
      if (json.result?.ok) {
        showToast("✅ Webhook berhasil diaktifkan ke Vercel! Bot sekarang online 24/7 di cloud.");
      } else {
        showToast("Gagal mengaktifkan webhook: " + (json.description || JSON.stringify(json)), "error");
      }
      fetchWebhookStatus();
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteWebhook = async () => {
    setRefreshing(true);
    setConfirmDelete(false);
    try {
      const res = await fetch(`/api/telegram/webhook?action=delete`);
      const json = await res.json();
      if (json.result?.ok) {
        showToast("✅ Webhook dihapus. Sekarang Anda dapat menjalankan run_bot.bat di laptop tanpa konflik.");
      } else {
        showToast("Gagal menghapus webhook: " + (json.description || JSON.stringify(json)), "error");
      }
      fetchWebhookStatus();
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/telegram/webhook?action=test&message=${encodeURIComponent(testMessage)}`);
      const data = await res.json();
      if (data.ok) {
        setTestResult("✅ Pesan berhasil terkirim ke Telegram HP Anda!");
        showToast("✅ Pesan uji coba berhasil dikirim ke Telegram!");
      } else {
        setTestResult(`❌ Gagal: ${data.description}`);
        showToast(`Gagal: ${data.description}`, "error");
      }
    } catch (e: any) {
      setTestResult(`❌ Error: ${e.message}`);
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSendingTest(false);
    }
  };

  const isWebhookActive = !!webhookInfo?.url;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-slate-900">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-slate-900 text-white text-sm font-sans flex items-center gap-3 shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 max-w-md">
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="flex-1 leading-snug">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-base leading-none px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dashboard"
              className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono text-cyan-700 font-semibold">
              Bot &amp; Sentry Health
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700">
              <Terminal className="w-5 h-5" />
            </div>
            <span>Telegram Bot &amp; Market Sentry Monitoring Deck</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Pusat pemantauan status kesehatan bot, pengalihan mode cloud webhook (Vercel 24/7) vs daemon lokal laptop, serta pengujian pesan langsung ke HP Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchWebhookStatus}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors cursor-pointer select-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${refreshing ? "animate-spin text-cyan-600" : ""}`} />
            <span>{refreshing ? "Memeriksa..." : "Refresh Status"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="app-card p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-semibold">
            <Send className="w-3.5 h-3.5 text-cyan-600" />
            <span>Identitas Bot</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 truncate">Akshara Ops Bot</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Configured (.env)</div>
        </div>

        <div className="app-card p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-[11px] font-mono text-cyan-700 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-semibold">
            <Globe className="w-3.5 h-3.5 text-cyan-600" />
            <span>Mode Operasional</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">
            {isWebhookActive ? "⚡ Cloud Webhook (24/7)" : "💻 Polling Daemon (Lokal)"}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {isWebhookActive ? "Aktif di server Vercel" : "Menunggu run_bot.bat"}
          </div>
        </div>

        <div className="app-card p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-[11px] font-mono text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Admin Channel (HITL)</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">Admin Telegram (Senna)</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Terverifikasi HP Senna</div>
        </div>

        <div className="app-card p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-semibold">
            <Activity className="w-3.5 h-3.5 text-purple-600" />
            <span>Pending Updates</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 tabular-nums">
            {webhookInfo?.pending_update_count ?? 0} Pesan
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Antrean sinkronisasi Telegram</div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Kolom 1: Mode & Webhook Switcher */}
        <div className="app-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Zap className="w-4 h-4 text-cyan-600" />
            <h2 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wider">
              Pengaturan Jalur Hosting Bot
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Anda dapat memilih apakah bot dijalankan di <strong>Cloud Vercel (Online 24/7 tanpa laptop)</strong> atau dijalankan secara <strong>Lokal di Komputer/Laptop (via run_bot.bat)</strong>.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-mono text-slate-600 uppercase block mb-1 font-semibold">
                URL Webhook Vercel:
              </label>
              <input
                type="text"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                placeholder="https://<domain-vercel>/api/telegram/webhook"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={refreshing}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer select-none disabled:opacity-50"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Aktifkan Webhook Vercel (24/7)</span>
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={refreshing}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-mono border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer select-none"
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Beralih ke Daemon Laptop</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-amber-50 border border-amber-200 text-xs font-mono">
                  <span className="text-amber-800 text-[11px] px-1 font-semibold">Hapus webhook cloud?</span>
                  <button
                    type="button"
                    onClick={handleDeleteWebhook}
                    className="px-2 py-1 rounded-lg bg-amber-600 text-white font-bold text-[10px] hover:bg-amber-700"
                  >
                    Ya, Beralih
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 rounded-lg bg-white text-slate-600 text-[10px] border border-slate-200 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Webhook Status Inspector Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] space-y-1.5 text-slate-600">
            <div className="text-slate-900 font-bold uppercase text-[10px] tracking-wider mb-1">
              Hasil Inspeksi Telegram Server:
            </div>
            <div>URL Terdaftar: <code className="text-cyan-700 font-semibold">{webhookInfo?.url || "(Tidak ada - Mode Polling)"}</code></div>
            <div>Sertifikat Khusus: {webhookInfo?.has_custom_certificate ? "Ya" : "Tidak"}</div>
            <div>Error Terakhir: <span className={webhookInfo?.last_error_message ? "text-rose-600 font-semibold" : "text-emerald-700 font-semibold"}>{webhookInfo?.last_error_message || "0 (Normal)"}</span></div>
          </div>
        </div>

        {/* Kolom 2: Live Ping & Remote Command Tester */}
        <div className="app-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wider">
              Uji Coba Kirim Pesan ke HP Senna
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Kirimkan pesan diagnostik uji coba langsung ke akun Telegram pribadi Anda untuk memverifikasi transmisi jaringan.
          </p>

          <div className="space-y-3 pt-1">
            <textarea
              rows={3}
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={handleSendTestMessage}
              disabled={sendingTest}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer select-none disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingTest ? "Mengirim..." : "Kirim Pesan Uji Coba"}</span>
            </button>

            {testResult && (
              <p className="text-xs font-mono pt-1 text-slate-700">{testResult}</p>
            )}
          </div>
        </div>
      </div>

      {/* 24/7 Cloud Market Sentry Card */}
      <div className="app-card p-5 rounded-2xl border border-slate-200 bg-emerald-50/50 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>24/7 Cloud Market Sentry &amp; Auto-Alerts</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-semibold">Real-time Cloud</span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Bot kini berjalan otonom di cloud via GitHub Actions &amp; Vercel Serverless. Pemeriksaan stok dan harga G2G SLS dilakukan otomatis setiap 15 menit tanpa perlu membuka halaman web atau menghidupkan laptop.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTriggerSentry}
              disabled={triggeringSentry}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${triggeringSentry ? "animate-spin text-white" : ""}`} />
              <span>{triggeringSentry ? "Memeriksa SLS..." : "Trigger Audit & Kirim Laporan ke HP"}</span>
            </button>
          </div>
        </div>

        {sentryResult && (
          <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-xs font-mono text-emerald-800">
            {sentryResult}
          </div>
        )}
      </div>

      {/* Directory of Commands */}
      <div className="app-card p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
        <h2 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          <span>Daftar Command Aktif di Smartphone:</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-cyan-700 block">/stock</span>
            <span className="text-[11px] text-slate-600 font-sans mt-0.5 block">Audit live ribuan unit stok G2G SLS API.</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-purple-700 block">/canvas &lt;game&gt;</span>
            <span className="text-[11px] text-slate-600 font-sans mt-0.5 block">Auto generate gambar thumbnail Shopee 1080x1080.</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-emerald-700 block">/format &lt;game&gt;</span>
            <span className="text-[11px] text-slate-600 font-sans mt-0.5 block">Format chat pengiriman 3-langkah anti-hackback.</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="font-bold text-amber-800 block">/quant &lt;jual&gt; &lt;modal&gt;</span>
            <span className="text-[11px] text-slate-600 font-sans mt-0.5 block">Kalkulasi margin bersih Rupiah &amp; BEP.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

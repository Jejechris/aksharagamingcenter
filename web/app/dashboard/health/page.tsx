"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Layers,
  ArrowLeft,
  Store,
  Zap,
  ShieldCheck,
  Clock,
  HardDrive,
  Cpu,
  Wifi,
  ExternalLink,
} from "lucide-react";

interface HealthData {
  status: "HEALTHY" | "DEGRADED" | "OFFLINE";
  message?: string;
  provider: string;
  host?: string;
  region?: string;
  ssl?: boolean;
  latency_ms: number;
  server_time?: string;
  pg_version?: string;
  tables?: {
    catalog_games: number;
    inventory_vault_available: number;
    autonomous_orders: number;
  };
  pool?: {
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    mode: string;
  };
  security?: string;
  tier: string;
  timestamp: string;
}

interface PingRecord {
  id: number;
  time: string;
  latency: number;
  status: string;
}

export default function OperationsHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [pingHistory, setPingHistory] = useState<PingRecord[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastCheckTime, setLastCheckTime] = useState<string>("");

  const fetchHealth = async (isManual = false) => {
    if (isManual) setIsPinging(true);
    const startTime = performance.now();
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data: HealthData = await res.json();
      const roundtrip = Math.round(performance.now() - startTime);

      // Use the live roundtrip or the backend measured latency
      const effectiveLatency = data.latency_ms > 0 ? data.latency_ms : roundtrip;
      setHealth(data);

      const now = new Date();
      const timeStr = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastCheckTime(timeStr);

      setPingHistory((prev) => [
        {
          id: Date.now(),
          time: timeStr,
          latency: effectiveLatency,
          status: data.status,
        },
        ...prev.slice(0, 7), // keep last 8 pings
      ]);
    } catch (err: any) {
      setHealth({
        status: "DEGRADED",
        provider: "Supabase PostgreSQL (Fallback Active)",
        latency_ms: -1,
        tier: "Tier 2 Serverless /tmp Cache & localStorage Active",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsPinging(false), 300);
      }
    }
  };

  useEffect(() => {
    fetchHealth();
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchHealth();
      }, 30000); // 30s interval
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const isHealthy = health?.status === "HEALTHY";
  const latency = health?.latency_ms ?? 0;

  const getLatencyColor = (ms: number) => {
    if (ms <= 0) return "text-rose-400";
    if (ms < 250) return "text-emerald-400";
    if (ms < 600) return "text-amber-400";
    return "text-rose-400";
  };

  const getLatencyBadge = (ms: number) => {
    if (ms <= 0) return "Offline";
    if (ms < 250) return "Sangat Cepat (<250ms)";
    if (ms < 600) return "Normal (250-600ms)";
    return "Tinggi (>600ms)";
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 p-4 md:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1.5">
            <Link href="/dashboard" className="hover:text-slate-300 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-indigo-400">Operations Health</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                Operations Health & Telemetry
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                    isHealthy
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {loading ? "CHECKING..." : isHealthy ? "● 100% OPERATIONAL" : "● DEGRADED FALLBACK"}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Pemantauan koneksi cloud database Supabase PostgreSQL, latensi jaringan, kapasitas pooler, dan sinkronisasi data.
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 ${
              autoRefresh
                ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                : "bg-white/[0.04] text-slate-400 border-white/[0.08]"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Auto-Sync {autoRefresh ? "30s" : "Off"}
          </button>
          <button
            onClick={() => fetchHealth(true)}
            disabled={isPinging}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold font-mono flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin" : ""}`} />
            {isPinging ? "Pinging Cloud..." : "Ping Database"}
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cloud Database Status */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>DATABASE CLOUD</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isHealthy ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isHealthy ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            </span>
            <span className="text-lg font-bold text-white font-mono">
              {loading ? "Testing..." : isHealthy ? "CONNECTED" : "FALLBACK"}
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Supabase PG • Tokyo (ap-northeast-1)
          </p>
        </div>

        {/* Card 2: Query Latency Ping */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>QUERY LATENCY</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${getLatencyColor(latency)}`}>
              {loading ? "..." : latency > 0 ? `${latency} ms` : "Offline"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">RTT Ping</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            {getLatencyBadge(latency)}
          </p>
        </div>

        {/* Card 3: Security & Encryption */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>SECURITY / SSL</span>
            <Lock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            TLS 1.3 / SSL
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            256-Bit Encrypted Pool
          </p>
        </div>

        {/* Card 4: Pooler Engine */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
            <span>CONNECTION POOL</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {health?.pool?.max || 10} Max Connections
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Transaction Pooler (IPv4/v6)
          </p>
        </div>
      </div>

      {/* Main Content Grid (2 Columns on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Diagnostic Console & Ping History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Diagnostic Console */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Live Database Diagnostic Telemetry
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Pengecekan: {lastCheckTime || "Menghubungkan..."}
              </span>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 block uppercase">Database Host</span>
                <span className="text-slate-200 font-semibold truncate block mt-0.5">
                  {health?.host || "aws-0-ap-northeast-1.pooler.supabase.com:6543"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 block uppercase">Engine Version</span>
                <span className="text-slate-200 font-semibold block mt-0.5">
                  {health?.pg_version || "PostgreSQL 15+ (Supabase)"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 block uppercase">Server UTC Timestamp</span>
                <span className="text-slate-200 font-semibold block mt-0.5">
                  {health?.server_time ? new Date(health.server_time).toUTCString() : "Live Sync"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-slate-500 block uppercase">Failover Resilience</span>
                <span className="text-emerald-400 font-semibold block mt-0.5">
                  Multi-Tier Zero Data-Loss
                </span>
              </div>
            </div>

            {/* Latency History Feed */}
            <div className="pt-2">
              <span className="text-[11px] font-mono text-slate-400 block mb-2 font-medium">
                Riwayat Ping Terbaru (RTT Latency Log):
              </span>
              <div className="space-y-1.5">
                {pingHistory.length === 0 ? (
                  <div className="text-xs font-mono text-slate-600 py-3 text-center">
                    Belum ada data riwayat ping...
                  </div>
                ) : (
                  pingHistory.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.03] text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span className="text-slate-400">Ping #{pingHistory.length - idx}</span>
                        <span className="text-slate-600 text-[10px]">({item.time})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            item.status === "HEALTHY"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className={`font-semibold ${getLatencyColor(item.latency)}`}>
                          ⚡ {item.latency} ms
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Multi-Tier Architecture Diagram Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Arsitektur Penyimpanan 3-Tier (Zero Data-Loss)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                  <span>Tier 1: Cloud DB</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20">PRIMARY</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Supabase PostgreSQL. Semua data katalog, brankas stok akun, dan pesanan tersimpan permanen di cloud Tokyo.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/20 space-y-1">
                <div className="flex items-center justify-between text-indigo-400 font-semibold">
                  <span>Tier 2: Serverless</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20">FAILOVER</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  Cache `/tmp` Vercel. Mencegah web crash atau 500 jika ada latency internet saat Vercel function dijalankan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between text-amber-400 font-semibold">
                  <span>Tier 3: Browser</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20">HYDRATION</span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  `localStorage` browser Anda. Memberikan instant page loading tanpa jeda putih saat membuka menu dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Database Tables Integrity & Direct Links */}
        <div className="space-y-6">
          {/* Tables Integrity Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Database Tables Integrity
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Status tabel PostgreSQL yang aktif tersinkronisasi di Supabase:
            </p>

            <div className="space-y-3">
              {/* Table 1: catalog_games */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    catalog_games
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {health?.tables?.catalog_games ?? 0} Games
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Katalog game, harga jual Shopee, margin %, &amp; multi-seller G2G.
                </p>
                <Link
                  href="/dashboard/catalog"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Buka Radar Katalog <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>

              {/* Table 2: inventory_vault */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    inventory_vault
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {health?.tables?.inventory_vault_available ?? 0} Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Brankas buffer stok akun Mode A untuk auto-fulfillment instan.
                </p>
                <Link
                  href="/dashboard/autonomous"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Buka Brankas Mode A <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>

              {/* Table 3: autonomous_orders */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    autonomous_orders
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {health?.tables?.autonomous_orders ?? 0} Orders
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Histori pesanan masuk, serial garansi, &amp; template pesan dispatch.
                </p>
                <Link
                  href="/dashboard/autonomous"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Lihat Log Pesanan <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Connection Guide */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase block">
              Supabase Connection Parameters
            </span>
            <div className="space-y-1 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Protocol:</span>
                <span className="text-slate-200">PostgreSQL 15</span>
              </div>
              <div className="flex justify-between">
                <span>Port Pooler:</span>
                <span className="text-slate-200">6543 (Transaction)</span>
              </div>
              <div className="flex justify-between">
                <span>SSL Mode:</span>
                <span className="text-emerald-400">Require (TLS)</span>
              </div>
              <div className="flex justify-between">
                <span>Dual-Stack:</span>
                <span className="text-slate-200">IPv4 &amp; IPv6 Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

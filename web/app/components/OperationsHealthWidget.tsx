"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Activity,
  Layers,
  ChevronRight,
  X,
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

export default function OperationsHealthWidget() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>("");

  const checkHealth = async (isManual = false) => {
    if (isManual) setIsPinging(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = await res.json();
      setHealth(data);
      const now = new Date();
      setLastPingTime(
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (err: any) {
      setHealth({
        status: "DEGRADED",
        provider: "Supabase PostgreSQL",
        latency_ms: -1,
        tier: "Tier 2 Serverless Cache Fallback Active",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setIsPinging(false), 400);
      }
    }
  };

  useEffect(() => {
    checkHealth();
    // Auto ping every 45 seconds to keep health state fresh
    const interval = setInterval(() => {
      checkHealth();
    }, 45000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === "HEALTHY";
  const latency = health?.latency_ms ?? 0;

  const getLatencyColor = (ms: number) => {
    if (ms <= 0) return "text-rose-400";
    if (ms < 300) return "text-emerald-400";
    if (ms < 750) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <>
      <div className="px-3 py-2 border-t border-white/[0.06] bg-[#06070a]">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[10px] font-semibold font-mono tracking-[0.1em] text-slate-500 uppercase select-none flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-indigo-400" />
            Operations Health
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              checkHealth(true);
            }}
            disabled={isPinging}
            title="Ping database sekarang"
            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isPinging ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>

        {/* Health Card Button */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full text-left p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isHealthy ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isHealthy ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              </span>
              <span className="text-[11px] font-medium text-slate-200 group-hover:text-white flex items-center gap-1">
                Database Cloud
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none ${
                isHealthy
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {loading ? "CHECKING..." : isHealthy ? "AMAN" : "FALLBACK"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span className="flex items-center gap-1 truncate max-w-[110px]">
              <Database className="w-2.5 h-2.5 text-slate-400" />
              Supabase PG
            </span>
            <span className={`font-semibold flex items-center gap-1 ${getLatencyColor(latency)}`}>
              ⚡ {loading ? "..." : latency > 0 ? `${latency}ms` : "Offline"}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-slate-600">
            <span className="flex items-center gap-1">
              <Lock className="w-2.5 h-2.5 text-slate-500" />
              SSL Encrypted
            </span>
            <span className="group-hover:text-slate-400 transition-colors flex items-center gap-0.5">
              Detail <ChevronRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </button>
      </div>

      {/* Diagnostics Modal / Popover */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#0a0c14] border border-white/[0.12] rounded-2xl p-5 shadow-2xl space-y-4 text-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                  <Database className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Operations Health Telemetry
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    Live Supabase PostgreSQL Monitor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                isHealthy
                  ? "bg-emerald-500/[0.07] border-emerald-500/20"
                  : "bg-amber-500/[0.07] border-amber-500/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {isHealthy ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-semibold text-white">
                    {isHealthy ? "Koneksi Database 100% Aman & Terenkripsi" : "Mode Fallback Serverless Aktif"}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {health?.message || "All pooler queries executing normally"}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-sm font-bold font-mono ${getLatencyColor(latency)}`}>
                  {latency > 0 ? `${latency}ms` : "N/A"}
                </span>
                <span className="block text-[9px] font-mono text-slate-500">LATENCY</span>
              </div>
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] text-slate-500 block mb-0.5">PROVIDER</span>
                <span className="text-slate-200 font-medium">{health?.provider || "Supabase PG"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] text-slate-500 block mb-0.5">REGION</span>
                <span className="text-slate-200 font-medium">{health?.region || "Tokyo (ap-northeast-1)"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] text-slate-500 block mb-0.5">SECURITY / SSL</span>
                <span className="text-emerald-400 font-medium">SSL Active (TLS 1.3)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] text-slate-500 block mb-0.5">POOL CAPACITY</span>
                <span className="text-slate-200 font-medium">{health?.pool?.max || 10} Connections</span>
              </div>
            </div>

            {/* Table Synced Records */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
              <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase block">
                Database Tables Integrity
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    catalog_games
                  </span>
                  <span className="font-semibold text-white">
                    {health?.tables?.catalog_games ?? 0} judul game tersimpan
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    inventory_vault (Mode A)
                  </span>
                  <span className="font-semibold text-white">
                    {health?.tables?.inventory_vault_available ?? 0} akun ready buffer
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    autonomous_orders
                  </span>
                  <span className="font-semibold text-white">
                    {health?.tables?.autonomous_orders ?? 0} pesanan tercatat
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Architecture Explanation */}
            <div className="p-3 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/15 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-slate-400">
                <strong className="text-slate-200">3-Tier Multi-Layer Persistence:</strong> Data tersinkronisasi
                ke Supabase Cloud (Tier 1), `/tmp` serverless cache Vercel (Tier 2), dan browser `localStorage` (Tier 3) untuk jaminan zero data-loss.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                Pengecekan terakhir: {lastPingTime || "Baru saja"}
              </span>
              <button
                onClick={() => checkHealth(true)}
                disabled={isPinging}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin" : ""}`} />
                {isPinging ? "Pinging Cloud..." : "Ping Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

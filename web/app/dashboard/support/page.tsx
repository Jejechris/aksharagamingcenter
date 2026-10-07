"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Headphones, 
  XCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Shield, 
  ShieldCheck, 
  MessageSquare, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Award,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Check
} from "lucide-react";

interface SopCase {
  id: number;
  title: string;
  category: string;
  verdict: "REJECTED" | "APPROVED";
  buyerSays: string;
  aiReasoning: string;
  actionTaken: string;
  responseTemplate: string;
}

const sopCases: SopCase[] = [
  {
    id: 1,
    title: "Case 1: Komplain Tanpa screenshot kendala",
    category: "No Evidence",
    verdict: "REJECTED",
    buyerSays: '"Akun tidak bisa login kak, tolong ganti akun baru."',
    aiReasoning: "Tidak ada bukti rekaman screenshot kendala sejak garansi digital Shopee dibuka.",
    actionTaken: "Kirim edukasi SOP via chat Shopee, menolak klaim secara sopan sampai ada video yang sah.",
    responseTemplate: "Mohon maaf kak, sesuai dengan deskripsi produk dan catatan garansi toko kami, klaim garansi memerlukan screenshot kendala (tanpa jeda/potongan) sejak garansi digital dibuka hingga pengetesan akun. Tanpa bukti video tersebut, mohon maaf klaim belum dapat kami proses ya kak."
  },
  {
    id: 2,
    title: "Case 2: screenshot kendala Valid",
    category: "Valid Proof",
    verdict: "APPROVED",
    buyerSays: '"Email login bermasalah kak, ini screenshot kendala lengkap tanpa jeda saya."',
    aiReasoning: "Video no-cut valid dari awal pembukaan garansi digital hingga layar login, masalah akun terkonfirmasi.",
    actionTaken: "Akun pengganti disiapkan otomatis dari inventori G2G dan diserahterimakan via Shopee Chat.",
    responseTemplate: "Terima kasih banyak atas screenshot kendala lengkapnya kak. Kendala telah berhasil kami verifikasi. Kami sedang menyiapkan akun pengganti baru untuk kakak, mohon ditunggu sebentar ya kak."
  },
  {
    id: 3,
    title: "Case 3: Video Diedit / Ada Potongan (Cut)",
    category: "Suspicious",
    verdict: "REJECTED",
    buyerSays: '"Ini videonya kak tapi ada bagian yang diskip sebentar."',
    aiReasoning: "Terdapat indikasi jeda rekaman / manipulasi video yang melanggar SOP anti-fraud.",
    actionTaken: "Menolak klaim dan meminta video asli yang utuh tanpa pemotongan apapun.",
    responseTemplate: "Halo kak, setelah kami periksa, terdapat jeda/potongan pada rekaman video yang dikirim. Syarat garansi Akshara Gaming Center adalah screenshot kendala utuh dari awal buka paket sampai login. Silakan kirimkan file video mentah tanpa potongan agar bisa kami proses ya kak."
  }
];

export default function SupportPage() {
  const [mounted, setMounted] = useState(false);
  const [expandedCase, setExpandedCase] = useState<number | null>(1);

  // Live AI Triage Tester State (Powered by Gemini 3.5 Flash-Lite)
  const [testOrderId, setTestOrderId] = useState("#240916MC99211A");
  const [testClaimText, setTestClaimText] = useState("Akun tidak bisa login kak, tolong kirim akun baru.");
  const [testHasVideo, setTestHasVideo] = useState(false);
  const [isTriaging, setIsTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRunAiTriage = async () => {
    if (!testClaimText.trim()) return;
    setIsTriaging(true);
    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: testOrderId,
          claim_text: testClaimText,
          has_uncut_video: testHasVideo
        })
      });
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setTriageResult(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTriaging(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleCase = (id: number) => {
    setExpandedCase(prev => (prev === id ? null : id));
  };

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">
      {/* ── Page Header ────────────────────────────────────── */}
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
            <span className="text-[11px] font-mono text-slate-400">The Support</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Headphones className="w-5 h-5" />
            </div>
            The Support — Warranty Claims & SOP Triage
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Standar Operasional Prosedur (SOP) penanganan klaim garansi garansi digital A6, verifikasi screenshot kendala, dan triase otomatis anti-fraud.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="v0-btn-secondary inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          Dashboard
        </Link>
      </div>

      {/* ── Overview KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="v0-card card-division-support rounded-2xl p-5 border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
              Klaim Aktif
            </span>
            <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-400">
              <Headphones className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white tracking-tight">0</div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.05]">
            Semua tiket terselesaikan
          </div>
        </div>

        <div className="v0-card card-division-support rounded-2xl p-5 border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-semibold">
              SOP No-Cut
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300 tracking-tight">100% Wajib</div>
          <div className="text-[10px] font-mono text-sky-700 mt-3 pt-2.5 border-t border-sky-500/10">
            Proteksi seller anti-fraud
          </div>
        </div>

        <div className="v0-card card-division-support rounded-2xl p-5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              AI Triage Status
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight flex items-center gap-2">
            <span>READY</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-medium">
              Live
            </span>
          </div>
          <div className="text-[10px] font-mono text-emerald-700 mt-3 pt-2.5 border-t border-emerald-500/10">
            Gemini 3.5 Flash-Lite
          </div>
        </div>
      </div>

      {/* ── AI Triage Tester Panel ─────────────────────────── */}
      <div className="v0-card card-division-support rounded-2xl p-5 sm:p-6 border-sky-500/20 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Live AI Complaint Triage Engine</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  Gemini 3.5 Flash-Lite
                </span>
              </div>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Evaluasi otomatis keluhan pembeli berdasarkan bukti screenshot kendala dan siapkan draft balasan Shopee Chat.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input Form */}
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">No. Pesanan Shopee</label>
              <input
                type="text"
                value={testOrderId}
                onChange={(e) => setTestOrderId(e.target.value)}
                placeholder="Contoh: #240916MC99211A"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-sky-500/50 transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">Pesan / Keluhan Pembeli</label>
              <textarea
                rows={3}
                value={testClaimText}
                onChange={(e) => setTestClaimText(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-sky-500/50 transition-all"
              />
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06] cursor-pointer hover:border-white/[0.1] transition-colors">
              <input
                type="checkbox"
                checked={testHasVideo}
                onChange={(e) => setTestHasVideo(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-sky-500 focus:ring-0 focus:ring-offset-0 bg-zinc-900"
              />
              <div>
                <span className="text-xs font-medium text-slate-200 block">Ada screenshot kendala</span>
                <span className="text-[10px] font-mono text-slate-500">Video tanpa jeda sejak garansi digital dibuka</span>
              </div>
            </label>

            <button
              type="button"
              onClick={handleRunAiTriage}
              disabled={isTriaging || !testClaimText.trim()}
              className="v0-btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isTriaging ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menganalisis Klaim dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>Jalankan Triase AI</span>
                </>
              )}
            </button>
          </div>

          {/* Result Panel */}
          <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05] mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
                Hasil Keputusan Triase
              </span>
              {triageResult && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                    triageResult.verdict === "APPROVED"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                      : "bg-rose-950 text-rose-400 border-rose-800"
                  }`}
                >
                  {triageResult.verdict}
                </span>
              )}
            </div>

            {triageResult ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-white/[0.05] font-mono">
                  <span className="text-slate-400 text-[11px]">Keputusan:</span>
                  <span
                    className={`font-bold ${
                      triageResult.verdict === "APPROVED" ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {triageResult.verdict === "APPROVED" ? "Klaim Diterima (Kirim Akun Baru)" : "Klaim Ditolak (Edukasi SOP)"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-slate-500 block mb-1">Pertimbangan AI:</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-white/[0.05]">
                    {triageResult.reasoning}
                  </p>
                </div>

                {triageResult.recommended_response && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-sky-400">Draft Balasan Shopee Chat:</span>
                      <button
                        onClick={() => copyText(triageResult.recommended_response, "triage-reply")}
                        className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedId === "triage-reply" ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-200 text-[11px] leading-relaxed bg-zinc-900/80 p-2.5 rounded-lg border border-sky-500/20 font-mono">
                      "{triageResult.recommended_response}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600 text-xs flex flex-col items-center justify-center space-y-2">
                <Shield className="w-8 h-8 text-slate-700" />
                <p>Masukkan keluhan pembeli dan klik tombol untuk analisis AI.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SOP Case Matrix (Accordion) ────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            Matriks Penanganan Kasus Garansi (3 Skenario Kunci)
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="space-y-3">
          {sopCases.map((c) => {
            const isExpanded = expandedCase === c.id;
            return (
              <div
                key={c.id}
                className="v0-card card-division-support rounded-2xl overflow-hidden border-white/[0.08] transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleCase(c.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        c.verdict === "APPROVED"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}
                    >
                      {c.verdict === "APPROVED" ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{c.title}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            c.verdict === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {c.verdict}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{c.category}</span>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-white/[0.05] space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                          Keluhan Pembeli:
                        </span>
                        <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{c.buyerSays}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                          Pertimbangan SOP:
                        </span>
                        <p className="text-slate-300 text-[11px] leading-relaxed">{c.aiReasoning}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.05] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-sky-400 uppercase tracking-wider font-semibold">
                          Template Balasan Siap Pakai:
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(c.responseTemplate, `case-${c.id}`)}
                          className="text-[10px] font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          {copiedId === `case-${c.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin Template</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-slate-200 text-[11px] leading-relaxed font-mono bg-zinc-900/60 p-2.5 rounded-lg border border-white/[0.05]">
                        "{c.responseTemplate}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Ready-to-Use Response Templates ────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">
            3 Template Balasan Cepat Shopee Chat
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: "1. Tolak — Tanpa Video",
              text: "Mohon maaf kak, sesuai SOP garansi kami wajib menyertakan screenshot kendala dari garansi digital dibuka sampai tes akun ya kak.",
              border: "border-rose-500/20",
              tag: "REJECT"
            },
            {
              title: "2. Setuju — Ganti Akun",
              text: "Terima kasih atas videonya kak. Kendala telah kami verifikasi dan kami siapkan akun pengganti baru sekarang juga ya kak.",
              border: "border-emerald-500/20",
              tag: "APPROVE"
            },
            {
              title: "3. Tolak — Video Diedit",
              text: "Halo kak, kami mendapati adanya jeda/potongan pada video yang dikirim. Syarat garansi kami adalah video full tanpa jeda ya kak.",
              border: "border-amber-500/20",
              tag: "SUSPICIOUS"
            }
          ].map((item, i) => (
            <div
              key={i}
              className={`v0-card card-division-support p-4 rounded-2xl ${item.border} space-y-2.5 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white">{item.title}</span>
                  <button
                    onClick={() => copyText(item.text, `quick-tpl-${i}`)}
                    className="p-1 rounded text-slate-500 hover:text-white transition-colors"
                    title="Salin template"
                  >
                    {copiedId === `quick-tpl-${i}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-slate-300 leading-relaxed bg-zinc-950/60 p-2 rounded-lg border border-white/[0.05]">
                  "{item.text}"
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

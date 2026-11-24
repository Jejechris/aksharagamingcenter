"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Headphones, 
  XCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Shield, 
  ShieldCheck, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
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
    title: "Case 1: Komplain Tanpa Video Rekaman Layar",
    category: "Tanpa Bukti Video",
    verdict: "REJECTED",
    buyerSays: '"Akun tidak bisa login kak, tolong ganti akun baru."',
    aiReasoning: "Tidak ada bukti video rekaman layar (screen recording) tanpa jeda sejak pembukaan portal klaim hingga pengujian kredensial.",
    actionTaken: "Kirim edukasi SOP via chat Shopee, menolak klaim secara sopan sampai ada video rekaman layar yang valid sesuai ketentuan.",
    responseTemplate: "Mohon maaf kak, sesuai dengan SOP garansi Akshara Gaming Center, klaim garansi wajib menyertakan video rekaman layar (screen recording) utuh tanpa jeda/potongan sejak membuka portal klaim hingga percobaan login pertama kali. Tanpa rekaman tersebut, mohon maaf klaim belum dapat kami proses ya kak."
  },
  {
    id: 2,
    title: "Case 2: Video Rekaman Layar Valid (No-Cut)",
    category: "Bukti Lengkap & Sah",
    verdict: "APPROVED",
    buyerSays: '"Email login bermasalah kak, ini video rekaman layar lengkap tanpa jeda saya."',
    aiReasoning: "Video rekaman layar utuh tanpa potongan dari awal portal klaim dibuka hingga login terverifikasi bermasalah. Klaim sah.",
    actionTaken: "Akun pengganti disiapkan otomatis dan diserahterimakan segera kepada pembeli via chat Shopee.",
    responseTemplate: "Terima kasih banyak atas video rekaman layarnya yang lengkap dan valid kak. Kendala telah berhasil kami verifikasi. Kami sedang menyiapkan akun pengganti baru untuk kakak, mohon ditunggu sebentar ya kak."
  },
  {
    id: 3,
    title: "Case 3: Video Rekaman Layar Terpotong / Diedit",
    category: "Indikasi Manipulasi",
    verdict: "REJECTED",
    buyerSays: '"Ini videonya kak tapi ada bagian yang diskip sebentar."',
    aiReasoning: "Terdapat jeda rekaman atau indikasi editing/potongan yang melanggar SOP anti-fraud.",
    actionTaken: "Menolak klaim dan mengarahkan pembeli untuk mengirimkan rekaman layar utuh tanpa potongan.",
    responseTemplate: "Halo kak, setelah kami periksa, terdapat jeda/potongan pada video rekaman layar yang dikirimkan. Syarat garansi Akshara Gaming Center mewajibkan rekaman layar utuh tanpa jeda dari awal akses portal klaim sampai login. Silakan kirimkan video mentah tanpa potongan agar klaim bisa kami proses ya kak."
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-slate-900">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-mono transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono text-slate-600 font-medium">The Support</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
              <Headphones className="w-5 h-5" />
            </div>
            The Support — Warranty Claims &amp; SOP Triage
          </h1>
          <p className="text-[13px] text-slate-600 mt-2 max-w-2xl leading-relaxed">
            Standar Operasional Prosedur (SOP) penanganan klaim garansi digital, verifikasi video rekaman layar (no-cut), dan triase otomatis anti-fraud.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          Dashboard
        </Link>
      </div>

      {/* ── Overview KPI Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Klaim Aktif
            </span>
            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              <Headphones className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">0</div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            Semua tiket terselesaikan
          </div>
        </div>

        <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-sky-700 font-semibold">
              SOP No-Cut
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-700 tracking-tight">100% Wajib</div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            Proteksi seller anti-fraud
          </div>
        </div>

        <div className="app-card rounded-2xl p-5 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
              AI Triage Status
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 tracking-tight flex items-center gap-2">
            <span>READY</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-sans font-medium">
              Live
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100">
            Gemini 3.5 Flash-Lite
          </div>
        </div>
      </div>

      {/* ── AI Triage Tester Panel ─────────────────────────── */}
      <div className="app-card rounded-2xl p-5 sm:p-6 border border-slate-200 bg-white shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Live AI Complaint Triage Engine</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                  Gemini 3.5 Flash-Lite
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Evaluasi otomatis keluhan pembeli berdasarkan bukti video rekaman layar (no-cut) dan siapkan draft balasan Shopee Chat.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Input Form */}
          <div className="space-y-3.5">
            <div>
              <label className="text-[11px] font-mono text-slate-600 block mb-1.5 font-medium">No. Pesanan Shopee</label>
              <input
                type="text"
                value={testOrderId}
                onChange={(e) => setTestOrderId(e.target.value)}
                placeholder="Contoh: #240916MC99211A"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-600 block mb-1.5 font-medium">Pesan / Keluhan Pembeli</label>
              <textarea
                rows={3}
                value={testClaimText}
                onChange={(e) => setTestClaimText(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={testHasVideo}
                onChange={(e) => setTestHasVideo(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-medium text-slate-800 block">Ada Video Rekaman Layar (No-Cut)</span>
                <span className="text-[10px] font-mono text-slate-500">Video utuh tanpa jeda sejak membuka portal klaim hingga pengujian akun</span>
              </div>
            </label>

            <button
              type="button"
              onClick={handleRunAiTriage}
              disabled={isTriaging || !testClaimText.trim()}
              className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isTriaging ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menganalisis Klaim dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Jalankan Triase AI</span>
                </>
              )}
            </button>
          </div>

          {/* Result Panel */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                  Hasil Keputusan Triase
                </span>
                {triageResult && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                      triageResult.verdict === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {triageResult.verdict}
                  </span>
                )}
              </div>

              {triageResult ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 font-mono">
                    <span className="text-slate-500 text-[11px]">Keputusan:</span>
                    <span
                      className={`font-bold ${
                        triageResult.verdict === "APPROVED" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {triageResult.verdict === "APPROVED" ? "Klaim Diterima (Kirim Akun Baru)" : "Klaim Ditolak (Edukasi SOP)"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block mb-1">Pertimbangan AI:</span>
                    <p className="text-slate-700 text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                      {triageResult.reasoning}
                    </p>
                  </div>

                  {triageResult.recommended_response && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono text-sky-700 font-semibold">Draft Balasan Shopee Chat:</span>
                        <button
                          onClick={() => copyText(triageResult.recommended_response, "triage-reply")}
                          className="text-[10px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === "triage-reply" ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-slate-800 text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-sky-200 font-mono">
                        "{triageResult.recommended_response}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                  <Shield className="w-8 h-8 text-slate-300" />
                  <p>Masukkan keluhan pembeli dan klik tombol untuk analisis AI.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SOP Case Matrix (Accordion) ────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight whitespace-nowrap">
            Matriks Penanganan Kasus Garansi (3 Skenario Kunci)
          </h2>
          <div className="flex-1 h-[1px] bg-slate-200" />
        </div>

        <div className="space-y-3">
          {sopCases.map((c) => {
            const isExpanded = expandedCase === c.id;
            return (
              <div
                key={c.id}
                className="app-card rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleCase(c.id)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        c.verdict === "APPROVED"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-rose-50 border-rose-200 text-rose-700"
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
                        <span className="text-sm font-bold text-slate-900">{c.title}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                            c.verdict === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {c.verdict}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{c.category}</span>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1 font-semibold">
                          Keluhan Pembeli:
                        </span>
                        <p className="text-slate-700 font-mono text-[11px] leading-relaxed">{c.buyerSays}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1 font-semibold">
                          Pertimbangan SOP:
                        </span>
                        <p className="text-slate-700 text-[11px] leading-relaxed">{c.aiReasoning}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-sky-700 uppercase tracking-wider font-semibold">
                          Template Balasan Siap Pakai:
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(c.responseTemplate, `case-${c.id}`)}
                          className="text-[10px] font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                        >
                          {copiedId === `case-${c.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-semibold">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin Template</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-slate-800 text-[11px] leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-slate-200">
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
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight whitespace-nowrap">
            3 Template Balasan Cepat Shopee Chat
          </h2>
          <div className="flex-1 h-[1px] bg-slate-200" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: "1. Tolak — Tanpa Video",
              text: "Mohon maaf kak, sesuai SOP garansi toko kami wajib menyertakan video rekaman layar (screen recording) tanpa jeda sejak membuka link klaim hingga pengetesan akun ya kak.",
              border: "border-slate-200",
              tag: "REJECT"
            },
            {
              title: "2. Setuju — Kirim Pengganti",
              text: "Terima kasih atas video rekaman layarnya yang valid kak. Kendala akun telah kami verifikasi dan kami segera siapkan akun pengganti baru untuk kakak.",
              border: "border-slate-200",
              tag: "APPROVE"
            },
            {
              title: "3. Tolak — Video Diedit/Ada Jeda",
              text: "Halo kak, kami mendapati adanya jeda/potongan pada rekaman video yang dikirim. Syarat garansi toko kami adalah video utuh tanpa potongan dari awal akses klaim hingga login ya kak.",
              border: "border-slate-200",
              tag: "SUSPICIOUS"
            }
          ].map((item, i) => (
            <div
              key={i}
              className={`app-card p-4 rounded-2xl bg-white border ${item.border} shadow-sm space-y-2.5 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">{item.title}</span>
                  <button
                    onClick={() => copyText(item.text, `quick-tpl-${i}`)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                    title="Salin template"
                  >
                    {copiedId === `quick-tpl-${i}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
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

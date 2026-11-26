"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  ExternalLink,
  X,
  ArrowUpDown,
  ShieldCheck,
  Database,
  Star,
  AlertTriangle,
} from "lucide-react";
import {
  formatOrdersCompact,
  getTrustTierBadgeStyle,
  getFreshnessBadgeStyle,
  evaluateSteamAccountFreshness,
} from "@/lib/sellerTrust";

export interface SellerPreviewGameEntry {
  game_id: string;
  game_title: string;
  platform?: string;
  selling_price_shopee_idr: number;
  current_selected_seller_id?: string;
  recommended_selected_seller_id?: string;
  candidates: any[];
  filtered_out_clickbait_count?: number;
  filtered_out_non_fresh_count?: number;
  verified_fresh_count?: number;
  fresh_fallback_warning?: boolean;
  clean_candidates_count?: number;
  total_raw_offers?: number;
}

export interface SellerReviewModalProps {
  open: boolean;
  previews: SellerPreviewGameEntry[];
  isSaving?: boolean;
  onClose: () => void;
  onConfirmApply: (
    updates: Array<{
      game_id: string;
      sellers: any[];
      selected_seller_id: string;
    }>
  ) => Promise<void> | void;
}

type SellerSortKey = "trust_desc" | "price_asc" | "rating_desc" | "stock_desc";

export default function SellerReviewModal({
  open,
  previews,
  isSaving = false,
  onClose,
  onConfirmApply,
}: SellerReviewModalProps) {
  const [sortBy, setSortBy] = useState<SellerSortKey>("trust_desc");
  const [safeOnly, setSafeOnly] = useState<boolean>(false);
  const [freshOnly, setFreshOnly] = useState<boolean>(true);
  const [hideLowMargin, setHideLowMargin] = useState<boolean>(false);

  // Per-game selections: checked seller IDs + chosen primary seller ID + whether game is included
  const [includedGames, setIncludedGames] = useState<Set<string>>(new Set());
  const [keptSellerIdsByGame, setKeptSellerIdsByGame] = useState<Record<string, Set<string>>>({});
  const [primarySellerByGame, setPrimarySellerByGame] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && Array.isArray(previews)) {
      const inc = new Set<string>();
      const keptMap: Record<string, Set<string>> = {};
      const primMap: Record<string, string> = {};

      previews.forEach((p) => {
        if (Array.isArray(p.candidates) && p.candidates.length > 0) {
          inc.add(p.game_id);
          // Default keep top 3 clean candidates (user can check more!)
          keptMap[p.game_id] = new Set(p.candidates.slice(0, 3).map((s: any) => s.seller_id));
          primMap[p.game_id] = p.recommended_selected_seller_id || p.candidates[0].seller_id;
        }
      });

      setIncludedGames(inc);
      setKeptSellerIdsByGame(keptMap);
      setPrimarySellerByGame(primMap);
      setSortBy("trust_desc");
      setSafeOnly(false);
      setFreshOnly(true);
      setHideLowMargin(false);
    }
  }, [open, previews]);

  const formatRp = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const sortedPreviews = useMemo(() => {
    return previews.map((p) => {
      const hasAnyVerifiedFresh = (p.candidates || []).some(
        (c: any) =>
          (c.fresh_status || evaluateSteamAccountFreshness(c.offer_title).fresh_status) ===
          "verified_fresh"
      );
      const filtered = (p.candidates || []).filter((s: any) => {
        if (
          safeOnly &&
          (Number(s.seller_rating ?? s.rating_pct ?? 0) < 95 ||
            Number(s.seller_orders ?? s.reviews_count ?? 0) < 20)
        ) {
          return false;
        }
        if (freshOnly && hasAnyVerifiedFresh) {
          const fs = s.fresh_status || evaluateSteamAccountFreshness(s.offer_title).fresh_status;
          if (fs !== "verified_fresh") return false;
        }
        if (hideLowMargin && Number(s.net_margin_pct ?? 0) < 10) {
          return false;
        }
        return true;
      });
      const sorted = [...filtered].sort((a: any, b: any) => {
        if (sortBy === "price_asc") return (a.price_g2g_idr || 0) - (b.price_g2g_idr || 0);
        if (sortBy === "rating_desc") {
          return (b.seller_rating || b.rating_pct || 0) - (a.seller_rating || a.rating_pct || 0) || (b.seller_orders || 0) - (a.seller_orders || 0);
        }
        if (sortBy === "stock_desc") return (b.stock || 0) - (a.stock || 0);
        const fA = a.fresh_status === "verified_fresh" ? 1 : 0;
        const fB = b.fresh_status === "verified_fresh" ? 1 : 0;
        if (fB !== fA) return fB - fA;
        return (b.trust_score || 0) - (a.trust_score || 0) || (a.price_g2g_idr || 0) - (b.price_g2g_idr || 0);
      });
      return { ...p, visibleCandidates: sorted };
    });
  }, [previews, sortBy, safeOnly, freshOnly, hideLowMargin]);

  if (!open) return null;

  const toggleSellerKept = (gameId: string, sellerId: string) => {
    setKeptSellerIdsByGame((prev) => {
      const cur = new Set(Array.from(prev[gameId] || []));
      if (cur.has(sellerId)) {
        if (cur.size > 1) cur.delete(sellerId);
      } else {
        cur.add(sellerId);
      }
      // Ensure primary is still kept
      const prim = primarySellerByGame[gameId];
      if (prim && !cur.has(prim)) {
        const first = Array.from(cur)[0];
        if (first) setPrimarySellerByGame((pm) => ({ ...pm, [gameId]: first }));
      }
      return { ...prev, [gameId]: cur };
    });
  };

  const selectPrimary = (gameId: string, sellerId: string) => {
    setPrimarySellerByGame((prev) => ({ ...prev, [gameId]: sellerId }));
    setKeptSellerIdsByGame((prev) => {
      const cur = new Set(Array.from(prev[gameId] || []));
      cur.add(sellerId);
      return { ...prev, [gameId]: cur };
    });
  };

  const toggleGameIncluded = (gameId: string) => {
    setIncludedGames((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
  };

  const handleConfirm = () => {
    const updates = previews
      .filter((p) => includedGames.has(p.game_id))
      .map((p) => {
        const keptSet = keptSellerIdsByGame[p.game_id] || new Set();
        const chosenSellers = (p.candidates || []).filter((s: any) => keptSet.has(s.seller_id));
        const finalSellers = chosenSellers.length > 0 ? chosenSellers : p.candidates.slice(0, 1);
        const primId = primarySellerByGame[p.game_id];
        const finalPrimary =
          primId && finalSellers.some((s: any) => s.seller_id === primId)
            ? primId
            : finalSellers[0]?.seller_id || "";
        return {
          game_id: p.game_id,
          sellers: finalSellers.map((s: any) => ({ ...s, is_recommended: s.seller_id === finalPrimary })),
          selected_seller_id: finalPrimary,
        };
      })
      .filter((u) => u.sellers.length > 0);

    onConfirmApply(updates);
  };

  const totalFilteredClickbait = previews.reduce((acc, p) => acc + (p.filtered_out_clickbait_count || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" /> PRE-SAVE SELLER REVIEW ({previews.length} GAME)
              </span>
              <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                {totalFilteredClickbait} listing clickbait/shared otomatis diblokir
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Review, Sortir &amp; Cek Offer G2G Sebelum Simpan ke Database
            </h2>
            <p className="text-xs text-slate-500">
              Centang seller yang ingin disimpan, pilih Seller Utama (radio), dan cek link G2G asli sebelum menimpa data katalog.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sort & Filter Strip */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium">Urutkan Seller:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SellerSortKey)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="trust_desc">Trust Score Tertinggi</option>
                <option value="price_asc">Modal Termurah (Margin Tertinggi)</option>
                <option value="rating_desc">Rating &amp; Order Terbanyak</option>
                <option value="stock_desc">Stok Terbanyak</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSafeOnly(!safeOnly)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                safeOnly
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              🛡️ Hanya Seller Aman (≥95% &amp; ≥20 Order)
            </button>

            <button
              type="button"
              onClick={() => setFreshOnly(!freshOnly)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                freshOnly
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              🛡️ 0h Fresh / OGE Saja (Anti-Hackback)
            </button>

            <button
              type="button"
              onClick={() => setHideLowMargin(!hideLowMargin)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                hideLowMargin
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              📈 Sembunyikan Margin &lt; 10%
            </button>
          </div>
        </div>

        {/* Game & Seller Candidates List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#F8FAFC]">
          {sortedPreviews.map((p) => {
            const gameChecked = includedGames.has(p.game_id);
            const keptSet = keptSellerIdsByGame[p.game_id] || new Set<string>();
            const primaryId = primarySellerByGame[p.game_id];

            return (
              <div
                key={p.game_id}
                className={`rounded-xl border bg-white overflow-hidden transition-all ${
                  gameChecked ? "border-slate-300 shadow-sm" : "border-slate-200 opacity-65"
                }`}
              >
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {previews.length > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleGameIncluded(p.game_id)}
                        className={`w-4.5 h-4.5 w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${
                          gameChecked ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300"
                        }`}
                      >
                        {gameChecked && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{p.game_title}</h3>
                      <p className="text-[11px] font-mono text-slate-500">
                        Harga Jual Shopee: <strong className="text-slate-800">{formatRp(p.selling_price_shopee_idr)}</strong> •{" "}
                        {p.visibleCandidates.length} kandidat tampil ({p.filtered_out_clickbait_count || 0} clickbait/hackback
                        {p.filtered_out_non_fresh_count ? ` + ${p.filtered_out_non_fresh_count} non-0h` : ""} disaring)
                      </p>
                    </div>
                  </div>
                </div>

                {p.fresh_fallback_warning && (
                  <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong>Perhatian Anti-Hackback:</strong> Tidak ada listing G2G yang menulis eksplisit &quot;0 Hours / Fresh&quot; di judul saat ini. Wajib buka link G2G &amp; tanya seller sebelum order.
                    </span>
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {p.visibleCandidates.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Semua kandidat seller tersaring oleh filter aktif. Nonaktifkan filter di atas untuk melihat kandidat.</span>
                    </div>
                  ) : (
                    p.visibleCandidates.map((s: any) => {
                      const isKept = keptSet.has(s.seller_id);
                      const isPrimary = primaryId === s.seller_id;
                      const netProfit = Number(s.net_profit_idr || 0);
                      const netMargin = Number(s.net_margin_pct || 0);

                      return (
                        <div
                          key={s.seller_id}
                          className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isPrimary ? "bg-emerald-50/50" : "hover:bg-slate-50/80"
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Keep checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleSellerKept(p.game_id, s.seller_id)}
                              title="Simpan seller ini di daftar alternatif game"
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                                isKept ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-300"
                              }`}
                            >
                              {isKept && <Check className="w-3 h-3" />}
                            </button>

                            {/* Primary radio */}
                            <button
                              type="button"
                              onClick={() => selectPrimary(p.game_id, s.seller_id)}
                              className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border cursor-pointer ${
                                isPrimary
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-white text-slate-600 border-slate-300 hover:border-emerald-500"
                              }`}
                            >
                              {isPrimary ? "★ UTAMA" : "Pilih Utama"}
                            </button>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900">{s.seller_name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getTrustTierBadgeStyle(s.trust_tier)}`}>
                                  {s.trust_tier || "Verified"} ({s.trust_score}/100)
                                </span>
                                {(() => {
                                  const fEval = evaluateSteamAccountFreshness(s.offer_title || "");
                                  const fs = s.fresh_status || (s.offer_title ? fEval.fresh_status : undefined);
                                  const hasEmail = Boolean(s.has_first_email || fEval.has_first_email);
                                  const isSteam =
                                    String(p.platform || "").toLowerCase().includes("steam") ||
                                    String(s.offer_title || "").toLowerCase().includes("steam");
                                  if (!fs && !hasEmail) return null;
                                  return (
                                    <>
                                      {fs === "verified_fresh" ? (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getFreshnessBadgeStyle("verified_fresh")}`}>
                                          🛡️ 0h Fresh
                                        </span>
                                      ) : isSteam && fs === "unverified" ? (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${getFreshnessBadgeStyle("unverified")}`}>
                                          ⏳ Cek Jam Main
                                        </span>
                                      ) : null}
                                      {hasEmail && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded border font-semibold bg-sky-50 text-sky-700 border-sky-200">
                                          ✉️ First Email / OGE
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                                <span className="text-[11px] font-mono text-slate-600 flex items-center gap-0.5 tabular-nums">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                                  {Number(s.seller_rating ?? s.rating_pct ?? 0).toFixed(1)}% •{" "}
                                  {formatOrdersCompact(s.seller_orders ?? s.reviews_count ?? 0)}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                                  • Stok: <strong className="text-slate-800">{s.stock}</strong>
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 truncate">
                                {s.offer_title || s.tier_desc}
                              </div>
                              <a
                                href={s.profile_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline"
                              >
                                <span>Cek Listing Offer G2G</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 font-mono text-xs shrink-0">
                            <div>
                              <span className="text-[10px] text-slate-500 block font-sans">Modal G2G</span>
                              <span className="font-bold text-slate-900 tabular-nums">{formatRp(s.price_g2g_idr)}</span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-3">
                              <span className={`text-[10px] font-sans font-semibold block ${netProfit > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                Est. Margin ({netMargin.toFixed(1)}%)
                              </span>
                              <span className={`font-extrabold tabular-nums ${netProfit > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                {netProfit >= 0 ? "+" : ""}
                                {formatRp(netProfit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <strong className="text-slate-900">{includedGames.size} game</strong> siap diperbarui. Data katalog lama tetap aman jika Anda klik Batal.
          </div>
          <div className="flex items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || includedGames.size === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Terapkan &amp; Simpan ke Database ({includedGames.size} Game)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

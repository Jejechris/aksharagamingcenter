"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  ArrowUpDown,
  ShieldCheck,
  Sparkles,
  Database,
  Plus,
} from "lucide-react";
import { calculateShopeeEconomics } from "@/lib/pricing";

export interface ResearchReviewModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  candidates: any[];
  isSaving?: boolean;
  onClose: () => void;
  onConfirmSave: (selectedItems: any[], alsoAddToCatalog: boolean) => Promise<void> | void;
}

type SortKey = "margin_desc" | "profit_desc" | "price_asc" | "spread_desc" | "discount_desc";

export default function ResearchReviewModal({
  open,
  title = "Review & Sortir Hasil Discovery Sebelum Masuk Database",
  subtitle = "Cek keaslian harga di Eneba/G2G, ubah target harga jual Shopee bila perlu, dan pilih hanya game yang benar-benar layak disimpan.",
  candidates,
  isSaving = false,
  onClose,
  onConfirmSave,
}: ResearchReviewModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("margin_desc");
  const [viableOnly, setViableOnly] = useState<boolean>(false);
  const [enebaLiveOnly, setEnebaLiveOnly] = useState<boolean>(false);
  const [minMargin, setMinMargin] = useState<number>(0);

  useEffect(() => {
    if (open && Array.isArray(candidates)) {
      setItems(candidates);
      // Pre-select ONLY viable profitable items (never auto-select overpriced/unprofitable ones!)
      const defaultSelected = new Set<string>();
      candidates.forEach((c) => {
        if (c.arbitrage_viable !== false && Number(c.net_profit_idr || 0) > 0) {
          defaultSelected.add(c.id);
        }
      });
      // If none are pre-selected and it's a single manual lookup, still leave unchecked if unviable so user makes conscious choice
      setSelectedIds(defaultSelected);
      setSortBy("margin_desc");
      setViableOnly(false);
      setEnebaLiveOnly(false);
      setMinMargin(0);
    }
  }, [open, candidates]);

  const formatRp = (num: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num || 0);

  const getModalPrice = (g: any) =>
    Number(g.price_eneba_idr ?? g.price_g2g_idr ?? g.g2g_price_idr ?? 0) || 0;

  const updateItemShopeePrice = (id: string, nextShopee: number) => {
    const cleanShopee = Math.max(0, Math.round(Number(nextShopee) || 0));
    setItems((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const modal = getModalPrice(g);
        const eco = calculateShopeeEconomics({
          sellingPriceIdr: cleanShopee,
          cogsIdr: modal,
          presetId: "reguler",
          packagingCostIdr: 0,
        });
        const spread = modal > 0 ? Number((((cleanShopee - modal) / modal) * 100).toFixed(1)) : 0;
        const steamIdr = Number(g.steam_indo_price_idr || 0);
        const stillViable =
          eco.netProfitIdr > 5000 &&
          eco.netMarginPct >= 10 &&
          (steamIdr <= 0 || cleanShopee < steamIdr * 0.98);
        return {
          ...g,
          recommended_shopee_price_idr: cleanShopee,
          shopee_retail_price_idr: cleanShopee,
          qris_fee_idr: eco.qrisFeeIdr,
          shopee_fee_idr: eco.shopeeFeeIdr,
          net_profit_idr: eco.netProfitIdr,
          net_margin_pct: eco.netMarginPct,
          spread_pct: spread,
          arbitrage_viable: stillViable,
          arbitrage_warning:
            steamIdr > 0 && cleanShopee >= steamIdr * 0.98
              ? `Harga jual (${formatRp(cleanShopee)}) mendekati atau melebihi harga Steam Indonesia (${formatRp(steamIdr)}).`
              : eco.netProfitIdr <= 0
              ? `Rugi bersih ${formatRp(eco.netProfitIdr)} pada harga jual ini.`
              : undefined,
        };
      })
    );
  };

  const filteredAndSorted = useMemo(() => {
    const filtered = items.filter((g) => {
      if (viableOnly && g.arbitrage_viable === false) return false;
      if (enebaLiveOnly && !g.eneba_live_verified) return false;
      if (minMargin > 0 && Number(g.net_margin_pct || 0) < minMargin) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "profit_desc") return (b.net_profit_idr || 0) - (a.net_profit_idr || 0);
      if (sortBy === "price_asc") return getModalPrice(a) - getModalPrice(b);
      if (sortBy === "spread_desc") return (b.spread_pct || 0) - (a.spread_pct || 0);
      if (sortBy === "discount_desc") return (b.discount_pct || 0) - (a.discount_pct || 0);
      return (b.net_margin_pct || 0) - (a.net_margin_pct || 0);
    });
  }, [items, viableOnly, enebaLiveOnly, minMargin, sortBy]);

  if (!open) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectViableOnly = () => {
    const next = new Set<string>();
    filteredAndSorted.forEach((g) => {
      if (g.arbitrage_viable !== false && Number(g.net_profit_idr || 0) > 0) next.add(g.id);
    });
    setSelectedIds(next);
  };

  const selectAllVisible = () => {
    const next = new Set(Array.from(selectedIds));
    filteredAndSorted.forEach((g) => next.add(g.id));
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const chosenItems = items.filter((g) => selectedIds.has(g.id));
  const viableCount = items.filter((g) => g.arbitrage_viable !== false && Number(g.net_profit_idr || 0) > 0).length;
  const enebaVerifiedCount = items.filter((g) => g.eneba_live_verified).length;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-100 text-violet-800 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> PRE-SAVE STAGING &amp; VERIFICATION
              </span>
              <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                {items.length} Kandidat • {enebaVerifiedCount} Eneba Live • {viableCount} Layak Arbitrase
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            title="Tutup tanpa menyimpan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sort & Filter Controls */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-600 font-medium">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="margin_desc">Margin % Tertinggi</option>
                <option value="profit_desc">Laba Bersih (Rp) Tertinggi</option>
                <option value="price_asc">Modal Termurah</option>
                <option value="spread_desc">Spread % Terbesar</option>
                <option value="discount_desc">Diskon Steam Terbesar</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setViableOnly(!viableOnly)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                viableOnly
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              ✓ Layak Arbitrase Saja
            </button>

            <button
              type="button"
              onClick={() => setEnebaLiveOnly(!enebaLiveOnly)}
              className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                enebaLiveOnly
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              ⚡ Eneba Live SSR Saja
            </button>

            <select
              value={minMargin}
              onChange={(e) => setMinMargin(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium cursor-pointer"
            >
              <option value={0}>Semua Margin</option>
              <option value={15}>Min Margin ≥ 15%</option>
              <option value={25}>Min Margin ≥ 25%</option>
            </select>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <button
              type="button"
              onClick={selectViableOnly}
              className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold cursor-pointer"
            >
              Pilih Layak
            </button>
            <button
              type="button"
              onClick={selectAllVisible}
              className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold cursor-pointer"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Scrollable Candidate List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#F8FAFC]">
          {filteredAndSorted.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              Tidak ada kandidat yang sesuai filter saat ini. Coba longgarkan filter margin atau status.
            </div>
          ) : (
            filteredAndSorted.map((g) => {
              const isChecked = selectedIds.has(g.id);
              const modal = getModalPrice(g);
              const basePrice = Number(g.eneba_base_price_idr || 0);
              const shopeePrice = Number(g.recommended_shopee_price_idr ?? g.shopee_retail_price_idr ?? 0);
              const steamPrice = Number(g.steam_indo_price_idr || 0);
              const netProfit = Number(g.net_profit_idr || 0);
              const netMargin = Number(g.net_margin_pct || 0);
              const linkUrl = g.eneba_direct_url || g.g2g_direct_url || g.profile_url || "https://www.eneba.com";
              const isUnviable = g.arbitrage_viable === false || netProfit <= 0;

              return (
                <div
                  key={g.id}
                  className={`rounded-xl border p-4 bg-white transition-all ${
                    isChecked
                      ? "border-violet-400 ring-2 ring-violet-500/15 shadow-sm"
                      : isUnviable
                      ? "border-rose-200 bg-rose-50/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Checkbox + Title + Source Truth */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleSelect(g.id)}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          isChecked
                            ? "bg-violet-600 border-violet-600 text-white"
                            : "bg-white border-slate-300 hover:border-violet-400"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{g.title}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                            {g.platform}
                          </span>
                          {g.eneba_live_verified ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> ENEBA LIVE SSR
                            </span>
                          ) : g.cheapshark_usd ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              CHEAPSHARK ${g.cheapshark_usd}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              ESTIMATED
                            </span>
                          )}
                          {isUnviable && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> TIDAK LAYAK / OVERPRICED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {g.arbitrage_warning || g.tactical_reason || g.arbitrage_reason}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px]">
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 font-semibold underline"
                          >
                            <span>Cek Harga Asli di Sumber</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {basePrice > 0 && (
                            <span className="text-slate-500 font-mono tabular-nums">
                              Listing Dasar: <strong className="text-slate-800">{formatRp(basePrice)}</strong> (+~9% checkout)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Pricing & Editable Shopee Price */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shrink-0 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-sans uppercase">Modal Landed</span>
                        <span className="font-bold text-violet-700 tabular-nums">{formatRp(modal)}</span>
                        {steamPrice > 0 && (
                          <span className="text-[10px] text-slate-500 block tabular-nums">
                            Steam ID: {formatRp(steamPrice)}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block font-sans uppercase mb-0.5">
                          Jual Shopee (Edit)
                        </label>
                        <input
                          type="number"
                          step={1000}
                          value={shopeePrice}
                          onChange={(e) => updateItemShopeePrice(g.id, Number(e.target.value))}
                          className="w-28 px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-900 font-bold tabular-nums focus:outline-none focus:border-violet-500"
                        />
                      </div>

                      <div className="text-right min-w-[105px] border-l border-slate-200 pl-3">
                        <span
                          className={`text-[10px] font-sans font-semibold block ${
                            netProfit > 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          Margin ({netMargin.toFixed(1)}%)
                        </span>
                        <span
                          className={`text-sm font-extrabold tabular-nums ${
                            netProfit > 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {netProfit >= 0 ? "+" : ""}
                          {formatRp(netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="px-5 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong className="text-slate-900 tabular-nums">{chosenItems.length} game</strong> dipilih untuk disimpan. Item yang tidak dicentang tidak akan masuk ke database.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              Batal (Jangan Simpan)
            </button>
            <button
              type="button"
              onClick={() => onConfirmSave(chosenItems, false)}
              disabled={isSaving || chosenItems.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Simpan ke DB Radar ({chosenItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => onConfirmSave(chosenItems, true)}
              disabled={isSaving || chosenItems.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simpan &amp; Masukkan ke Katalog ({chosenItems.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

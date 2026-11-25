"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Check,
  ArrowUpDown,
  Gamepad2,
  PlusCircle,
} from "lucide-react";

export interface GameSelectorComboboxProps {
  games: any[];
  selectedGameId?: string;
  selectedGameTitle?: string;
  onSelect: (game: any) => void;
  placeholder?: string;
  showCustomOption?: boolean;
  onSelectCustom?: () => void;
  label?: string;
  actionLink?: { label: string; href: string };
}

type SortKey =
  | "margin_desc"
  | "profit_desc"
  | "price_asc"
  | "price_desc"
  | "name_asc";

export default function GameSelectorCombobox({
  games,
  selectedGameId,
  selectedGameTitle,
  onSelect,
  placeholder = "Pilih game dari portofolio...",
  showCustomOption = false,
  onSelectCustom,
  label,
  actionLink,
}: GameSelectorComboboxProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("margin_desc");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [portalCoords, setPortalCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxListHeight: number;
  }>({ top: 0, left: 0, width: 320, maxListHeight: 288 });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate fixed portal position directly from trigger bounding rect
  const updatePortalPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const width = Math.max(rect.width, 300);
    const maxWidth = window.innerWidth - 24;
    const clampedWidth = Math.min(width, maxWidth);
    const clampedLeft = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - clampedWidth - 12)
    );

    setPortalCoords({
      top: rect.bottom + 8,
      left: clampedLeft,
      width: clampedWidth,
      maxListHeight: Math.max(180, Math.min(300, spaceBelow - 110)),
    });
  }, []);

  // Extract metrics consistently for each game
  const normalizedGames = useMemo(() => {
    return (games || []).map((g) => {
      const price = Number(g.selling_price_shopee_idr ?? g.price ?? 0);
      const selSeller =
        g.sellers?.find(
          (s: any) =>
            (s.seller_id || s.id) === g.selected_seller_id
        ) || g.sellers?.[0];

      const sellerName =
        selSeller?.seller_name || selSeller?.name || g.seller || "Supplier Utama";
      const cogs = Number(
        selSeller?.price_g2g_idr ??
          selSeller?.price_idr ??
          g.metrics?.cogs_g2g_idr ??
          g.g2gIdr ??
          Math.round(price * 0.65)
      );
      const qris = Math.round(cogs * 0.007);
      const shopeeFee = Math.round(price * 0.08) + 1000;
      const computedProfit = price - cogs - qris - shopeeFee;
      const netProfit =
        typeof g.metrics?.net_profit_idr === "number"
          ? g.metrics.net_profit_idr
          : computedProfit;
      const computedMargin =
        price > 0 ? Math.round((netProfit / price) * 1000) / 10 : 0;
      const marginPct =
        typeof g.metrics?.net_margin_pct === "number"
          ? g.metrics.net_margin_pct
          : typeof g.target_margin_pct === "number"
          ? g.target_margin_pct
          : typeof g.margin === "number"
          ? g.margin
          : computedMargin;

      return {
        raw: g,
        id: g.id || g.catalogId || g.title,
        title: g.title || "Untitled Game",
        platform: g.platform || "PC",
        category: g.category || "Digital License",
        sellerName,
        price,
        netProfit,
        marginPct,
      };
    });
  }, [games]);

  // Unique platform filter pills extracted from games
  const platformPills = useMemo(() => {
    const set = new Set<string>();
    normalizedGames.forEach((g) => {
      const p = g.platform.toLowerCase();
      if (p.includes("steam")) set.add("Steam");
      else if (p.includes("microsoft") || p.includes("xbox")) set.add("Microsoft");
      else if (p.includes("rockstar")) set.add("Rockstar");
      else if (p.includes("ea")) set.add("EA");
      else if (p.includes("gog")) set.add("GOG");
      else if (p.includes("nintendo")) set.add("Nintendo");
      else if (p.includes("playstation")) set.add("PlayStation");
      else set.add(g.platform.split("/")[0].trim());
    });
    return ["ALL", ...Array.from(set).slice(0, 6)];
  }, [normalizedGames]);

  // Filtered & sorted list
  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = normalizedGames.filter((item) => {
      if (
        platformFilter !== "ALL" &&
        !item.platform.toLowerCase().includes(platformFilter.toLowerCase())
      ) {
        return false;
      }
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchPlatform = item.platform.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchSeller = item.sellerName.toLowerCase().includes(q);
        if (!matchTitle && !matchPlatform && !matchCat && !matchSeller) {
          return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === "margin_desc") return b.marginPct - a.marginPct;
      if (sortBy === "profit_desc") return b.netProfit - a.netProfit;
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return a.title.localeCompare(b.title);
    });

    return filtered;
  }, [normalizedGames, platformFilter, searchQuery, sortBy]);

  // Selected item resolution
  const activeItem = useMemo(() => {
    if (selectedGameId === "custom") return null;
    return (
      normalizedGames.find(
        (item) =>
          (selectedGameId && item.id === selectedGameId) ||
          (selectedGameTitle &&
            item.title.toLowerCase() === selectedGameTitle.toLowerCase())
      ) || null
    );
  }, [normalizedGames, selectedGameId, selectedGameTitle]);

  // Reposition on open, scroll (capture), and resize
  useEffect(() => {
    if (!isOpen) return;
    updatePortalPosition();
    setHighlightIndex(0);

    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);

    const handleScrollOrResize = () => {
      updatePortalPosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePortalPosition]);

  // Close on click outside (check both trigger container and portal panel) or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        portalRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleGlobalEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleGlobalEscape);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        filteredGames.length > 0 ? Math.min(prev + 1, filteredGames.length - 1) : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filteredGames[highlightIndex];
      if (target) {
        onSelect(target.raw);
        setIsOpen(false);
      }
    }
  };

  const getMarginBadgeClass = (margin: number) => {
    if (margin >= 20)
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (margin >= 10)
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const formatRp = (val: number) =>
    `Rp ${Math.round(val || 0).toLocaleString("id-ID")}`;

  const dropdownPanel = isOpen ? (
    <div
      ref={portalRef}
      style={{
        position: "fixed",
        top: `${portalCoords.top}px`,
        left: `${portalCoords.left}px`,
        width: `${portalCoords.width}px`,
      }}
      onKeyDown={handleKeyDown}
      className="z-[9999] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-scale-in origin-top"
    >
      {/* Search & Sort Header */}
      <div className="p-3 bg-slate-50/90 border-b border-slate-200 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightIndex(0);
              }}
              placeholder="Cari judul game, platform, atau supplier..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="margin_desc">Margin Tertinggi</option>
              <option value="profit_desc">Profit Terbesar</option>
              <option value="price_asc">Harga Termurah</option>
              <option value="price_desc">Harga Termahal</option>
              <option value="name_asc">Nama A–Z</option>
            </select>
          </div>
        </div>

        {/* Platform Filter Pills */}
        {platformPills.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {platformPills.map((plat) => (
              <button
                key={plat}
                type="button"
                onClick={() => {
                  setPlatformFilter(plat);
                  setHighlightIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                  platformFilter === plat
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {plat === "ALL" ? "Semua" : plat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List Items */}
      <div
        style={{ maxHeight: `${portalCoords.maxListHeight}px` }}
        className="overflow-y-auto divide-y divide-slate-100"
      >
        {showCustomOption && onSelectCustom && (
          <button
            type="button"
            onClick={() => {
              onSelectCustom();
              setIsOpen(false);
            }}
            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
              selectedGameId === "custom"
                ? "bg-indigo-50 text-indigo-800 font-semibold"
                : "hover:bg-slate-50 text-indigo-700 font-medium"
            }`}
          >
            <div className="flex items-center gap-2">
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>-- Input Manual (Game Baru / Custom) --</span>
            </div>
            {selectedGameId === "custom" && (
              <Check className="w-3.5 h-3.5 text-indigo-600" />
            )}
          </button>
        )}

        {filteredGames.length === 0 ? (
          <div className="py-8 px-4 text-center text-xs text-slate-500">
            Tidak ada game yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredGames.map((item, idx) => {
            const isSelected = activeItem?.id === item.id;
            const isHighlighted = idx === highlightIndex;

            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => {
                  onSelect(item.raw);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50/70"
                    : isHighlighted
                    ? "bg-slate-50"
                    : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs truncate ${
                        isSelected
                          ? "font-bold text-emerald-900"
                          : "font-semibold text-slate-900"
                      }`}
                    >
                      {item.title}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-1.5">
                    <span className="font-mono text-slate-600">
                      {item.platform}
                    </span>
                    <span>&bull;</span>
                    <span className="truncate">{item.sellerName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 tabular-nums">
                      {formatRp(item.price)}
                    </div>
                    <div className="text-[10px] text-emerald-700 tabular-nums">
                      +{formatRp(item.netProfit)}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums ${getMarginBadgeClass(
                      item.marginPct
                    )}`}
                  >
                    {item.marginPct.toFixed(1)}%
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
      {(label || actionLink) && (
        <div className="flex items-center justify-between mb-1.5">
          {label ? (
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{label}</span>
            </span>
          ) : (
            <span />
          )}
          {actionLink && (
            <Link
              href={actionLink.href}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              {actionLink.label}
            </Link>
          )}
        </div>
      )}

      {/* Trigger Bar */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-white hover:bg-slate-50/80 border rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-all shadow-2xs cursor-pointer ${
          isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/15"
            : "border-slate-200 hover:border-slate-300"
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {activeItem ? (
            <>
              <span className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                {activeItem.title}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600 shrink-0">
                {activeItem.platform}
              </span>
              <span className="text-xs font-mono font-bold text-slate-800 tabular-nums shrink-0">
                {formatRp(activeItem.price)}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border tabular-nums shrink-0 ${getMarginBadgeClass(
                  activeItem.marginPct
                )}`}
              >
                {activeItem.marginPct.toFixed(1)}%
              </span>
            </>
          ) : selectedGameId === "custom" ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                Manual / Custom
              </span>
              <span className="text-xs font-medium text-slate-700 truncate">
                {selectedGameTitle || "Input Game Baru"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline-flex text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/80">
            Cari dari {normalizedGames.length} game...
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-emerald-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Portal Dropdown */}
      {mounted && dropdownPanel ? createPortal(dropdownPanel, document.body) : null}
    </div>
  );
}

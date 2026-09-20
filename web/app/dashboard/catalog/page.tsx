"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Store, ShieldCheck, DollarSign, TrendingUp, AlertTriangle, 
  ExternalLink, ChevronRight, ArrowLeft, Plus, RefreshCw, 
  Check, Filter, Search, Sliders, ChevronDown, ChevronUp,
  Cpu, Trash2, ArrowUpRight, ShieldAlert, Sparkles, Star,
  Award, QrCode, Zap, Layers, BarChart3, CheckCircle2, Clock, Save,
  Pencil, FileText, Download, Upload, Database
} from 'lucide-react';
import { getG2GSellerUrl, getG2GGameCategoryUrl } from '@/lib/g2g';

interface Seller {
  seller_id: string;
  seller_name: string;
  rating_pct: number;
  reviews_count: number;
  price_g2g_idr: number;
  delivery_speed: string;
  stock: number;
  risk_score: number;
  is_recommended: boolean;
  profile_url?: string;
  tier?: 'ultra_safe' | 'lowest_price' | 'mid_level' | string;
  tier_label?: string;
  tier_desc?: string;
  qris_fee_idr?: number;
  cogs_net_idr?: number;
  net_profit_idr?: number;
  net_margin_pct?: number;
}

interface CatalogGame {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  target_margin_pct: number;
  status: string;
  selected_seller_id: string;
  sellers: Seller[];
  metrics?: {
    selected_seller: Seller;
    cogs_g2g_idr: number;
    qris_fee_idr: number;
    cogs_net_idr: number;
    shopee_fee_idr: number;
    packaging_cost_idr: number;
    total_cost_idr: number;
    net_profit_idr: number;
    net_margin_pct: number;
    break_even_price_idr: number;
  };
}

export default function CatalogDashboardPage() {
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({});
  const [drawerTierFilter, setDrawerTierFilter] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const getValidSellerUrl = (seller?: Seller, gameTitle?: string) => {
    if (seller?.profile_url && !seller.profile_url.includes("search?q=") && !seller.profile_url.includes("/search")) {
      return seller.profile_url;
    }
    return getG2GSellerUrl(seller?.seller_name || "", gameTitle);
  };

  const [daemonInfo, setDaemonInfo] = useState<{
    status: string;
    last_heartbeat: string;
    interval_minutes: number;
    health: string;
    summary: string;
  } | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState('Steam');
  const [newCategory, setNewCategory] = useState('Digital Key / Account');
  const [newSellingPrice, setNewSellingPrice] = useState(250000);
  const [newTargetMargin, setNewTargetMargin] = useState(25);
  const [newSellerName, setNewSellerName] = useState('HellenWong');
  const [newSellerPrice, setNewSellerPrice] = useState(186000);
  const [newSellerRating, setNewSellerRating] = useState(99.8);
  const [newSellerReviews, setNewSellerReviews] = useState(32450);

  const [isResearching, setIsResearching] = useState(false);
  const [researchSummary, setResearchSummary] = useState('');
  const [researchedSellers, setResearchedSellers] = useState<Seller[]>([]);

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = useState<number>(0);

  const [drawerAddSellerGameId, setDrawerAddSellerGameId] = useState<string | null>(null);
  const [drawerSellerName, setDrawerSellerName] = useState('');
  const [drawerSellerPrice, setDrawerSellerPrice] = useState(150000);
  const [drawerSellerRating, setDrawerSellerRating] = useState(99.5);
  const [drawerSellerReviews, setDrawerSellerReviews] = useState(5000);
  const [drawerSellerTier, setDrawerSellerTier] = useState<'ultra_safe' | 'lowest_price' | 'mid_level'>('mid_level');
  const [drawerSetSelected, setDrawerSetSelected] = useState(true);
  const [isSubmittingDrawerSeller, setIsSubmittingDrawerSeller] = useState(false);

  // Permanent persistence synchronization across localStorage & serverless API
  const syncAndSaveGames = (nextGames: CatalogGame[]) => {
    setGames(nextGames);
    try {
      localStorage.setItem('akshara_custom_catalog_v2', JSON.stringify(nextGames));
      // Proactively keep serverless warm with latest state
      fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextGames)
      }).catch(() => {});
    } catch (e) {}
  };

  const handleAddSellerToGame = async (gameId: string, gameTitle: string) => {
    if (!drawerSellerName.trim()) return;
    setIsSubmittingDrawerSeller(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          new_seller: {
            seller_name: drawerSellerName.trim(),
            price_g2g_idr: Number(drawerSellerPrice),
            rating_pct: Number(drawerSellerRating) || 99.5,
            reviews_count: Number(drawerSellerReviews) || 1000,
            delivery_speed: 'Instant Delivery',
            tier: drawerSellerTier,
            tier_label: drawerSellerTier === 'ultra_safe' ? '🛡️ TOP VERIFIED' : drawerSellerTier === 'lowest_price' ? '⚡ LOWEST PRICE' : '⚖️ MID-LEVEL',
            tier_desc: 'Seller kustom baru ditambahkan dari Catalog Radar.',
            is_recommended: false,
            profile_url: getG2GSellerUrl(drawerSellerName.trim(), gameTitle)
          },
          set_selected: drawerSetSelected
        })
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        const next = games.map(g => g.id === gameId ? updated : g);
        syncAndSaveGames(next);
        setDrawerAddSellerGameId(null);
        setDrawerSellerName('');
        showToast(`✅ Seller "${drawerSellerName}" berhasil ditambahkan ke ${gameTitle} & tersimpan permanen!`);
      } else {
        showToast('Gagal menambahkan seller.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmittingDrawerSeller(false);
    }
  };

  const handleDeleteSellerFromGame = async (gameId: string, sellerId: string, sellerName: string) => {
    if (!confirm(`Hapus seller "${sellerName}" dari game ini?`)) return;
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          delete_seller_id: sellerId
        })
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        const next = games.map(g => g.id === gameId ? updated : g);
        syncAndSaveGames(next);
        showToast(`Seller "${sellerName}" telah dihapus.`);
      }
    } catch (e) {
      showToast('Gagal menghapus seller.', 'error');
    }
  };

  const [editingSellerData, setEditingSellerData] = useState<{
    gameId: string;
    gameTitle: string;
    sellerId: string;
    sellerName: string;
    priceG2gIdr: number;
    tier: 'ultra_safe' | 'lowest_price' | 'mid_level';
    ratingPct: number;
    reviewsCount: number;
    deliverySpeed: string;
    profileUrl: string;
    isSelected: boolean;
  } | null>(null);
  const [isSubmittingEditSeller, setIsSubmittingEditSeller] = useState(false);

  const handleSaveEditSeller = async () => {
    if (!editingSellerData || !editingSellerData.sellerName.trim()) return;
    setIsSubmittingEditSeller(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_seller',
          game_id: editingSellerData.gameId,
          edit_seller: {
            seller_id: editingSellerData.sellerId,
            seller_name: editingSellerData.sellerName.trim(),
            price_g2g_idr: Number(editingSellerData.priceG2gIdr),
            tier: editingSellerData.tier,
            rating_pct: Number(editingSellerData.ratingPct),
            reviews_count: Number(editingSellerData.reviewsCount),
            delivery_speed: editingSellerData.deliverySpeed || 'Instant Delivery',
            profile_url: editingSellerData.profileUrl || getG2GSellerUrl(editingSellerData.sellerName.trim(), editingSellerData.gameTitle),
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        const next = games.map(g => g.id === editingSellerData.gameId ? updated : g);
        syncAndSaveGames(next);
        showToast(`✅ Seller "${editingSellerData.sellerName}" berhasil diperbarui & disimpan permanen!`);
        setEditingSellerData(null);
      } else {
        showToast('Gagal memperbarui data seller.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi.', 'error');
    } finally {
      setIsSubmittingEditSeller(false);
    }
  };

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      // 1. Instant hydration from localStorage
      let localGames: CatalogGame[] = [];
      try {
        const stored = localStorage.getItem('akshara_custom_catalog_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localGames = parsed;
            setGames(parsed);
          }
        }
      } catch (e) {}

      // 2. Fetch server catalog
      const res = await fetch('/api/catalog');
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        const serverGames: CatalogGame[] = json.data;

        if (localGames.length > 0) {
          // Merge: Preserve user-added games that server might have lost on cold-start
          const merged = [...serverGames];
          for (const localG of localGames) {
            const idx = merged.findIndex(s => s.id === localG.id || s.title.toLowerCase().trim() === localG.title.toLowerCase().trim());
            if (idx === -1) {
              merged.unshift(localG);
            } else {
              // If local has custom sellers or different price, prefer local
              if (localG.selling_price_shopee_idr !== merged[idx].selling_price_shopee_idr || (localG.sellers && localG.sellers.length > merged[idx].sellers.length)) {
                merged[idx] = localG;
              }
            }
          }
          syncAndSaveGames(merged);
        } else {
          syncAndSaveGames(serverGames);
        }
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDaemonStatus = async () => {
    try {
      const res = await fetch('/api/daemon');
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setDaemonInfo(json.data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchDaemonStatus();
    const interval = setInterval(fetchDaemonStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const toggleExpand = (gameId: string) => {
    setExpandedGames(prev => ({
      ...prev,
      [gameId]: !prev[gameId]
    }));
  };

  const handleSwitchSeller = async (gameId: string, sellerId: string) => {
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          selected_seller_id: sellerId
        })
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        const next = games.map(g => g.id === gameId ? updated : g);
        syncAndSaveGames(next);
        showToast('Supplier G2G berhasil dialihkan! Margin laba telah diperbarui.');
      } else {
        showToast('Gagal mengubah supplier.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi.', 'error');
    }
  };

  const handleSavePrice = async (gameId: string) => {
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          selling_price_shopee_idr: editingPriceVal
        })
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        const next = games.map(g => g.id === gameId ? updated : g);
        syncAndSaveGames(next);
        setEditingPriceId(null);
        showToast('Harga jual Shopee berhasil diperbarui.');
      } else {
        showToast('Gagal memperbarui harga.', 'error');
      }
    } catch (e) {
      showToast('Gagal memperbarui harga.', 'error');
    }
  };

  const handleDeleteGame = async (gameId: string, title: string) => {
    if (!confirm(`Hapus "${title}" dari Radar Portofolio?`)) return;
    try {
      const next = games.filter(g => g.id !== gameId);
      syncAndSaveGames(next);
      await fetch(`/api/catalog?id=${gameId}`, { method: 'DELETE' });
      showToast(`Game "${title}" telah dihapus.`);
    } catch (e) {
      showToast('Gagal menghapus game.', 'error');
    }
  };

  const handleAutoResearch = async () => {
    if (!newTitle.trim()) return;
    setIsResearching(true);
    setResearchSummary('');
    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newTitle, platform: newPlatform })
      });
      const json = await res.json();
      if (json.status === 'success' && json.recommendations) {
        const rec = json.recommendations;
        if (rec.title) setNewTitle(rec.title);
        setNewPlatform(rec.platform);
        setNewCategory(rec.category);
        setNewSellingPrice(rec.selling_price_shopee_idr);
        setNewTargetMargin(rec.target_margin_pct);
        if (rec.sellers && rec.sellers.length > 0) {
          setResearchedSellers(rec.sellers);
          const top = rec.sellers[0];
          setNewSellerName(top.seller_name);
          setNewSellerPrice(top.price_g2g_idr);
          setNewSellerRating(top.rating_pct);
          setNewSellerReviews(top.reviews_count);
        }
        setResearchSummary(rec.summary);
      }
    } catch (e) {
      console.error('Auto research error:', e);
    } finally {
      setIsResearching(false);
    }
  };

  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(games, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `akshara_catalog_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("💾 File backup katalog berhasil diunduh!");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          syncAndSaveGames(parsed);
          showToast(`📥 Berhasil memulihkan ${parsed.length} game dari backup!`);
        } else {
          showToast("Format file JSON tidak valid.", "error");
        }
      } catch (err) {
        showToast("Gagal membaca file JSON.", "error");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const payload = {
      action: 'add',
      title: newTitle,
      platform: newPlatform,
      category: newCategory,
      selling_price_shopee_idr: Number(newSellingPrice),
      target_margin_pct: Number(newTargetMargin),
      selected_seller_id: researchedSellers.length > 0 ? researchedSellers[0].seller_id : 'G2G-INIT-01',
      sellers: researchedSellers.length > 0 ? researchedSellers : [
        {
          seller_id: 'G2G-INIT-01',
          seller_name: newSellerName,
          rating_pct: Number(newSellerRating),
          reviews_count: Number(newSellerReviews),
          price_g2g_idr: Number(newSellerPrice),
          delivery_speed: 'Instant Delivery',
          stock: 25,
          risk_score: 0,
          is_recommended: true,
          profile_url: 'https://www.g2g.com/id'
        }
      ]
    };

    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        const createdGame = json.data;
        if (createdGame) {
          const next = [createdGame, ...games.filter(g => g.id !== createdGame.id && g.title.toLowerCase().trim() !== createdGame.title.toLowerCase().trim())];
          syncAndSaveGames(next);
        }
        setShowAddModal(false);
        setNewTitle('');
        setResearchedSellers([]);
        setResearchSummary('');
        showToast(`Game "${newTitle}" berhasil ditambahkan & tersimpan permanen!`);
      } else {
        showToast('Gagal menambahkan game baru ke server.', 'error');
      }
    } catch (e) {
      showToast('Gagal menambahkan game baru.', 'error');
    }
  };

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };
  const formatNum = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
  };

  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            g.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            g.sellers.some(s => s.seller_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPlatform = selectedPlatform === 'ALL' || g.platform.toLowerCase().includes(selectedPlatform.toLowerCase());
      return matchesSearch && matchesPlatform;
    });
  }, [games, searchQuery, selectedPlatform]);

  const portfolioStats = useMemo(() => {
    const count = games.length;
    let totalGMVPotential = 0;
    let totalNetProfit = 0;
    let totalMarginSum = 0;

    games.forEach(g => {
      totalGMVPotential += g.selling_price_shopee_idr;
      if (g.metrics) {
        totalNetProfit += g.metrics.net_profit_idr;
        totalMarginSum += g.metrics.net_margin_pct;
      }
    });

    const avgMargin = count > 0 ? totalMarginSum / count : 0;

    return {
      count,
      totalGMVPotential,
      totalNetProfit,
      avgMargin
    };
  }, [games]);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">
      
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/30 text-sm text-emerald-300 font-mono flex items-center gap-3 shadow-xl backdrop-blur-md">
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
          <span className={notification.type === 'error' ? 'text-rose-300' : ''}>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">&times;</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors">
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-slate-400">Catalog Radar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Store className="w-5 h-5 text-amber-400" />
            </div>
            The Catalog — Autonomous Radar
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Daftar lengkap seluruh game yang dijual Akshara Gaming Center. Sistem memantau dan membandingkan beberapa seller di g2g.com/id sekaligus, menghitung otomatis fee QRIS 0.7% dan potongan Shopee.
          </p>
          <div className="flex items-center gap-2 mt-4 text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-slate-400">
              Radar Daemon: <strong className="text-amber-400 font-semibold">{daemonInfo?.status || 'RUNNING (5m)'}</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">
              {daemonInfo?.last_heartbeat ? daemonInfo.last_heartbeat.split(' ')[1] : 'Otomatis'}
            </span>
            <button
              onClick={fetchCatalog}
              disabled={loading}
              className="ml-2 p-1 rounded-md text-slate-500 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-xs font-mono flex items-center gap-1.5 transition-all">
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Restore JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportBackup}
            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-xs font-mono flex items-center gap-1.5 transition-all"
            title="Unduh cadangan data katalog JSON"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Backup JSON</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="v0-btn-primary whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Game Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="v0-card rounded-2xl p-5 border-amber-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold">Portofolio Game</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">{portfolioStats.count}</div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.06]">Judul Game Aktif</div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-amber-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold">Nilai Portofolio</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">{formatRp(portfolioStats.totalGMVPotential)}</div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.06]">1 Unit per Game</div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-amber-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">Total Laba Bersih</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">{formatRp(portfolioStats.totalNetProfit)}</div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.06]">Setelah fee Shopee & QRIS</div>
        </div>

        <div className="v0-card rounded-2xl p-5 border-amber-500/20 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold">Avg Margin</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">{formatNum(portfolioStats.avgMargin)}%</div>
          <div className="text-[10px] font-mono text-slate-600 mt-3 pt-2.5 border-t border-white/[0.06]">Target minimal: 15%</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari judul game, platform, atau seller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 bg-zinc-950/80 border border-zinc-800 rounded-xl pr-4 py-3 text-sm font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950/60 border border-white/[0.06] overflow-x-auto w-full md:w-auto">
          {['ALL', 'Steam', 'Microsoft', 'Rockstar', 'EA', 'Trade'].map((plat) => (
            <button
              key={plat}
              onClick={() => setSelectedPlatform(plat)}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all whitespace-nowrap ${
                selectedPlatform === plat 
                  ? 'bg-white/10 text-white border border-white/[0.1]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}>
              {plat === 'ALL' ? 'Semua' : plat}
            </button>
          ))}
        </div>
      </div>

      <div className="v0-card rounded-2xl p-5 border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white mb-1">Strategi Sourcing 3-Tier G2G</div>
            <p className="text-xs text-slate-500">Tidak berpatok hanya pada 1 seller atau seller raksasa.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">Tier 1: 🛡️ Top Verified</span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">Tier 2: ⚡ Lowest Price</span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">Tier 3: ⚖️ Mid-Level / Baru</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="v0-card rounded-2xl h-24 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-24 animate-pulse bg-white/[0.02]" />
          <div className="v0-card rounded-2xl h-24 animate-pulse bg-white/[0.02]" />
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="v0-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Store className="w-8 h-8 text-slate-600" />
          <div className="text-slate-300 font-medium">Tidak ada game yang sesuai pencarian</div>
          <p className="text-xs text-slate-500">Coba kata kunci lain atau tambahkan game baru.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGames.map((game) => {
            const metrics = game.metrics;
            const selectedSeller = game.sellers.find(s => s.seller_id === game.selected_seller_id) || game.sellers[0];
            const isExpanded = !!expandedGames[game.id];
            const netProfit = metrics?.net_profit_idr ?? 0;
            const netMargin = metrics?.net_margin_pct ?? 0;

            return (
              <div 
                key={game.id}
                className="v0-card rounded-2xl overflow-hidden card-division-catalog group transition-all"
              >
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                        {game.platform}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                        {game.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {game.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        Supplier:{" "}
                        <a
                          href={getValidSellerUrl(selectedSeller, game.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          {selectedSeller?.seller_name}
                          <ExternalLink className="w-3 h-3 text-amber-500/70" />
                        </a>
                      </span>
                      <span>•</span>
                      <span>★ {selectedSeller?.rating_pct}% ({selectedSeller?.reviews_count.toLocaleString('id-ID')} ulasan)</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 lg:gap-6 justify-between lg:justify-end">
                    
                    <div className="space-y-0.5 text-right font-mono">
                      <div className="text-[11px] text-slate-500">Harga Jual Shopee</div>
                      {editingPriceId === game.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editingPriceVal}
                            onChange={(e) => setEditingPriceVal(Number(e.target.value))}
                            className="w-28 px-2 py-0.5 rounded bg-zinc-950 border border-amber-500 text-amber-400 text-xs font-mono text-right outline-none"
                          />
                          <button
                            onClick={() => handleSavePrice(game.id)}
                            className="p-1 rounded bg-amber-500 text-zinc-950 hover:bg-amber-400"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => {
                            setEditingPriceId(game.id);
                            setEditingPriceVal(game.selling_price_shopee_idr);
                          }}
                          className="text-sm font-bold text-white hover:text-amber-400 cursor-pointer flex items-center justify-end gap-1 group/price"
                          title="Klik untuk ubah harga"
                        >
                          <span>{formatRp(game.selling_price_shopee_idr)}</span>
                          <Sliders className="w-3 h-3 text-slate-600 group-hover/price:text-amber-400 transition-colors" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 text-right font-mono hidden sm:block">
                      <div className="text-[11px] text-slate-500">Modal Bersih (+0.7%)</div>
                      <div className="text-sm text-slate-300">
                        {metrics ? formatRp(metrics.cogs_net_idr) : '-'}
                      </div>
                    </div>

                    <div className="space-y-0.5 text-right font-mono">
                      <div className="text-[11px] text-slate-500">Laba Bersih</div>
                      <div className={`text-sm font-bold ${netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatRp(netProfit)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block text-xs font-bold font-mono px-2.5 py-1 rounded-md border ${
                        netMargin >= 20 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        netMargin >= 10 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {formatNum(netMargin)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      <Link
                        href={`/dashboard/description?game=${encodeURIComponent(game.title)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 transition-all"
                        title="Buat Deskripsi Shopee untuk game ini"
                      >
                        <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span className="hidden sm:inline">Deskripsi</span>
                      </Link>

                      <button
                        onClick={() => toggleExpand(game.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                          isExpanded 
                            ? 'bg-white/10 text-white border border-white/20' 
                            : 'bg-zinc-950/50 hover:bg-white/5 text-slate-300 border border-white/5'
                        }`}
                      >
                        <span>{game.sellers.length} Seller</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleDeleteGame(game.id, game.title)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Hapus game"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-5 bg-black/20 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                          Multi-Seller Radar G2G.com/id
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-lg border border-white/5">
                          <button
                            onClick={() => setDrawerTierFilter(prev => ({ ...prev, [game.id]: 'ALL' }))}
                            className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                              (drawerTierFilter[game.id] || 'ALL') === 'ALL'
                                ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Semua ({game.sellers.length})
                          </button>
                          <button
                            onClick={() => setDrawerTierFilter(prev => ({ ...prev, [game.id]: 'ultra_safe' }))}
                            className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                              drawerTierFilter[game.id] === 'ultra_safe'
                                ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-400 hover:text-emerald-400'
                            }`}
                          >
                            <span>🛡️ Top</span>
                          </button>
                          <button
                            onClick={() => setDrawerTierFilter(prev => ({ ...prev, [game.id]: 'lowest_price' }))}
                            className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                              drawerTierFilter[game.id] === 'lowest_price'
                                ? 'bg-amber-500/10 text-amber-400' : 'text-slate-400 hover:text-amber-400'
                            }`}
                          >
                            <span>⚡ Low</span>
                          </button>
                          <button
                            onClick={() => setDrawerTierFilter(prev => ({ ...prev, [game.id]: 'mid_level' }))}
                            className={`px-3 py-1 rounded-md text-xs font-mono transition-all flex items-center gap-1 ${
                              drawerTierFilter[game.id] === 'mid_level'
                                ? 'bg-purple-500/10 text-purple-400' : 'text-slate-400 hover:text-purple-400'
                            }`}
                          >
                            <span>⚖️ Mid</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDrawerAddSellerGameId(drawerAddSellerGameId === game.id ? null : game.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 flex items-center gap-1.5 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{drawerAddSellerGameId === game.id ? 'Tutup' : 'Tambah Seller'}</span>
                        </button>
                      </div>
                    </div>

                    {drawerAddSellerGameId === game.id && (
                      <div className="p-4 rounded-xl bg-zinc-950/80 border border-amber-500/30 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Plus className="w-4 h-4" /> Tambah Seller G2G Baru
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Nama Toko G2G</label>
                            <input
                              type="text"
                              value={drawerSellerName}
                              onChange={(e) => setDrawerSellerName(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Harga Modal G2G (IDR)</label>
                            <input
                              type="number"
                              value={drawerSellerPrice}
                              onChange={(e) => setDrawerSellerPrice(Number(e.target.value))}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Strategi Tier</label>
                            <select
                              value={drawerSellerTier}
                              onChange={(e: any) => setDrawerSellerTier(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                            >
                              <option value="ultra_safe">🛡️ Top Verified</option>
                              <option value="lowest_price">⚡ Lowest Price</option>
                              <option value="mid_level">⚖️ Mid-Level / Baru</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] text-slate-400 block mb-1">Rating % & Ulasan</label>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                step="0.1"
                                value={drawerSellerRating}
                                onChange={(e) => setDrawerSellerRating(Number(e.target.value))}
                                className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200 text-center font-mono focus:outline-none"
                              />
                              <input
                                type="number"
                                value={drawerSellerReviews}
                                onChange={(e) => setDrawerSellerReviews(Number(e.target.value))}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200 text-right font-mono focus:outline-none"
                                placeholder="Ulasan"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={drawerSetSelected}
                              onChange={(e) => setDrawerSetSelected(e.target.checked)}
                              className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
                            />
                            <span>Jadikan seller aktif langsung</span>
                          </label>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setDrawerAddSellerGameId(null)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-slate-300 text-xs hover:text-white transition-colors"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSellerToGame(game.id, game.title)}
                              disabled={isSubmittingDrawerSeller || !drawerSellerName.trim()}
                              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isSubmittingDrawerSeller ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              <span>Simpan</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-xl border border-white/5">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-white/5 border-b border-white/5">
                          <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Tier</th>
                            <th className="px-4 py-3 font-semibold">Seller G2G</th>
                            <th className="px-4 py-3 font-semibold">Reputasi</th>
                            <th className="px-4 py-3 font-semibold">Harga (IDR)</th>
                            <th className="px-4 py-3 font-semibold">Laba Bersih</th>
                            <th className="px-4 py-3 font-semibold">Margin</th>
                            <th className="px-4 py-3 font-semibold text-right">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-zinc-950/30">
                          {game.sellers
                            .filter(s => {
                              const currentFilter = drawerTierFilter[game.id] || 'ALL';
                              if (currentFilter === 'ALL') return true;
                              return s.tier === currentFilter;
                            })
                            .map((s) => {
                              const isSelected = s.seller_id === game.selected_seller_id;
                              const qris = Math.round(s.price_g2g_idr * 0.007);
                              const netCost = s.price_g2g_idr + qris + Math.round(game.selling_price_shopee_idr * 0.08) + 1000 + 2000;
                              const profit = game.selling_price_shopee_idr - netCost;
                              const margin = game.selling_price_shopee_idr > 0 ? (profit / game.selling_price_shopee_idr) * 100 : 0;

                              return (
                                <tr key={s.seller_id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
                                  <td className="px-4 py-3">
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                                        <Check className="w-3 h-3" /> AKTIF
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 text-[10px]">STANDBY</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {s.tier === 'ultra_safe' ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🛡️ TOP</span>
                                    ) : s.tier === 'lowest_price' ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">⚡ LOW</span>
                                    ) : s.tier === 'mid_level' ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">⚖️ MID</span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10">STD</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={getValidSellerUrl(s, game.title)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-200 hover:text-amber-400 font-semibold inline-flex items-center gap-1 transition-colors"
                                      >
                                        <span>{s.seller_name}</span>
                                        <ExternalLink className="w-3 h-3 text-slate-500" />
                                      </a>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-300">
                                    ★ {s.rating_pct}% <span className="text-slate-500">({s.reviews_count.toLocaleString('id-ID')})</span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-200 font-semibold">
                                    {formatRp(s.price_g2g_idr)}
                                  </td>
                                  <td className={`px-4 py-3 font-bold ${profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatRp(profit)}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={margin >= 20 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                                      {formatNum(margin)}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {/* Edit Seller Button */}
                                      <button
                                        type="button"
                                        onClick={() => setEditingSellerData({
                                          gameId: game.id,
                                          gameTitle: game.title,
                                          sellerId: s.seller_id,
                                          sellerName: s.seller_name,
                                          priceG2gIdr: s.price_g2g_idr,
                                          tier: (s.tier as any) || 'mid_level',
                                          ratingPct: s.rating_pct,
                                          reviewsCount: s.reviews_count,
                                          deliverySpeed: s.delivery_speed || 'Instant Delivery',
                                          profileUrl: s.profile_url || '',
                                          isSelected
                                        })}
                                        className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                        title="Edit detail seller ini"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>

                                      {isSelected ? (
                                        <span className="text-[11px] text-amber-400 font-medium px-1">Dipakai</span>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleSwitchSeller(game.id, s.seller_id)}
                                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-zinc-950 text-white text-xs font-medium transition-all"
                                          >
                                            Pilih
                                          </button>
                                          {game.sellers.length > 1 && (
                                            <button
                                              onClick={() => handleDeleteSellerFromGame(game.id, s.seller_id, s.seller_name)}
                                              className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                                              title="Hapus seller"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* EDIT SELLER MODAL */}
      {editingSellerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="v0-card rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl border-amber-500/30 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono">
                <Pencil className="w-4 h-4" />
                <span>Edit Seller G2G — {editingSellerData.gameTitle}</span>
              </div>
              <button
                onClick={() => setEditingSellerData(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Nama Toko G2G</label>
                <input
                  type="text"
                  value={editingSellerData.sellerName}
                  onChange={(e) => setEditingSellerData({ ...editingSellerData, sellerName: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Harga Modal G2G (IDR)</label>
                  <input
                    type="number"
                    value={editingSellerData.priceG2gIdr}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, priceG2gIdr: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Strategi Tier</label>
                  <select
                    value={editingSellerData.tier}
                    onChange={(e: any) => setEditingSellerData({ ...editingSellerData, tier: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="ultra_safe">🛡️ Top Verified</option>
                    <option value="lowest_price">⚡ Lowest Price</option>
                    <option value="mid_level">⚖️ Mid-Level / Baru</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Rating Toko (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingSellerData.ratingPct}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, ratingPct: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Total Ulasan</label>
                  <input
                    type="number"
                    value={editingSellerData.reviewsCount}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, reviewsCount: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Kecepatan Pengiriman</label>
                <input
                  type="text"
                  value={editingSellerData.deliverySpeed}
                  onChange={(e) => setEditingSellerData({ ...editingSellerData, deliverySpeed: e.target.value })}
                  placeholder="Instant Delivery"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">URL Profil / Tawaran G2G (Opsional)</label>
                <input
                  type="text"
                  value={editingSellerData.profileUrl}
                  onChange={(e) => setEditingSellerData({ ...editingSellerData, profileUrl: e.target.value })}
                  placeholder="https://www.g2g.com/id/categories/..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingSellerData(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 text-xs font-mono transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditSeller}
                disabled={isSubmittingEditSeller || !editingSellerData.sellerName.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-mono transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingEditSeller ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="v0-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border-white/10">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" /> Tambah Game
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-4 text-sm font-mono">
              <div className="space-y-1.5 font-sans">
                <label className="text-xs text-slate-400 font-medium">Nama Game Lengkap</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Monster Hunter Wilds"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAutoResearch();
                      }
                    }}
                    className="flex-1 bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAutoResearch}
                    disabled={isResearching || !newTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-sans flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isResearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Auto-Riset</span>
                  </button>
                </div>

                {researchSummary && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{researchSummary}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 font-sans">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Platform</label>
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none text-xs"
                  >
                    <option value="Steam">Steam</option>
                    <option value="PC / Microsoft">PC / Microsoft</option>
                    <option value="Rockstar / Steam">Rockstar Games</option>
                    <option value="EA App / PC">EA App / PC</option>
                    <option value="PlayStation 5">PlayStation 5</option>
                    <option value="Xbox Series X/S">Xbox Series</option>
                    <option value="Steam Trade">Steam Trade (Keys)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Kategori</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Harga Jual Shopee (IDR)</label>
                  <input
                    type="number"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(Number(e.target.value))}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Target Margin (%)</label>
                  <input
                    type="number"
                    value={newTargetMargin}
                    onChange={(e) => setNewTargetMargin(Number(e.target.value))}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-3">
                <div className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Data Supplier G2G:</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Nama Toko</label>
                    <input
                      type="text"
                      value={newSellerName}
                      onChange={(e) => setNewSellerName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Harga IDR</label>
                    <input
                      type="number"
                      value={newSellerPrice}
                      onChange={(e) => setNewSellerPrice(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Rating (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newSellerRating}
                      onChange={(e) => setNewSellerRating(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Ulasan</label>
                    <input
                      type="number"
                      value={newSellerReviews}
                      onChange={(e) => setNewSellerReviews(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-200 focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-sans transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="v0-btn-primary text-xs"
                >
                  Simpan Portofolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

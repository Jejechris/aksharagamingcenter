"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { fetchSmartCatalog } from "@/lib/catalogClient";
import Link from 'next/link';
import { 
  Store, ShieldCheck, DollarSign, TrendingUp, AlertTriangle, 
  ExternalLink, ChevronRight, ArrowLeft, Plus, RefreshCw, 
  Check, Filter, Search, Sliders, ChevronDown, ChevronUp,
  Cpu, Trash2, ArrowUpRight, ShieldAlert, Sparkles, Star,
  Award, QrCode, Zap, Layers, BarChart3, CheckCircle2, Clock, Save,
  Pencil, FileText, Download, Upload, Database, ShoppingBag
} from 'lucide-react';
import { getG2GSellerUrl, getG2GGameCategoryUrl, resolveG2GProductUrl } from '@/lib/g2g';
import { getEnebaSearchUrl } from '@/lib/eneba';
import ShopeeCompetitorModal from '@/app/components/ShopeeCompetitorModal';

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
  fallback_search_url?: string;
  offer_id?: string;
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

  const getValidSellerUrl = (seller?: Seller, gameTitle?: string, category?: string) => {
    const isEneba = seller?.profile_url?.includes('eneba.com') ||
                    seller?.seller_name?.toLowerCase().includes('eneba') ||
                    category?.toLowerCase().includes('key') ||
                    category?.toLowerCase().includes('cdkey');
    if (isEneba) {
      if (seller?.profile_url && seller.profile_url.includes('eneba.com')) {
        return seller.profile_url;
      }
      return getEnebaSearchUrl(gameTitle || '');
    }
    return resolveG2GProductUrl(
      seller?.profile_url || (seller as any)?.offer_id,
      seller?.seller_name,
      gameTitle
    );
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

  // Shopee Competitor Intelligence Modal State
  const [competitorModalGame, setCompetitorModalGame] = useState<{
    gameId: string;
    title: string;
    platform: string;
    price: number;
    cogs: number;
  } | null>(null);

  const handleApplyCompetitorPrice = async (newPrice: number) => {
    if (!competitorModalGame) return;
    const gId = competitorModalGame.gameId;
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gId,
          selling_price_shopee_idr: newPrice
        })
      });
      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        const next = games.map(g => g.id === gId ? updated : g);
        updateCatalogState(next);
        showToast(`✅ Harga Shopee "${competitorModalGame.title}" disesuaikan ke ${formatRp(newPrice)} berdasarkan rekomendasi kompetitor!`);
      } else {
        showToast('Gagal memperbarui harga.', 'error');
      }
    } catch (e) {
      showToast('Gagal memperbarui harga (kesalahan jaringan).', 'error');
    }
  };

  const [drawerAddSellerGameId, setDrawerAddSellerGameId] = useState<string | null>(null);
  const [drawerSellerName, setDrawerSellerName] = useState('');
  const [drawerSellerPrice, setDrawerSellerPrice] = useState(150000);
  const [drawerSellerRating, setDrawerSellerRating] = useState(99.5);
  const [drawerSellerReviews, setDrawerSellerReviews] = useState(5000);
  const [drawerSellerTier, setDrawerSellerTier] = useState<'ultra_safe' | 'lowest_price' | 'mid_level'>('mid_level');
  const [drawerSetSelected, setDrawerSetSelected] = useState(true);
  const [isSubmittingDrawerSeller, setIsSubmittingDrawerSeller] = useState(false);
  const [isSubmittingGame, setIsSubmittingGame] = useState(false);

  // Link Auto-Detector & Inspector State
  const [detectorUrl, setDetectorUrl] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedData, setDetectedData] = useState<any | null>(null);
  const [showDetectorModal, setShowDetectorModal] = useState(false);
  const [isApplyingDetected, setIsApplyingDetected] = useState(false);

  // Drawer link detector state
  const [drawerListingUrl, setDrawerListingUrl] = useState('');
  const [isDetectingDrawer, setIsDetectingDrawer] = useState(false);
  const [drawerDetectedStock, setDrawerDetectedStock] = useState<number | null>(null);
  const [drawerDetectedUrl, setDrawerDetectedUrl] = useState<string | null>(null);

  // Synchronize state & localStorage cleanly without redundant server writes
  const updateCatalogState = (nextGames: CatalogGame[]) => {
    setGames(nextGames);
    try {
      localStorage.setItem('akshara_custom_catalog_v2', JSON.stringify(nextGames));
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
            stock: drawerDetectedStock !== null ? drawerDetectedStock : 100,
            profile_url: drawerDetectedUrl || getG2GSellerUrl(drawerSellerName.trim(), gameTitle)
          },
          set_selected: drawerSetSelected
        })
      });

      if (res.ok) {
        const json = await res.json();
        const updated = json.data;
        const next = games.map(g => g.id === gameId ? updated : g);
        updateCatalogState(next);
        setDrawerAddSellerGameId(null);
        setDrawerSellerName('');
        setDrawerListingUrl('');
        setDrawerDetectedStock(null);
        setDrawerDetectedUrl(null);
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

  const handleDetectLink = async (targetUrl?: string) => {
    const urlToTest = (targetUrl !== undefined ? targetUrl : detectorUrl).trim();
    if (!urlToTest) {
      showToast('Harap masukkan URL listing G2G atau Eneba.', 'error');
      return;
    }
    try {
      setIsDetecting(true);
      setShowDetectorModal(true);
      const res = await fetch('/api/inventory/detect-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlToTest }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        setDetectedData(json.data);
        showToast(
          `✅ Berhasil deteksi: ${json.data.clean_title} • Stok Faktual G2G: ${json.data.real_stock.toLocaleString()} Unit`
        );
      } else {
        setDetectedData(null);
        showToast(json.message || 'Gagal mendeteksi link.', 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menghubungi server G2G SLS.', 'error');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDetectInDrawer = async (gameTitle: string) => {
    if (!drawerListingUrl.trim()) {
      showToast('Masukkan link listing G2G / Eneba terlebih dahulu.', 'error');
      return;
    }
    try {
      setIsDetectingDrawer(true);
      const res = await fetch('/api/inventory/detect-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: drawerListingUrl.trim() }),
      });
      const json = await res.json();
      if (json.status === 'success') {
        const d = json.data;
        if (d.seller_name) setDrawerSellerName(d.seller_name);
        if (d.price_idr) setDrawerSellerPrice(d.price_idr);
        if (d.rating_pct) setDrawerSellerRating(d.rating_pct);
        if (d.reviews_count) setDrawerSellerReviews(d.reviews_count);
        setDrawerDetectedStock(d.real_stock);
        setDrawerDetectedUrl(d.profile_url || drawerListingUrl.trim());
        showToast(`✅ Deteksi sukses: Toko ${d.seller_name} • Stok Real: ${d.real_stock.toLocaleString()} Unit!`);
      } else {
        showToast(json.message || 'Gagal mendeteksi link.', 'error');
      }
    } catch (e) {
      showToast('Gagal mendeteksi link seller.', 'error');
    } finally {
      setIsDetectingDrawer(false);
    }
  };

  const handleApplyDetectedToCatalog = async () => {
    if (!detectedData) return;
    try {
      setIsApplyingDetected(true);
      if (detectedData.matching_game_id) {
        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add_seller',
            game_id: detectedData.matching_game_id,
            new_seller: {
              seller_name: detectedData.seller_name,
              price_g2g_idr: detectedData.price_idr,
              rating_pct: detectedData.rating_pct,
              reviews_count: detectedData.reviews_count,
              delivery_speed: detectedData.delivery_speed,
              stock: detectedData.real_stock,
              is_recommended: true,
              profile_url: detectedData.profile_url,
              tier: 'mid_level',
              tier_label: '⚖️ Seller Live G2G',
              tier_desc: `Terdeteksi live dari G2G Offer ${detectedData.offer_id}`,
            },
            set_selected: true,
          }),
        });
        const json = await res.json();
        if (json.status === 'success') {
          const catRes = await fetch('/api/catalog');
          const catJson = await catRes.json();
          if (catJson.status === 'success' && Array.isArray(catJson.data)) {
            updateCatalogState(catJson.data);
          }
          showToast(
            `✅ Seller "${detectedData.seller_name}" dengan stok live ${detectedData.real_stock.toLocaleString()} unit berhasil diterapkan ke ${detectedData.matching_game_title}!`
          );
          setShowDetectorModal(false);
        } else {
          showToast(json.message || 'Gagal menerapkan seller.', 'error');
        }
      } else {
        const res = await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            title: detectedData.clean_title,
            platform: detectedData.platform,
            category: detectedData.category,
            selling_price_shopee_idr: detectedData.recommended_shopee_price_idr,
            target_margin_pct: 25,
            sellers: [
              {
                seller_name: detectedData.seller_name,
                price_g2g_idr: detectedData.price_idr,
                rating_pct: detectedData.rating_pct,
                reviews_count: detectedData.reviews_count,
                delivery_speed: detectedData.delivery_speed,
                stock: detectedData.real_stock,
                is_recommended: true,
                profile_url: detectedData.profile_url,
                tier: 'lowest_price',
                tier_label: '⚡ Lowest Live Price',
                tier_desc: `Penawaran live G2G Offer ${detectedData.offer_id}`,
              },
            ],
          }),
        });
        const json = await res.json();
        if (json.status === 'success') {
          const catRes = await fetch('/api/catalog');
          const catJson = await catRes.json();
          if (catJson.status === 'success' && Array.isArray(catJson.data)) {
            updateCatalogState(catJson.data);
          }
          showToast(
            `✅ Game baru "${detectedData.clean_title}" berhasil dibuat dengan stok live ${detectedData.real_stock.toLocaleString()} unit!`
          );
          setShowDetectorModal(false);
        } else {
          showToast(json.message || 'Gagal membuat produk baru.', 'error');
        }
      }
    } catch (err) {
      showToast('Terjadi kesalahan saat menerapkan produk.', 'error');
    } finally {
      setIsApplyingDetected(false);
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
        updateCatalogState(next);
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
        updateCatalogState(next);
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
      const mergedList = await fetchSmartCatalog();
      updateCatalogState(mergedList);
    } catch (err) {
      console.error(err);
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
        updateCatalogState(next);
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
        updateCatalogState(next);
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
      updateCatalogState(next);
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
          updateCatalogState(parsed);
          fetch('/api/catalog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          }).catch(() => {});
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
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) {
      showToast('Harap masukkan nama game lengkap terlebih dahulu!', 'error');
      return;
    }

    setIsSubmittingGame(true);
    const payload = {
      action: 'add',
      title: cleanTitle,
      platform: newPlatform,
      category: newCategory,
      selling_price_shopee_idr: Number(newSellingPrice) || 100000,
      target_margin_pct: Number(newTargetMargin) || 25,
      selected_seller_id: researchedSellers.length > 0 ? researchedSellers[0].seller_id : 'G2G-INIT-01',
      sellers: researchedSellers.length > 0 ? researchedSellers : [
        {
          seller_id: 'G2G-INIT-01',
          seller_name: newSellerName.trim() || 'G2G Seller',
          rating_pct: Number(newSellerRating) || 99.5,
          reviews_count: Number(newSellerReviews) || 1000,
          price_g2g_idr: Number(newSellerPrice) || 100000,
          delivery_speed: 'Instant Delivery',
          stock: 25,
          risk_score: 0,
          is_recommended: true,
          profile_url: 'https://www.g2g.com/categories/steam-global-account'
        }
      ]
    };

    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        const catRes = await fetch('/api/catalog');
        const catJson = await catRes.json();
        if (catJson.status === 'success' && Array.isArray(catJson.data)) {
          updateCatalogState(catJson.data);
        }
        setShowAddModal(false);
        setNewTitle('');
        setResearchedSellers([]);
        setResearchSummary('');
        showToast(`✅ Game "${cleanTitle}" berhasil ditambahkan ke Portofolio!`);
      } else {
        showToast(json.message || 'Gagal menambahkan game.', 'error');
      }
    } catch (e) {
      showToast('Terjadi kesalahan koneksi.', 'error');
    } finally {
      setIsSubmittingGame(false);
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* TOAST NOTIFICATION */}
        {notification && (
          <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-white border border-slate-200 text-slate-900 font-sans flex items-center gap-3 shadow-xl max-w-md animate-in fade-in slide-in-from-bottom-2">
            {notification.type === 'success' ? (
              <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1 rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            <span className="text-xs font-medium flex-1">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)} 
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              &times;
            </button>
          </div>
        )}

        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Command Deck
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-700">Radar Katalog</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <Store className="w-6 h-6 text-emerald-600" />
              Radar Katalog
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Daftar portofolio game aktif, perbandingan multi-seller G2G/Eneba, dan kalkulasi otomatis fee marketplace.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Daemon: <strong className="text-slate-800 font-semibold">{daemonInfo?.status || 'RUNNING (5m)'}</strong></span>
                <span className="text-slate-300">•</span>
                <span>{daemonInfo?.last_heartbeat ? daemonInfo.last_heartbeat.split(' ')[1] : 'Otomatis'}</span>
              </div>
              <button
                onClick={fetchCatalog}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Refresh Katalog"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Restore</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>

            <button
              onClick={handleExportBackup}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Backup</span>
            </button>

            <button
              onClick={() => setShowDetectorModal(true)}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Detektor Link</span>
            </button>

            <button
              onClick={() => {
                setNewTitle('');
                setResearchedSellers([]);
                setResearchSummary('');
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Game</span>
            </button>
          </div>
        </div>

        {/* 4 KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="app-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Portofolio Game</span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
              {portfolioStats.count}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Item terdaftar aktif</div>
          </div>

          <div className="app-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Nilai Portofolio (GMV)</span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
              {formatRp(portfolioStats.totalGMVPotential)}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Potensi omset total</div>
          </div>

          <div className="app-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Total Laba Bersih</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight tabular-nums">
              {formatRp(portfolioStats.totalNetProfit)}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Setelah fee Shopee & QRIS</div>
          </div>

          <div className="app-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Rata-rata Margin</span>
              <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
              {formatNum(portfolioStats.avgMargin)}%
            </div>
            <div className="text-[11px] text-slate-400 mt-2">Target minimal: 15%</div>
          </div>
        </div>

        {/* QUICK LINK DETECTOR BAR */}
        <div className="app-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 shrink-0">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Zap className="w-4 h-4" />
            </div>
            <span>DETEKTOR LIVE LINK:</span>
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste link listing G2G atau Eneba (contoh: https://www.g2g.com/.../offer/G1703129821471UK atau ID: G1703314890265KW)..."
              value={detectorUrl}
              onChange={(e) => setDetectorUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDetectLink()}
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
            <button
              onClick={() => handleDetectLink()}
              disabled={isDetecting || !detectorUrl.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isDetecting ? "Mendeteksi..." : "Deteksi Faktual"}</span>
            </button>
          </div>
        </div>

        {/* SEARCH & PLATFORM FILTERS */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari judul game, platform, atau supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60 overflow-x-auto w-full md:w-auto">
            {['ALL', 'Steam', 'Microsoft', 'Rockstar', 'EA', 'Trade'].map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  selectedPlatform === plat 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}>
                {plat === 'ALL' ? 'Semua Platform' : plat}
              </button>
            ))}
          </div>
        </div>

        {/* 3-TIER SOURCING STRATEGY BANNER */}
        <div className="app-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Strategi Multi-Supplier 3-Tier</div>
              <p className="text-[11px] text-slate-500">Mencegah ketergantungan pada 1 supplier tunggal dengan redundansi otomatis.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Tier 1: 🛡️ Top Verified</span>
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">Tier 2: ⚡ Lowest Price</span>
            <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">Tier 3: ⚖️ Mid-Level / Baru</span>
          </div>
        </div>

        {/* GAME LIST */}
        {loading ? (
          <div className="space-y-4">
            <div className="app-card h-28 animate-pulse bg-slate-100" />
            <div className="app-card h-28 animate-pulse bg-slate-100" />
            <div className="app-card h-28 animate-pulse bg-slate-100" />
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="app-card p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-slate-100 text-slate-400">
              <Store className="w-8 h-8" />
            </div>
            <div className="text-slate-800 font-semibold text-sm">
              {games.length === 0 ? "Portofolio Katalog Masih Kosong" : "Tidak ada game yang sesuai pencarian"}
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {games.length === 0 
                ? "Mulai tambahkan game jualan Anda ke sistem untuk otomatis menghubungkan simulasi laba di The Quant, template di AI Formatter, audit supplier di Risk Officer, dan pengiriman di Auto-Fulfillment." 
                : "Coba kata kunci lain atau ubah filter platform di atas."}
            </p>
            {games.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setNewTitle('');
                  setResearchedSellers([]);
                  setResearchSummary('');
                  setShowAddModal(true);
                }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Game Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGames.map((game) => {
              const metrics = game.metrics;
              const selectedSeller = game.sellers.find(s => s.seller_id === game.selected_seller_id) || game.sellers[0];
              const isExpanded = !!expandedGames[game.id];
              const netProfit = metrics?.net_profit_idr ?? 0;
              const netMargin = metrics?.net_margin_pct ?? 0;
              const isNegativeProfit = netMargin < 0;

              return (
                <div 
                  key={game.id}
                  className="app-card overflow-hidden hover:border-slate-300 transition-all shadow-sm"
                >
                  <div className="p-5 space-y-4">
                    {/* Top Row: Game Info & Financial Strip */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Title & Identity */}
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {game.platform}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-200">
                            {game.category}
                          </span>
                          {/* Stock status badge */}
                          {selectedSeller?.stock !== undefined && (
                            selectedSeller.stock <= 0 ? (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                Habis (0)
                              </span>
                            ) : selectedSeller.stock < 3 ? (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Stok Tipis ({selectedSeller.stock})
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Stok Aman ({selectedSeller.stock})
                              </span>
                            )
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          {game.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                          {selectedSeller?.profile_url?.includes("eneba.com") ||
                          selectedSeller?.seller_name?.toLowerCase().includes("eneba") ||
                          selectedSeller?.tier_label?.includes("ENEBA") ? (
                            <span className="flex items-center gap-1.5">
                              <span className="text-indigo-600 font-semibold">Supplier Eneba:</span>
                              <a
                                href={getValidSellerUrl(selectedSeller, game.title, game.category)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-700 hover:text-indigo-900 font-semibold inline-flex items-center gap-1 underline transition-colors"
                              >
                                {selectedSeller?.seller_name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span className="text-slate-600 font-semibold">Supplier Aktif:</span>
                              <a
                                href={getValidSellerUrl(selectedSeller, game.title, game.category)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 underline transition-colors"
                              >
                                {selectedSeller?.seller_name}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <span className="text-slate-400">({selectedSeller?.rating_pct}% • {selectedSeller?.reviews_count?.toLocaleString()} ulasan)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Financial Strip */}
                      <div className="flex flex-wrap items-center gap-3 font-mono">
                        {/* Inline Editable Selling Price */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right">
                          <div className="text-[10px] text-slate-500 font-sans uppercase tracking-wider">Harga Shopee</div>
                          {editingPriceId === game.id ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <input
                                type="number"
                                value={editingPriceVal}
                                onChange={(e) => setEditingPriceVal(Number(e.target.value))}
                                className="w-24 px-1.5 py-0.5 text-xs bg-white border border-emerald-500 rounded font-bold text-slate-900 text-right focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSavePrice(game.id)}
                                className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                title="Simpan Harga"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingPriceId(null)}
                                className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300"
                                title="Batal"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingPriceId(game.id);
                                setEditingPriceVal(game.selling_price_shopee_idr);
                              }}
                              className="text-sm font-bold text-slate-900 cursor-pointer hover:text-emerald-600 flex items-center justify-end gap-1 mt-0.5 tabular-nums"
                              title="Klik untuk ubah harga jual Shopee"
                            >
                              <span>{formatRp(game.selling_price_shopee_idr)}</span>
                              <Pencil className="w-3 h-3 text-slate-400" />
                            </div>
                          )}
                        </div>

                        {/* Modal Bersih */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right">
                          <div className="text-[10px] text-slate-500 font-sans uppercase tracking-wider">Modal Bersih</div>
                          <div className="text-sm font-semibold text-slate-700 mt-0.5 tabular-nums">
                            {formatRp(metrics?.cogs_net_idr || selectedSeller?.price_g2g_idr || 0)}
                          </div>
                        </div>

                        {/* Laba Bersih & Margin */}
                        <div className={`border rounded-xl px-3 py-2 text-right ${
                          isNegativeProfit 
                            ? 'bg-rose-50 border-rose-200 text-rose-700' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          <div className="text-[10px] font-sans uppercase tracking-wider opacity-80">
                            {isNegativeProfit ? 'Rugi Bersih' : 'Laba Bersih'}
                          </div>
                          <div className="text-sm font-bold mt-0.5 tabular-nums">
                            {formatRp(netProfit)}
                          </div>
                        </div>

                        {/* Margin % or Rugi Alert Badge */}
                        <div className="flex flex-col items-end justify-center">
                          {isNegativeProfit ? (
                            <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Rugi / Cek Modal ({formatNum(netMargin)}%)</span>
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border tabular-nums ${
                              netMargin >= 25 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }`}>
                              {formatNum(netMargin)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Row: Separated Clean Actions */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Quick Links */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/quant?game=${encodeURIComponent(game.id)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                          title="Simulasi laba & margin game ini di The Quant"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Quant</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setCompetitorModalGame({
                            gameId: game.id,
                            title: game.title,
                            platform: game.platform,
                            price: game.selling_price_shopee_idr,
                            cogs: selectedSeller?.price_g2g_idr || 0,
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors cursor-pointer"
                          title="Cek Radar Kompetitor Shopee & Rekomendasi Harga AI"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                          <span>Kompetitor</span>
                        </button>

                        <Link
                          href={`/dashboard/description?game=${encodeURIComponent(game.title)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
                          title="Buat Deskripsi Shopee untuk game ini"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                          <span>Deskripsi</span>
                        </Link>

                        <Link
                          href="/dashboard/autonomous"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors"
                          title="Kelola pengiriman otonom & stok buffer di Auto-Fulfillment"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          <span>Otonom</span>
                        </Link>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const url = selectedSeller?.fallback_search_url || selectedSeller?.profile_url || getValidSellerUrl(selectedSeller, game.title);
                            handleDetectLink(url);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          title="Inspeksi link asli & verifikasi stok live di G2G"
                        >
                          <Zap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Inspeksi Link</span>
                        </button>

                        <button
                          onClick={() => toggleExpand(game.id)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            isExpanded 
                              ? 'bg-slate-800 text-white' 
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <span>Lihat {game.sellers.length} Seller</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteGame(game.id, game.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus game"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MULTI-SELLER DRAWER */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 space-y-4 animate-in fade-in">
                      
                      {/* Drawer Header & Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">Daftar Supplier ({game.sellers.length})</span>
                          <span className="text-xs text-slate-400">•</span>
                          <div className="flex items-center gap-1">
                            {['ALL', 'ultra_safe', 'lowest_price', 'mid_level'].map((tier) => (
                              <button
                                key={tier}
                                onClick={() => setDrawerTierFilter(prev => ({ ...prev, [game.id]: tier }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                                  (drawerTierFilter[game.id] || 'ALL') === tier
                                    ? 'bg-white text-slate-900 shadow-xs border border-slate-300 font-semibold'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {tier === 'ALL' ? 'Semua' : tier === 'ultra_safe' ? 'Tier 1' : tier === 'lowest_price' ? 'Tier 2' : 'Tier 3'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (drawerAddSellerGameId === game.id) {
                                setDrawerAddSellerGameId(null);
                              } else {
                                setDrawerAddSellerGameId(game.id);
                                setDrawerSellerName('');
                                setDrawerSellerPrice(selectedSeller?.price_g2g_idr || 150000);
                                setDrawerListingUrl('');
                                setDrawerDetectedStock(null);
                                setDrawerDetectedUrl(null);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{drawerAddSellerGameId === game.id ? 'Tutup Form' : 'Tambah Seller Manual'}</span>
                          </button>
                        </div>
                      </div>

                      {/* ADD SELLER FORM IN DRAWER */}
                      {drawerAddSellerGameId === game.id && (
                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                          <div className="text-xs font-bold text-slate-900">Tambah Seller Baru untuk {game.title}</div>
                          
                          {/* Live detector inside drawer */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Paste URL listing G2G / Eneba untuk auto-fill data seller & stok live..."
                              value={drawerListingUrl}
                              onChange={(e) => setDrawerListingUrl(e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleDetectInDrawer(game.title)}
                              disabled={isDetectingDrawer || !drawerListingUrl.trim()}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              {isDetectingDrawer ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                              <span>Auto-Fill</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Nama Seller</label>
                              <input
                                type="text"
                                value={drawerSellerName}
                                onChange={(e) => setDrawerSellerName(e.target.value)}
                                placeholder="Contoh: DigitalZone"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Harga Modal G2G (Rp)</label>
                              <input
                                type="number"
                                value={drawerSellerPrice}
                                onChange={(e) => setDrawerSellerPrice(Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Rating (%)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={drawerSellerRating}
                                onChange={(e) => setDrawerSellerRating(Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Total Ulasan</label>
                              <input
                                type="number"
                                value={drawerSellerReviews}
                                onChange={(e) => setDrawerSellerReviews(Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={drawerSetSelected}
                                onChange={(e) => setDrawerSetSelected(e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Jadikan supplier utama langsung</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setDrawerAddSellerGameId(null)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-colors"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddSellerToGame(game.id, game.title)}
                                disabled={isSubmittingDrawerSeller || !drawerSellerName.trim()}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                              >
                                {isSubmittingDrawerSeller ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                <span>Simpan Seller</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SELLER TABLE */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                        <table className="w-full text-left text-xs font-mono min-w-[760px]">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Tier</th>
                              <th className="px-4 py-3">Seller</th>
                              <th className="px-4 py-3">Reputasi</th>
                              <th className="px-4 py-3">Stok Live</th>
                              <th className="px-4 py-3">Harga Beli</th>
                              <th className="px-4 py-3">Laba Bersih</th>
                              <th className="px-4 py-3">Margin</th>
                              <th className="px-4 py-3 text-right">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {game.sellers
                              .filter(s => {
                                const currentFilter = drawerTierFilter[game.id] || 'ALL';
                                if (currentFilter === 'ALL') return true;
                                return s.tier === currentFilter;
                              })
                              .map((s) => {
                                const isSelected = s.seller_id === game.selected_seller_id;
                                const isEneba = s.profile_url?.includes("eneba.com") || s.seller_name?.toLowerCase().includes("eneba") || s.tier_label?.includes("ENEBA");
                                
                                // Synced calculation without hardcoded +2000:
                                const qris = Math.round(s.price_g2g_idr * 0.007);
                                const shopeeFee = Math.round(game.selling_price_shopee_idr * 0.08) + 1000;
                                const packaging = 0; // Digital mode
                                const netCost = s.price_g2g_idr + qris + shopeeFee + packaging;
                                const netProfit = game.selling_price_shopee_idr - netCost;
                                const netMargin = game.selling_price_shopee_idr > 0 ? (netProfit / game.selling_price_shopee_idr) * 100 : 0;
                                const isLoss = netMargin < 0;

                                return (
                                  <tr 
                                    key={s.seller_id}
                                    className={`transition-colors ${
                                      isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    {/* Status */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {isSelected ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          <Check className="w-3 h-3" /> Utama
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-medium">Cadangan</span>
                                      )}
                                    </td>

                                    {/* Tier */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                        s.tier === 'ultra_safe'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : s.tier === 'lowest_price'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      }`}>
                                        {s.tier === 'ultra_safe' ? 'Tier 1' : s.tier === 'lowest_price' ? 'Tier 2' : 'Tier 3'}
                                      </span>
                                    </td>

                                    {/* Seller Name */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <a
                                        href={getValidSellerUrl(s, game.title, game.category)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-bold text-slate-900 hover:text-emerald-600 inline-flex items-center gap-1 transition-colors underline"
                                      >
                                        <span>{s.seller_name}</span>
                                        <ExternalLink className="w-3 h-3 text-slate-400" />
                                      </a>
                                    </td>

                                    {/* Rating */}
                                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                      {s.rating_pct}% <span className="text-slate-400">({s.reviews_count?.toLocaleString()})</span>
                                    </td>

                                    {/* Live Stock */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        s.stock <= 0 
                                          ? 'bg-rose-50 text-rose-700' 
                                          : s.stock < 3 
                                          ? 'bg-amber-50 text-amber-700' 
                                          : 'bg-emerald-50 text-emerald-700'
                                      }`}>
                                        {s.stock} Unit
                                      </span>
                                    </td>

                                    {/* Harga Modal */}
                                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800 tabular-nums">
                                      {formatRp(s.price_g2g_idr)}
                                    </td>

                                    {/* Laba Bersih */}
                                    <td className={`px-4 py-3 whitespace-nowrap font-bold tabular-nums ${
                                      isLoss ? 'text-rose-600' : 'text-emerald-600'
                                    }`}>
                                      {formatRp(netProfit)}
                                    </td>

                                    {/* Margin */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {isLoss ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                          Rugi / Cek Modal
                                        </span>
                                      ) : (
                                        <span className="font-bold text-slate-900 tabular-nums">
                                          {formatNum(netMargin)}%
                                        </span>
                                      )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
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
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                          title="Edit detail seller ini"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>

                                        {isSelected ? (
                                          <span className="text-[11px] text-emerald-700 font-semibold px-2 py-1">Aktif</span>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => handleSwitchSeller(game.id, s.seller_id)}
                                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 text-slate-700 text-xs font-medium transition-colors shadow-xs cursor-pointer"
                                            >
                                              Pilih
                                            </button>
                                            {game.sellers.length > 1 && (
                                              <button
                                                onClick={() => handleDeleteSellerFromGame(game.id, s.seller_id, s.seller_name)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="app-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl bg-white border-slate-200 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Pencil className="w-4 h-4 text-emerald-600" />
                  <span>Edit Seller — {editingSellerData.gameTitle}</span>
                </div>
                <button
                  onClick={() => setEditingSellerData(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nama Toko Supplier</label>
                  <input
                    type="text"
                    value={editingSellerData.sellerName}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, sellerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Harga Modal G2G (IDR)</label>
                    <input
                      type="number"
                      value={editingSellerData.priceG2gIdr}
                      onChange={(e) => setEditingSellerData({ ...editingSellerData, priceG2gIdr: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Tier Kategori</label>
                    <select
                      value={editingSellerData.tier}
                      onChange={(e) => setEditingSellerData({ ...editingSellerData, tier: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      <option value="ultra_safe">Tier 1: 🛡️ Top Verified</option>
                      <option value="lowest_price">Tier 2: ⚡ Lowest Price</option>
                      <option value="mid_level">Tier 3: ⚖️ Mid-Level / Baru</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Rating Persentase (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingSellerData.ratingPct}
                      onChange={(e) => setEditingSellerData({ ...editingSellerData, ratingPct: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Jumlah Ulasan / Transaksi</label>
                    <input
                      type="number"
                      value={editingSellerData.reviewsCount}
                      onChange={(e) => setEditingSellerData({ ...editingSellerData, reviewsCount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">URL Listing G2G / Offer Link</label>
                  <input
                    type="text"
                    value={editingSellerData.profileUrl}
                    onChange={(e) => setEditingSellerData({ ...editingSellerData, profileUrl: e.target.value })}
                    placeholder="https://www.g2g.com/.../offer/G..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono text-[11px] focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSellerData(null)}
                  disabled={isSubmittingEditSeller}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditSeller}
                  disabled={isSubmittingEditSeller || !editingSellerData.sellerName.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingEditSeller ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAMBAH GAME MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="app-card rounded-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl bg-white border-slate-200 text-slate-900 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" /> Tambah Game Baru
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-base"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateGame} className="space-y-4 text-xs font-sans">
                {/* Link Auto-Detector inside modal */}
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                  <label className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    Paste Link G2G / Eneba (Auto-Deteksi Otomatis)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: https://www.g2g.com/.../offer/G1703129821471UK..."
                      value={detectorUrl}
                      onChange={(e) => setDetectorUrl(e.target.value)}
                      className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!detectorUrl.trim()) return;
                        try {
                          setIsDetecting(true);
                          const res = await fetch("/api/inventory/detect-link", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: detectorUrl.trim() }),
                          });
                          const json = await res.json();
                          if (json.status === "success") {
                            const d = json.data;
                            setNewTitle(d.clean_title);
                            setNewPlatform(d.platform);
                            setNewCategory(d.category);
                            setNewSellerName(d.seller_name);
                            setNewSellerPrice(d.price_idr);
                            setNewSellerRating(d.rating_pct);
                            setNewSellerReviews(d.reviews_count);
                            setNewSellingPrice(d.recommended_shopee_price_idr);
                            showToast(`✅ Data terdeteksi otomatis! Stok Live: ${d.real_stock.toLocaleString()} Unit`);
                          } else {
                            showToast(json.message || "Gagal mendeteksi link.", "error");
                          }
                        } catch (e) {
                          showToast("Gagal mendeteksi link.", "error");
                        } finally {
                          setIsDetecting(false);
                        }
                      }}
                      disabled={isDetecting || !detectorUrl.trim()}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isDetecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Deteksi</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-700 font-medium">Nama Game Lengkap</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Monster Hunter Wilds"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAutoResearch}
                      disabled={isResearching || !newTitle.trim()}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isResearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-600" />}
                      <span>Riset AI</span>
                    </button>
                  </div>
                </div>

                {researchSummary && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
                    <div className="font-semibold flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-purple-600" /> Ringkasan Riset AI:
                    </div>
                    <p className="text-[11px] leading-relaxed text-purple-800">{researchSummary}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-medium">Platform</label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                    >
                      <option value="Steam">Steam</option>
                      <option value="Microsoft">Microsoft / Xbox</option>
                      <option value="Rockstar">Rockstar Games</option>
                      <option value="EA">EA Play / Origin</option>
                      <option value="Ubisoft">Ubisoft Connect</option>
                      <option value="Epic">Epic Games</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-medium">Kategori</label>
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-medium">Target Harga Jual Shopee (IDR)</label>
                    <input
                      type="number"
                      value={newSellingPrice}
                      onChange={(e) => setNewSellingPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-700 font-medium">Target Margin (%)</label>
                    <input
                      type="number"
                      value={newTargetMargin}
                      onChange={(e) => setNewTargetMargin(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Data Supplier Utama Awal</div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500">Nama Toko Supplier</label>
                      <input
                        type="text"
                        value={newSellerName}
                        onChange={(e) => setNewSellerName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Harga Modal (IDR)</label>
                      <input
                        type="number"
                        value={newSellerPrice}
                        onChange={(e) => setNewSellerPrice(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500">Rating (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newSellerRating}
                        onChange={(e) => setNewSellerRating(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Total Ulasan</label>
                      <input
                        type="number"
                        value={newSellerReviews}
                        onChange={(e) => setNewSellerReviews(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={isSubmittingGame}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGame || !newTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmittingGame ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyimpan Game...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Game</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SHOPEE COMPETITOR INTELLIGENCE MODAL */}
        {competitorModalGame && (
          <ShopeeCompetitorModal
            isOpen={!!competitorModalGame}
            onClose={() => setCompetitorModalGame(null)}
            gameTitle={competitorModalGame.title}
            platform={competitorModalGame.platform}
            currentPriceIdr={competitorModalGame.price}
            costG2gIdr={competitorModalGame.cogs}
            onApplyPrice={handleApplyCompetitorPrice}
          />
        )}

        {/* DETEKTOR LIVE LINK MODAL */}
        {showDetectorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="app-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl bg-white border-slate-200 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  <span>Detektor & Inspektur Live Link G2G / Eneba</span>
                </div>
                <button
                  onClick={() => setShowDetectorModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Input Bar */}
              <div className="space-y-2">
                <label className="text-xs text-slate-600 font-medium">
                  URL Listing G2G / Eneba atau Offer ID:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={detectorUrl}
                    onChange={(e) => setDetectorUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDetectLink()}
                    placeholder="https://www.g2g.com/.../offer/G1703129821471UK..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                  <button
                    onClick={() => handleDetectLink()}
                    disabled={isDetecting || !detectorUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {isDetecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Deteksi</span>
                  </button>
                </div>
              </div>

              {/* Detected Results */}
              {detectedData && (
                <div className="space-y-4 pt-2 border-t border-slate-200">
                  <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {detectedData.platform} • {detectedData.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                          {detectedData.clean_title}
                        </h4>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">Stok Faktual G2G</div>
                        <div className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                          {detectedData.real_stock.toLocaleString()} Unit
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-200/60 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Toko Seller</span>
                        <strong className="text-slate-900">{detectedData.seller_name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Harga Modal G2G</span>
                        <strong className="text-slate-900 tabular-nums">{formatRp(detectedData.price_idr)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Saran Jual Shopee</span>
                        <strong className="text-emerald-700 tabular-nums">{formatRp(detectedData.recommended_shopee_price_idr)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Reputasi Toko</span>
                        <strong className="text-slate-900">{detectedData.rating_pct}% ({detectedData.reviews_count.toLocaleString()})</strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Status Matching:{" "}
                        {detectedData.matching_game_id ? (
                          <strong className="text-emerald-700">
                            Cocok dengan "{detectedData.matching_game_title}" di katalog (akan ditambahkan sebagai supplier baru)
                          </strong>
                        ) : (
                          <strong className="text-indigo-700">
                            Produk Baru (akan ditambahkan sebagai game baru ke katalog)
                          </strong>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowDetectorModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                    >
                      Tutup
                    </button>
                    <button
                      onClick={handleApplyDetectedToCatalog}
                      disabled={isApplyingDetected}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {isApplyingDetected ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menerapkan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{detectedData.matching_game_id ? "Terapkan Sebagai Supplier" : "Tambahkan Game ke Katalog"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

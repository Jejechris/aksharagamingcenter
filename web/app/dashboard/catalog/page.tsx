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

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        const createdGame = json.data;
        if (createdGame) {
          const next = [createdGame, ...games.filter(g => g.id !== createdGame.id && g.title.toLowerCase().trim() !== cleanTitle.toLowerCase())];
          updateCatalogState(next);
        }
        setShowAddModal(false);
        setNewTitle('');
        setResearchedSellers([]);
        setResearchSummary('');
        showToast(`Game "${cleanTitle}" berhasil ditambahkan & tersimpan permanen!`);
      } else {
        showToast(json.message || 'Gagal menambahkan game baru ke server.', 'error');
      }
    } catch (e) {
      showToast('Gagal menambahkan game baru (kesalahan jaringan).', 'error');
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
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">
      
      {notification && (
        <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:max-w-md z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/30 text-sm text-emerald-300 font-mono flex items-center gap-3 shadow-xl backdrop-blur-md">
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
            type="button"
            onClick={() => {
              setDetectorUrl('');
              setDetectedData(null);
              setShowDetectorModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
            title="Deteksi live link G2G / Eneba & verifikasi stok asli"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Detektor Live Link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setNewTitle('');
              setResearchedSellers([]);
              setResearchSummary('');
              setShowAddModal(true);
            }}
            className="v0-btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg hover:shadow-white/10 transition-all cursor-pointer select-none"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Game Baru</span>
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

      {/* QUICK LINK DETECTOR BAR */}
      <div className="p-3.5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-zinc-900/80 to-purple-950/30 flex flex-col md:flex-row items-stretch md:items-center gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 shrink-0">
          <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>DETEKTOR LIVE LINK G2G / ENEBA:</span>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            placeholder="Paste link listing G2G atau Eneba (contoh: https://www.g2g.com/.../offer/G1703129821471UK atau ID: G1703314890265KW)..."
            value={detectorUrl}
            onChange={(e) => setDetectorUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDetectLink()}
            className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-200 text-xs font-mono placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
          />
          <button
            onClick={() => handleDetectLink()}
            disabled={isDetecting || !detectorUrl.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-900/30 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isDetecting ? "Mendeteksi..." : "Deteksi Faktual Live"}</span>
          </button>
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
          <Store className="w-10 h-10 text-amber-500/40" />
          <div className="text-slate-200 font-medium text-base">
            {games.length === 0 ? "Portofolio Katalog Masih Kosong" : "Tidak ada game yang sesuai pencarian"}
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
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
              className="v0-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg hover:shadow-white/10 transition-all cursor-pointer select-none mt-2"
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
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                      {selectedSeller?.profile_url?.includes("eneba.com") ||
                      selectedSeller?.seller_name?.toLowerCase().includes("eneba") ||
                      selectedSeller?.tier_label?.includes("ENEBA") ? (
                        <>
                          <span className="flex items-center gap-1.5">
                            <span className="text-violet-300 font-semibold">Supplier Eneba:</span>
                            <a
                              href={getValidSellerUrl(selectedSeller, game.title, game.category)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-400 hover:text-violet-300 font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              {selectedSeller?.seller_name}
                              <ExternalLink className="w-3 h-3 text-violet-400" />
                            </a>
                          </span>
                          <span>•</span>
                          <span>★ {selectedSeller?.rating_pct}% ({selectedSeller?.reviews_count.toLocaleString('id-ID')} ulasan)</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold">
                            ⚡ ENEBA DIGITAL CDKEY (0% HACKBACK)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1.5">
                            Supplier:{" "}
                            <a
                              href={getValidSellerUrl(selectedSeller, game.title, game.category)}
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
                          <span>•</span>
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            (selectedSeller?.stock ?? 0) === 0 ? 'text-rose-400' :
                            (selectedSeller?.stock ?? 0) <= 4 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            📦 Stok Live: {(selectedSeller?.stock ?? 0).toLocaleString('id-ID')} Unit
                          </span>
                        </>
                      )}
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
                          <Sliders className="w-3.5 h-3.5 text-slate-600 group-hover/price:text-amber-400 transition-colors" />
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
                      <button
                        type="button"
                        onClick={() => {
                          const url = selectedSeller?.profile_url || getValidSellerUrl(selectedSeller, game.title);
                          handleDetectLink(url);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
                        title="Inspeksi link asli & verifikasi stok live di G2G"
                      >
                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="hidden sm:inline">Inspeksi Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompetitorModalGame({
                          gameId: game.id,
                          title: game.title,
                          platform: game.platform,
                          price: game.selling_price_shopee_idr,
                          cogs: selectedSeller?.price_g2g_idr || 0,
                        })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 transition-all"
                        title="Cek Radar Kompetitor Shopee & Rekomendasi Harga AI"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                        <span className="hidden sm:inline">Kompetitor</span>
                      </button>

                      <Link
                        href="/dashboard/quant"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all"
                        title="Simulasi laba & margin game ini di The Quant"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Quant</span>
                      </Link>

                      <Link
                        href={`/dashboard/description?game=${encodeURIComponent(game.title)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 transition-all"
                        title="Buat Deskripsi Shopee untuk game ini"
                      >
                        <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span className="hidden sm:inline">Deskripsi</span>
                      </Link>

                      <Link
                        href="/dashboard/autonomous"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
                        title="Kelola pengiriman otonom & stok buffer di Auto-Fulfillment"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Otonom</span>
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

                        {/* Link Auto-Detector Input Bar inside Drawer */}
                        <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-950/20 space-y-2">
                          <label className="text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5 font-mono">
                            <Zap className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            Paste Link Listing G2G (Deteksi Otomatis Toko, Harga & Stok Live)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="https://www.g2g.com/.../offer/G1703129821471UK atau ID: G1703314890265KW"
                              value={drawerListingUrl}
                              onChange={(e) => setDrawerListingUrl(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleDetectInDrawer(game.title)}
                              className="flex-1 bg-zinc-900 border border-indigo-500/40 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleDetectInDrawer(game.title)}
                              disabled={isDetectingDrawer || !drawerListingUrl.trim()}
                              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              {isDetectingDrawer ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              <span>{isDetectingDrawer ? "Mendeteksi..." : "⚡ Deteksi"}</span>
                            </button>
                          </div>
                          {drawerDetectedStock !== null && (
                            <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 pt-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terdeteksi Faktual: Stok Live <strong>{drawerDetectedStock.toLocaleString()} Unit</strong> (Tersinkronisasi)</span>
                            </div>
                          )}
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
                      <table className="w-full text-left text-xs font-mono min-w-[720px]">
                        <thead className="bg-white/5 border-b border-white/5">
                          <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Tier</th>
                            <th className="px-4 py-3 font-semibold">Seller G2G / Eneba</th>
                            <th className="px-4 py-3 font-semibold">Reputasi</th>
                            <th className="px-4 py-3 font-semibold">Stok Live</th>
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
                              const isEneba = s.profile_url?.includes("eneba.com") || s.seller_name?.toLowerCase().includes("eneba") || s.tier_label?.includes("ENEBA");
                              const qris = Math.round(s.price_g2g_idr * 0.007);
                              const netCost = s.price_g2g_idr + qris + Math.round(game.selling_price_shopee_idr * 0.08) + 1000 + 2000;
                              const profit = game.selling_price_shopee_idr - netCost;
                              const margin = game.selling_price_shopee_idr > 0 ? (profit / game.selling_price_shopee_idr) * 100 : 0;

                              return (
                                <tr key={s.seller_id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? (isEneba ? 'bg-violet-500/10' : 'bg-amber-500/5') : ''}`}>
                                  <td className="px-4 py-3">
                                    {isSelected ? (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${isEneba ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'} text-[10px] font-bold`}>
                                        <Check className="w-3 h-3" /> AKTIF
                                      </span>
                                    ) : (
                                      <span className="text-slate-600 text-[10px]">STANDBY</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {isEneba ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">⚡ ENEBA</span>
                                    ) : s.tier === 'ultra_safe' ? (
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
                                        href={getValidSellerUrl(s, game.title, game.category)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${isEneba ? 'text-violet-300 hover:text-violet-200' : 'text-slate-200 hover:text-amber-400'} font-semibold inline-flex items-center gap-1 transition-colors`}
                                      >
                                        <span>{s.seller_name}</span>
                                        <ExternalLink className={`w-3 h-3 ${isEneba ? 'text-violet-400' : 'text-slate-500'}`} />
                                      </a>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-300">
                                    ★ {s.rating_pct}% <span className="text-slate-500">({s.reviews_count.toLocaleString('id-ID')})</span>
                                  </td>
                                  <td className="px-4 py-3 font-mono font-bold">
                                    <span className={
                                      (s.stock ?? 0) === 0 ? 'text-rose-400 font-bold' :
                                      (s.stock ?? 0) <= 4 ? 'text-amber-400 font-bold' :
                                      'text-emerald-400 font-bold'
                                    }>
                                      {(s.stock ?? 0).toLocaleString('id-ID')} Unit
                                    </span>
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
                                      {/* Inspeksi Link & Deteksi Live */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const url = s.profile_url || getValidSellerUrl(s, game.title);
                                          handleDetectLink(url);
                                        }}
                                        className="p-1 rounded-md text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                        title="Inspeksi link asli & verifikasi stok live di G2G"
                                      >
                                        <Zap className="w-3.5 h-3.5" />
                                      </button>

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
          <div className="v0-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl border-amber-500/30 bg-zinc-950">
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
          <div className="v0-card rounded-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border-white/10">
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
              {/* Link Auto-Detector in Tambah Game Modal */}
              <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-2">
                <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5 font-mono">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  Atau Paste Link G2G / Eneba (Auto-Deteksi Game, Seller & Stok)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: https://www.g2g.com/.../offer/G1703129821471UK atau Eneba URL"
                    value={detectorUrl}
                    onChange={(e) => setDetectorUrl(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
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
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs font-sans flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isDetecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>⚡ Deteksi</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-xs text-slate-400 font-medium">Nama Game Lengkap</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Monster Hunter Wilds"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
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
                  disabled={isSubmittingGame}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-slate-300 text-xs font-sans transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGame || !newTitle.trim()}
                  className="v0-btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg hover:shadow-white/10 transition-all disabled:opacity-50 cursor-pointer"
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

      {/* Shopee Competitor Intelligence Modal */}
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

      {/* LINK AUTO-DETECTOR & INSPECTOR MODAL */}
      {showDetectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="v0-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl border-indigo-500/30 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm font-mono">
                <Zap className="w-4 h-4" />
                <span>Detektor & Inspektur Live Link G2G / Eneba</span>
              </div>
              <button
                onClick={() => setShowDetectorModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Input Bar */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-mono">
                URL Listing G2G (Offer URL) atau Eneba:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste link listing... (e.g. https://www.g2g.com/.../offer/G...)"
                  value={detectorUrl}
                  onChange={(e) => setDetectorUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleDetectLink()}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={() => handleDetectLink()}
                  disabled={isDetecting || !detectorUrl.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  {isDetecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>{isDetecting ? "Mendeteksi..." : "Deteksi"}</span>
                </button>
              </div>
            </div>

            {/* Loading Indicator */}
            {isDetecting && (
              <div className="p-8 text-center rounded-xl border border-zinc-800 bg-zinc-950/50 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                <p className="text-xs text-zinc-300 font-mono">
                  Menghubungi server resmi SLS G2G (sls.g2g.com)...
                </p>
                <p className="text-[11px] text-zinc-500">
                  Mengekstrak data stok live, status online seller, kepuasan, dan harga modal riil...
                </p>
              </div>
            )}

            {/* Detected Card */}
            {!isDetecting && detectedData && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {detectedData.platform}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {detectedData.category}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          Offer ID: {detectedData.offer_id}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-zinc-100">
                        {detectedData.clean_title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 truncate max-w-md">
                        {detectedData.raw_title}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-500/20 text-xs font-mono">
                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">SELLER</div>
                      <div className="font-semibold text-zinc-200 truncate flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            detectedData.is_online ? "bg-emerald-400" : "bg-zinc-500"
                          }`}
                        />
                        {detectedData.seller_name}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        ⭐ {detectedData.rating_pct}%
                      </div>
                    </div>

                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">STOK LIVE G2G</div>
                      <div
                        className={`text-base font-bold ${
                          detectedData.real_stock === 0
                            ? "text-rose-400"
                            : detectedData.real_stock <= 4
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {detectedData.real_stock.toLocaleString()}{" "}
                        <span className="text-[10px] font-normal">Unit</span>
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        {detectedData.status === "live" ? "🟢 Live Listing" : "🔴 Delisted"}
                      </div>
                    </div>

                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">MODAL G2G</div>
                      <div className="font-bold text-zinc-200">
                        {formatRp(detectedData.price_idr)}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        ${detectedData.price_usd} USD
                      </div>
                    </div>

                    <div className="bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-[10px] text-zinc-500">REK. JUAL SHOPEE</div>
                      <div className="font-bold text-amber-300">
                        {formatRp(detectedData.recommended_shopee_price_idr)}
                      </div>
                      <div className="text-[10px] text-zinc-400">+25-30% Margin</div>
                    </div>
                  </div>

                  {/* Matching Catalog Info */}
                  <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 text-xs">
                    {detectedData.matching_game_id ? (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Cocok dengan katalog: <strong>{detectedData.matching_game_title}</strong>
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {detectedData.is_existing_seller
                            ? "ℹ️ Seller ini sudah ada di game ini"
                            : "✨ Seller baru untuk game ini"}
                        </span>
                      </div>
                    ) : (
                      <div className="text-zinc-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Game baru terdeteksi! Siap ditambahkan sebagai produk baru di katalog.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <a
                    href={detectedData.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>Buka Listing Asli di G2G</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={handleApplyDetectedToCatalog}
                    disabled={isApplyingDetected}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {isApplyingDetected
                        ? "Menerapkan..."
                        : detectedData.matching_game_id
                        ? "⚡ Terapkan Seller Ini ke Katalog"
                        : "➕ Tambahkan Produk Baru ke Katalog"}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

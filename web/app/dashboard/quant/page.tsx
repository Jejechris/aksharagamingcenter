"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchSmartCatalog } from "@/lib/catalogClient";
import Link from 'next/link';
import { 
  DollarSign, Sliders, Activity, ArrowLeft, ArrowRight, Target, 
  TrendingUp, Calculator, Zap, ChevronRight, QrCode, ShieldCheck, 
  ExternalLink, Layers, Sparkles, Plus, Check, Save, RotateCcw,
  Store, AlertCircle, Info, Tag, CheckCircle2, RefreshCw, Trash2,
  ChevronDown, ChevronUp, Pencil, FileText, ShoppingBag
} from 'lucide-react';
import { getG2GSellerUrl } from '@/lib/g2g';
import {
  SHOPEE_FEE_PRESETS,
  ShopeeFeePresetId,
  DEFAULT_FX_BUFFER_PCT,
  calculateShopeeEconomics,
  calculateBreakEvenPrice,
  calculateTargetSellingPrice,
} from '@/lib/pricing';
import ShopeeCompetitorModal from '@/app/components/ShopeeCompetitorModal';
import GameSelectorCombobox from '@/app/components/GameSelectorCombobox';

interface SellerOption {
  id: string;
  name: string;
  price_idr: number;
  rating_pct: number;
  reviews: number;
  delivery: string;
  is_selected: boolean;
  tier?: 'ultra_safe' | 'lowest_price' | 'mid_level' | string;
  tier_label?: string;
  tier_desc?: string;
}

interface CatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  target_margin_pct: number;
  selected_seller_id: string;
  sellers: any[];
  metrics?: any;
}

function QuantCalculatorContent() {
  const searchParams = useSearchParams();
  const gameQueryParam = searchParams.get('game');

  // Mode Selection: 'fixed_price' (Mode A) vs 'target_margin' (Mode B)
  const [calcMode, setCalcMode] = useState<'fixed_price' | 'target_margin'>('fixed_price');
  const [isCompetitorModalOpen, setIsCompetitorModalOpen] = useState(false);

  // Active Catalog Games from persistent DB
  const [catalogGames, setCatalogGames] = useState<CatalogItem[]>([]);
  const [currentGameId, setCurrentGameId] = useState<string>('game-mc-01');

  // Product metadata
  const [gameTitle, setGameTitle] = useState('Minecraft: Java & Bedrock Edition');
  const [platform, setPlatform] = useState('PC / Microsoft');
  const [category, setCategory] = useState('Account (Full Access)');

  // Pricing inputs
  const [sellingPrice, setSellingPrice] = useState(249900);
  const [targetMarginPct, setTargetMarginPct] = useState(18.0);
  const [cogsG2gIdr, setCogsG2gIdr] = useState(186000);
  const [qrisFeePct, setQrisFeePct] = useState(0.7); // Direct QRIS 0.7%
  const [shopeeAdminPct, setShopeeAdminPct] = useState(8.0);
  const [shopeeFixedFee, setShopeeFixedFee] = useState(1000);
  const [packaging, setPackaging] = useState(0); // Default Rp 0 for full digital mode
  const [feePreset, setFeePreset] = useState<ShopeeFeePresetId>('reguler');
  const [fxBufferEnabled, setFxBufferEnabled] = useState(false);

  const handleFeePresetChange = (presetId: ShopeeFeePresetId) => {
    setFeePreset(presetId);
    setShopeeAdminPct(SHOPEE_FEE_PRESETS[presetId].adminFeePct);
    setShopeeFixedFee(SHOPEE_FEE_PRESETS[presetId].fixedFeeIdr);
  };
  
  // Multi-seller options for current product
  const [sellers, setSellers] = useState<SellerOption[]>([
    { 
      id: 'g2g-hellenwong-mc', 
      name: 'HellenWong', 
      price_idr: 186000, 
      rating_pct: 99.8, 
      reviews: 32450, 
      delivery: 'Instant Delivery', 
      is_selected: true,
      tier: 'ultra_safe',
      tier_label: '🛡️ Top Verified',
      tier_desc: 'Paling aman terverifikasi, rating 99.8%, 32k+ ulasan, no-ban guarantee.'
    },
    { 
      id: 'g2g-mc-lowest', 
      name: 'HellenWong_Hypixel', 
      price_idr: 148100, 
      rating_pct: 99.8, 
      reviews: 32450, 
      delivery: 'Instant Delivery', 
      is_selected: false,
      tier: 'lowest_price',
      tier_label: '⚡ Lowest Price',
      tier_desc: 'Harga paling kompetitif untuk akun full access, margin maksimal.'
    },
    { 
      id: 'g2g-mc-rising', 
      name: 'HellenWong_TLauncher', 
      price_idr: 18000, 
      rating_pct: 99.8, 
      reviews: 32450, 
      delivery: 'Instant Delivery', 
      is_selected: false,
      tier: 'mid_level',
      tier_label: '⚖️ Mid-Level / Rising',
      tier_desc: 'Seller alternatif berkualitas dengan stok melimpah dan respon kilat.'
    },
  ]);

  const [activePreset, setActivePreset] = useState('minecraft');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchMsg, setResearchMsg] = useState('');

  // Add custom seller inline state
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerPrice, setNewSellerPrice] = useState<number>(150000);
  const [newSellerRating, setNewSellerRating] = useState<number>(99.5);
  const [newSellerReviews, setNewSellerReviews] = useState<number>(8500);
  const [newSellerTier, setNewSellerTier] = useState<'ultra_safe' | 'lowest_price' | 'mid_level'>('mid_level');
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [isAddingSeller, setIsAddingSeller] = useState(false);

  // Edit seller in Quant state
  const [editingSellerQuant, setEditingSellerQuant] = useState<{
    id: string;
    name: string;
    price_idr: number;
    rating_pct: number;
    reviews: number;
    delivery: string;
    tier: string;
  } | null>(null);
  const [isSavingEditSellerQuant, setIsSavingEditSellerQuant] = useState(false);

  const selectedSeller = sellers.find(s => s.is_selected) || sellers[0];

  useEffect(() => {
    if (selectedSeller) {
      setCogsG2gIdr(selectedSeller.price_idr);
    }
  }, [selectedSeller?.id, selectedSeller?.price_idr]);

  const handleSaveEditSellerQuant = async () => {
    if (!editingSellerQuant || !editingSellerQuant.name.trim()) return;
    setIsSavingEditSellerQuant(true);
    try {
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_seller',
          game_id: currentGameId,
          title: gameTitle,
          edit_seller: {
            seller_id: editingSellerQuant.id,
            seller_name: editingSellerQuant.name.trim(),
            price_g2g_idr: Number(editingSellerQuant.price_idr),
            rating_pct: Number(editingSellerQuant.rating_pct),
            reviews_count: Number(editingSellerQuant.reviews),
            tier: editingSellerQuant.tier,
            delivery_speed: editingSellerQuant.delivery || 'Instant Delivery',
            profile_url: getG2GSellerUrl(editingSellerQuant.name.trim(), gameTitle)
          }
        })
      });

      if (res.ok) {
        setSellers(prev => prev.map(s => s.id === editingSellerQuant.id ? {
          ...s,
          name: editingSellerQuant.name.trim(),
          price_idr: Number(editingSellerQuant.price_idr),
          rating_pct: Number(editingSellerQuant.rating_pct),
          reviews: Number(editingSellerQuant.reviews),
          tier: editingSellerQuant.tier,
          tier_label: editingSellerQuant.tier === 'ultra_safe' ? '🛡️ Top Verified' : editingSellerQuant.tier === 'lowest_price' ? '⚡ Lowest Price' : '⚖️ Mid-Level'
        } : s));

        if (selectedSeller?.id === editingSellerQuant.id) {
          setCogsG2gIdr(Number(editingSellerQuant.price_idr));
        }

        setSaveMessage(`✅ Seller "${editingSellerQuant.name}" berhasil diperbarui & disimpan!`);
        setTimeout(() => setSaveMessage(''), 4000);
        setEditingSellerQuant(null);
        fetchCatalogData(false);
      }
    } catch (e) {
      console.error('Failed to edit seller in Quant:', e);
    } finally {
      setIsSavingEditSellerQuant(false);
    }
  };

  // Fetch live catalog data & support query param `?game=`
  const fetchCatalogData = useCallback(async (applyToUI = true): Promise<any[]> => {
    try {
      const mergedData = await fetchSmartCatalog();
      if (mergedData && mergedData.length > 0) {
        setCatalogGames(mergedData);

        if (applyToUI) {
          const targetKey = gameQueryParam || currentGameId;
          const matched = mergedData.find((g: any) => g.id === targetKey || g.title.toLowerCase() === targetKey.toLowerCase()) ||
                          mergedData.find((g: any) => g.id === currentGameId) ||
                          mergedData[0];

          if (matched) {
            setCurrentGameId(matched.id);
            setActivePreset(matched.id);
            setGameTitle(matched.title);
            setPlatform(matched.platform);
            setCategory(matched.category || 'Account (Full Access)');
            setSellingPrice(matched.selling_price_shopee_idr);
            setTargetMarginPct(matched.target_margin_pct);

            if (Array.isArray(matched.sellers) && matched.sellers.length > 0) {
              const mapped: SellerOption[] = matched.sellers.map((s: any) => ({
                id: s.seller_id || s.id,
                name: s.seller_name || s.name,
                price_idr: Number(s.price_g2g_idr || s.price_idr) || 100000,
                rating_pct: Number(s.rating_pct) || 99.0,
                reviews: Number(s.reviews_count || s.reviews) || 1000,
                delivery: s.delivery_speed || 'Instant Delivery',
                is_selected: (s.seller_id || s.id) === matched.selected_seller_id,
                tier: s.tier,
                tier_label: s.tier_label,
                tier_desc: s.tier_desc
              }));
              setSellers(mapped);
              const sel = mapped.find(s => s.is_selected) || mapped[0];
              setCogsG2gIdr(sel.price_idr);
            } else {
              setSellers([]);
              setCogsG2gIdr(Math.round(matched.selling_price_shopee_idr * 0.7));
            }
          }
        }
        return mergedData;
      }
    } catch (err) {
      console.error('Failed to fetch catalog in Quant:', err);
    }
    return [];
  }, [gameQueryParam, currentGameId]);

  useEffect(() => {
    fetchCatalogData(true);
  }, [fetchCatalogData]);

  // Autonomous G2G Research Handler
  const handleAutoResearchQuant = async () => {
    if (!gameTitle.trim()) return;
    setIsResearching(true);
    setResearchMsg('');
    try {
      const res = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: gameTitle, platform })
      });
      const json = await res.json();
      if (json.status === 'success' && json.recommendations) {
        const rec = json.recommendations;
        if (rec.title) setGameTitle(rec.title);
        setPlatform(rec.platform);
        setCategory(rec.category);
        setSellingPrice(rec.selling_price_shopee_idr);
        setTargetMarginPct(rec.target_margin_pct);
        if (rec.sellers && rec.sellers.length > 0) {
          const mappedSellers: SellerOption[] = rec.sellers.map((s: any, idx: number) => ({
            id: s.seller_id,
            name: s.seller_name,
            price_idr: s.price_g2g_idr,
            rating_pct: s.rating_pct,
            reviews: s.reviews_count,
            delivery: s.delivery_speed,
            is_selected: idx === 0,
            tier: s.tier,
            tier_label: s.tier_label,
            tier_desc: s.tier_desc
          }));
          setSellers(mappedSellers);
          setCogsG2gIdr(mappedSellers[0].price_idr);
        }
        setResearchMsg(`✅ ${rec.sellers?.length || 3} seller G2G terverifikasi ditemukan!`);
        setTimeout(() => setResearchMsg(''), 4000);
      }
    } catch (e) {
      console.error('Research error:', e);
    } finally {
      setIsResearching(false);
    }
  };

  // Calculations via unified pricing engine
  const activeFxBufferPct = fxBufferEnabled ? DEFAULT_FX_BUFFER_PCT : 0;

  const calculatedRecommendedPrice = useMemo(() => {
    return calculateTargetSellingPrice({
      cogsIdr: cogsG2gIdr,
      presetId: feePreset,
      adminFeePct: shopeeAdminPct,
      fixedFeeIdr: shopeeFixedFee,
      qrisFeePct,
      fxBufferPct: activeFxBufferPct,
      packagingCostIdr: packaging,
      targetMarginPct,
    });
  }, [cogsG2gIdr, feePreset, shopeeAdminPct, shopeeFixedFee, qrisFeePct, activeFxBufferPct, packaging, targetMarginPct]);

  const effectiveSellingPrice = calcMode === 'target_margin' ? calculatedRecommendedPrice : sellingPrice;

  const economics = calculateShopeeEconomics({
    sellingPriceIdr: effectiveSellingPrice,
    cogsIdr: cogsG2gIdr,
    presetId: feePreset,
    adminFeePct: shopeeAdminPct,
    fixedFeeIdr: shopeeFixedFee,
    qrisFeePct,
    fxBufferPct: activeFxBufferPct,
    packagingCostIdr: packaging,
  });

  const qrisFeeIdr = economics.qrisFeeIdr;
  const modalBersih = economics.cogsNetIdr;
  const potonganShopee = economics.shopeeFeeIdr;
  const totalCost = economics.totalCostIdr;
  const profitBersih = economics.netProfitIdr;
  const netMargin = economics.netMarginPct;

  const breakEvenPrice = calculateBreakEvenPrice({
    cogsIdr: cogsG2gIdr,
    presetId: feePreset,
    adminFeePct: shopeeAdminPct,
    fixedFeeIdr: shopeeFixedFee,
    qrisFeePct,
    fxBufferPct: activeFxBufferPct,
    packagingCostIdr: packaging,
  });

  const targetBulanan = 10000000;
  const neededTx = profitBersih > 0 ? Math.ceil(targetBulanan / profitBersih) : 0;
  const neededPerDay = neededTx > 0 ? Math.ceil(neededTx / 30) : 0;

  const formatRp = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };
  const formatNum = (num: number, decimals: number = 1) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num || 0);
  };

  const handleSelectSeller = async (id: string) => {
    setSellers(prev => prev.map(s => ({ ...s, is_selected: s.id === id })));
    const target = sellers.find(s => s.id === id);
    if (target) {
      setCogsG2gIdr(target.price_idr);
    }
    try {
      setAutoSaveStatus('saving');
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: currentGameId,
          title: gameTitle,
          selected_seller_id: id
        })
      });
      if (res.ok) {
        setAutoSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
      } else {
        setAutoSaveStatus('idle');
      }
    } catch (e) {
      console.error('Failed to auto-save selected seller', e);
      setAutoSaveStatus('idle');
    }
  };

  const handleAddSeller = async () => {
    if (!newSellerName.trim()) return;
    setIsAddingSeller(true);
    const newId = `g2g-custom-${Date.now()}`;
    const newS: SellerOption = {
      id: newId,
      name: newSellerName.trim(),
      price_idr: Number(newSellerPrice),
      rating_pct: Number(newSellerRating) || 99.5,
      reviews: Number(newSellerReviews) || 5000,
      delivery: 'Instant Delivery',
      is_selected: true,
      tier: newSellerTier,
      tier_label: newSellerTier === 'ultra_safe' ? '🛡️ Top Verified' : newSellerTier === 'lowest_price' ? '⚡ Lowest Price' : '⚖️ Mid-Level',
      tier_desc: 'Seller kustom baru ditambahkan dari The Quant.'
    };

    const updatedSellers = [...sellers.map(s => ({ ...s, is_selected: false })), newS];
    setSellers(updatedSellers);
    setCogsG2gIdr(newS.price_idr);
    setNewSellerName('');
    setShowAddSeller(false);

    try {
      setAutoSaveStatus('saving');
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_seller',
          game_id: currentGameId,
          title: gameTitle,
          new_seller: {
            seller_id: newS.id,
            seller_name: newS.name,
            price_g2g_idr: newS.price_idr,
            rating_pct: newS.rating_pct,
            reviews_count: newS.reviews,
            delivery_speed: newS.delivery,
            tier: newS.tier,
            tier_label: newS.tier_label,
            tier_desc: newS.tier_desc,
            is_recommended: false,
            profile_url: getG2GSellerUrl(newS.name, gameTitle)
          },
          set_selected: true
        })
      });

      if (res.ok) {
        setAutoSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
        setSaveMessage(`✅ Seller "${newS.name}" berhasil ditambahkan & tersimpan permanen!`);
        setTimeout(() => setSaveMessage(''), 4000);
        fetchCatalogData(false);
      } else {
        setAutoSaveStatus('idle');
      }
    } catch (err) {
      console.error('Error adding seller:', err);
      setAutoSaveStatus('idle');
    } finally {
      setIsAddingSeller(false);
    }
  };

  // Dynamic presets derived directly from live active catalog in DB
  const presets = useMemo(() => {
    if (catalogGames && catalogGames.length > 0) {
      return catalogGames.map((g) => {
        const sel =
          g.sellers?.find((s: any) => (s.seller_id || s.id) === g.selected_seller_id) ||
          g.sellers?.[0] || {
            seller_id: 'default',
            seller_name: 'G2G Seller',
            price_g2g_idr: 100000,
            rating_pct: 99.0,
            reviews_count: 1000,
            delivery_speed: 'Instant Delivery',
            tier: 'mid_level',
            tier_label: '⚖️ Mid-Level',
            tier_desc: ''
          };

        return {
          id: g.id,
          catalogId: g.id,
          title: g.title,
          platform: g.platform,
          category: g.category || 'Digital Key / Account',
          price: Number(g.selling_price_shopee_idr) || 100000,
          g2gIdr: Number(sel.price_g2g_idr || sel.price_idr) || 100000,
          margin: Number(g.target_margin_pct) || 20,
          seller: sel.seller_name || sel.name || 'G2G Seller',
          sellers: (g.sellers || []).map((s: any, idx: number) => ({
            id: s.seller_id || s.id || `g2g-s-${idx}`,
            name: s.seller_name || s.name || 'G2G Seller',
            price_idr: Number(s.price_g2g_idr || s.price_idr) || 100000,
            rating_pct: Number(s.rating_pct) || 99.5,
            reviews: Number(s.reviews_count || s.reviews) || 1000,
            delivery: s.delivery_speed || s.delivery || 'Instant Delivery',
            tier: s.tier || 'mid_level',
            tier_label: s.tier_label || '⚖️ Mid-Level',
            tier_desc: s.tier_desc || '',
            is_selected: (s.seller_id || s.id) === g.selected_seller_id,
          }))
        };
      });
    }
    return [];
  }, [catalogGames]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const currentStateRef = useRef({
    gameId: currentGameId,
    title: gameTitle,
    sellingPrice: effectiveSellingPrice,
    margin: 0 as number,
    sellerId: '' as string,
  });
  currentStateRef.current = {
    gameId: currentGameId,
    title: gameTitle,
    sellingPrice: effectiveSellingPrice,
    margin: Math.round(netMargin * 10) / 10,
    sellerId: selectedSeller?.id ?? '',
  };

  const flushSaveNow = useCallback(async () => {
    const snap = currentStateRef.current;
    if (!snap.gameId) return;
    try {
      setAutoSaveStatus('saving');
      const res = await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: snap.gameId,
          title: snap.title,
          selling_price_shopee_idr: snap.sellingPrice,
          target_margin_pct: snap.margin,
          selected_seller_id: snap.sellerId,
        })
      });
      if (res.ok) {
        setAutoSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
      } else {
        setAutoSaveStatus('idle');
      }
    } catch (_) {
      setAutoSaveStatus('idle');
    }
  }, []);

  const isSwitchingGameRef = useRef(false);

  const handlePreset = async (p: any) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await flushSaveNow();

    isSwitchingGameRef.current = true;
    setTimeout(() => { isSwitchingGameRef.current = false; }, 1000);

    setActivePreset(p.id);
    setCurrentGameId(p.catalogId || p.id);
    setGameTitle(p.title);
    setPlatform(p.platform);
    setCategory(p.category);
    setSellingPrice(p.price);
    setTargetMarginPct(p.margin);

    if (Array.isArray(p.sellers) && p.sellers.length > 0) {
      setSellers(p.sellers);
      const active = p.sellers.find((s: any) => s.is_selected) || p.sellers[0];
      setCogsG2gIdr(active.price_idr);
    } else {
      setSellers([]);
      setCogsG2gIdr(Math.round(p.price * 0.7));
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (isSwitchingGameRef.current) return;

    setAutoSaveStatus('saving');
    const snapshot = { ...currentStateRef.current };

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/catalog', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: snapshot.gameId,
            title: snapshot.title,
            selling_price_shopee_idr: snapshot.sellingPrice,
            target_margin_pct: snapshot.margin,
            selected_seller_id: snapshot.sellerId,
          })
        });
        if (res.ok) {
          setAutoSaveStatus('saved');
          setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
        } else {
          setAutoSaveStatus('idle');
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
        setAutoSaveStatus('idle');
      }
    }, 1200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [effectiveSellingPrice, netMargin, selectedSeller?.id]);

  const handleSaveToCatalog = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          id: currentGameId && currentGameId !== 'custom' ? currentGameId : undefined,
          title: gameTitle,
          platform,
          category,
          selling_price_shopee_idr: effectiveSellingPrice,
          target_margin_pct: Math.round(netMargin * 10) / 10,
          selected_seller_id: selectedSeller?.id || 'default',
          sellers: sellers.map(s => ({
            seller_id: s.id,
            seller_name: s.name,
            rating_pct: s.rating_pct,
            reviews_count: s.reviews,
            price_g2g_idr: s.price_idr,
            delivery_speed: s.delivery,
            stock: 25,
            risk_score: 0,
            is_recommended: s.is_selected,
            profile_url: getG2GSellerUrl(s.name, gameTitle),
            tier: s.tier,
            tier_label: s.tier_label,
            tier_desc: s.tier_desc
          }))
        })
      });

      if (res.ok) {
        setSaveStatus('saved');
        setSaveMessage(`✅ "${gameTitle}" berhasil disimpan ke Portofolio Katalog!`);
        setTimeout(() => setSaveStatus('idle'), 4000);
        fetchCatalogData(false);
      } else {
        setSaveStatus('error');
        setSaveMessage('Gagal menyimpan ke katalog.');
      }
    } catch (e) {
      setSaveStatus('error');
      setSaveMessage('Kesalahan jaringan.');
    }
  };

  // Sensitivity scenarios
  const sensitivityScenarios = useMemo(() => {
    const deltas = [-30000, -20000, -10000, 0, 10000, 20000, 30000];
    return deltas.map(delta => {
      const price = effectiveSellingPrice + delta;
      if (price <= 0) return null;
      const shopee = Math.round(price * (shopeeAdminPct / 100)) + shopeeFixedFee;
      const cost = modalBersih + shopee + packaging;
      const profit = price - cost;
      const margin = (profit / price) * 100;
      return { delta, price, cost, profit, margin, isCurrent: delta === 0 };
    }).filter(Boolean);
  }, [effectiveSellingPrice, modalBersih, shopeeAdminPct, shopeeFixedFee, packaging]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Toast / Banner */}
        {saveStatus === 'saved' && (
          <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-white border border-slate-200 text-slate-900 font-sans flex items-center gap-3 shadow-xl max-w-md animate-in fade-in slide-in-from-bottom-2">
            <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium flex-1">{saveMessage}</span>
            <Link href="/dashboard/catalog" className="text-xs font-semibold text-emerald-700 underline">
              Lihat Radar
            </Link>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Command Deck
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-700">The Quant</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              The Quant — Profit Calculator
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Simulasi profitabilitas real-time untuk game apapun. Dual mode kalkulasi, integrasi multi-seller G2G/Eneba, dan auto-save sinkronisasi ke katalog portofolio.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
              {autoSaveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span className="text-amber-700 font-semibold">Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-Save {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
                </>
              )}
            </div>

            <Link
              href={`/dashboard/description?game=${encodeURIComponent(gameTitle)}`}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition-colors flex items-center gap-1.5"
              title="Buat Deskripsi Shopee untuk game ini"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>Deskripsi Shopee</span>
            </Link>

            <button
              onClick={handleSaveToCatalog}
              disabled={saveStatus === 'saving'}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan ke Portofolio</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Smart Searchable Game Portfolio Selector */}
        <div className="animate-fade-up">
          {catalogGames.length === 0 ? (
            <div className="app-card p-3 bg-white text-xs text-slate-500 w-full flex items-center justify-between">
              <span>Portofolio katalog masih kosong.</span>
              <Link href="/dashboard/catalog" className="text-xs font-semibold text-emerald-700 underline">
                Buka Radar Katalog
              </Link>
            </div>
          ) : (
            <GameSelectorCombobox
              label="Pilih Game Portofolio"
              actionLink={{ label: "+ Tambah di Katalog →", href: "/dashboard/catalog" }}
              games={catalogGames}
              selectedGameId={currentGameId}
              selectedGameTitle={gameTitle}
              onSelect={(selected) => {
                const p = presets.find((pr) => pr.catalogId === selected.id) || {
                  id: selected.id,
                  catalogId: selected.id,
                  title: selected.title,
                  platform: selected.platform,
                  category: selected.category,
                  price: selected.selling_price_shopee_idr,
                  margin: selected.target_margin_pct,
                  sellers: selected.sellers,
                };
                handlePreset(p);
              }}
            />
          )}
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60 w-full sm:w-max">
          <button
            onClick={() => setCalcMode('fixed_price')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              calcMode === 'fixed_price'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mode A: Harga Jual &rarr; Margin
          </button>
          <button
            onClick={() => setCalcMode('target_margin')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              calcMode === 'target_margin'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mode B: Target Margin
          </button>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Card 1: Identitas Game & Lisensi */}
            <div className="app-card animate-fade-up p-5 space-y-4 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" /> Identitas Game & Lisensi
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    ID: {currentGameId || 'NEW'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Nama Produk</label>
                    {researchMsg && <span className="text-[10px] text-emerald-700 font-semibold">{researchMsg}</span>}
                  </div>
                  <div className="flex gap-2 min-w-0">
                    <input
                      type="text"
                      value={gameTitle}
                      onChange={(e) => {
                        setGameTitle(e.target.value);
                        setActivePreset('custom');
                      }}
                      placeholder="Contoh: Monster Hunter"
                      className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAutoResearchQuant}
                      disabled={isResearching || !gameTitle.trim()}
                      className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center disabled:opacity-50 transition-colors cursor-pointer"
                      title="Riset AI untuk Seller G2G"
                    >
                      {isResearching ? <RotateCcw className="w-4 h-4 animate-spin text-slate-400" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Steam">Steam</option>
                    <option value="PC / Microsoft">PC / Microsoft</option>
                    <option value="Rockstar / Steam">Rockstar Games</option>
                    <option value="EA App / PC">EA App / Origin</option>
                    <option value="PlayStation 5">PlayStation 5</option>
                    <option value="Xbox Series X/S">Xbox Series</option>
                    <option value="Steam Trade">Steam Trade (Keys)</option>
                    <option value="Epic Games">Epic Games</option>
                    <option value="Nintendo Switch">Nintendo Switch</option>
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Format Lisensi</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Account (Full Access)">Full Access Account</option>
                    <option value="Digital Key / CDKey">Digital CDKey (Global)</option>
                    <option value="Steam Gift">Steam Gift</option>
                    <option value="In-Game Asset / Key">Item In-Game / Keys</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Parameter Penjualan & Biaya */}
            <div className="app-card p-5 space-y-5 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" /> Parameter Penjualan & Biaya Platform
                </h2>
                <button
                  type="button"
                  onClick={() => setIsCompetitorModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-600" />
                  <span>Radar Kompetitor Shopee</span>
                </button>
              </div>

              {calcMode === 'fixed_price' ? (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Harga Jual Shopee (IDR)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">Rp</span>
                      <input
                        type="number"
                        step="1000"
                        min="10000"
                        max="2000000"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(Number(e.target.value))}
                        className="w-32 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-slate-900 text-right focus:outline-none focus:border-emerald-500 tabular-nums"
                      />
                    </div>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="1000000"
                    step="1000"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900">
                      Target Margin Bersih (%)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="5"
                        max="60"
                        value={targetMarginPct}
                        onChange={(e) => setTargetMarginPct(Number(e.target.value))}
                        className="w-24 bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-emerald-800 text-right focus:outline-none focus:border-emerald-500 tabular-nums"
                      />
                      <span className="text-xs text-slate-500 font-mono">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="0.5"
                    value={targetMarginPct}
                    onChange={(e) => setTargetMarginPct(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer h-2 bg-emerald-200 rounded-lg appearance-none"
                  />
                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-emerald-200">
                    <span className="text-slate-600 font-sans">Rekomendasi Harga Jual:</span>
                    <span className="text-base font-bold text-emerald-800 tabular-nums">{formatRp(calculatedRecommendedPrice)}</span>
                  </div>
                </div>
              )}

              {/* Packaging Input (Fix: Digital default 0, user configurable) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Biaya Packaging / Kartu Fisik (IDR)</label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {packaging === 0 ? "Full Digital (Rp 0)" : formatRp(packaging)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={packaging}
                    onChange={(e) => setPackaging(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white tabular-nums"
                  />
                  <p className="text-[11px] text-slate-500">
                    Default Rp 0 untuk pengiriman 100% digital (non-fisik / tanpa biaya kemasan).
                  </p>
                </div>

                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-700">Program Biaya Shopee:</span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fxBufferEnabled}
                        onChange={(e) => setFxBufferEnabled(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>Buffer Kurs +{DEFAULT_FX_BUFFER_PCT}%</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(Object.values(SHOPEE_FEE_PRESETS)).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleFeePresetChange(preset.id)}
                        title={preset.description}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                          feePreset === preset.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.shortLabel}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-slate-500 font-mono pt-1 border-t border-slate-200">
                    <span>Fee Shopee Aktif:</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {shopeeAdminPct}% + Rp {shopeeFixedFee.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-mono">
                    <span>QRIS ({qrisFeePct}%){fxBufferEnabled ? ` + FX (+${DEFAULT_FX_BUFFER_PCT}%)` : ''}:</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      +{formatRp(qrisFeeIdr + economics.fxBufferIdr)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Seller G2G Options */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-600" /> Supplier G2G ({sellers.length})
                  </label>
                  <button
                    onClick={() => setShowAddSeller(!showAddSeller)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Seller
                  </button>
                </div>

                {showAddSeller && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">Tambah Seller Baru</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Nama Toko</label>
                        <input
                          type="text"
                          value={newSellerName}
                          onChange={(e) => setNewSellerName(e.target.value)}
                          placeholder="Nama Seller"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Harga Modal G2G (Rp)</label>
                        <input
                          type="number"
                          value={newSellerPrice}
                          onChange={(e) => setNewSellerPrice(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Tier</label>
                        <select
                          value={newSellerTier}
                          onChange={(e: any) => setNewSellerTier(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="ultra_safe">Tier 1: 🛡️ Top Verified</option>
                          <option value="lowest_price">Tier 2: ⚡ Lowest Price</option>
                          <option value="mid_level">Tier 3: ⚖️ Mid-Level</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">Rating (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={newSellerRating}
                          onChange={(e) => setNewSellerRating(Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSeller(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-medium"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSeller}
                        disabled={isAddingSeller || !newSellerName.trim()}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isAddingSeller ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Simpan Seller</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Seller Options List */}
                <div className="space-y-2">
                  {sellers.map((s) => {
                    const isSelected = s.is_selected;
                    const sQris = Math.round(s.price_idr * 0.007);
                    const sNetCost = s.price_idr + sQris + potonganShopee + packaging;
                    const sProfit = effectiveSellingPrice - sNetCost;
                    const sMargin = effectiveSellingPrice > 0 ? (sProfit / effectiveSellingPrice) * 100 : 0;
                    const isLoss = sMargin < 0;

                    return (
                      <div
                        key={s.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{s.name}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              s.tier === 'ultra_safe'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : s.tier === 'lowest_price'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {s.tier === 'ultra_safe' ? 'Tier 1' : s.tier === 'lowest_price' ? 'Tier 2' : 'Tier 3'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ⭐ {s.rating_pct}% ({s.reviews.toLocaleString("id-ID")} ulasan)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                            <span>Modal: <strong className="text-slate-800">{formatRp(s.price_idr)}</strong></span>
                            <span>•</span>
                            <span>Laba: <strong className={isLoss ? 'text-rose-600' : 'text-emerald-700'}>{formatRp(sProfit)}</strong></span>
                            <span>•</span>
                            <span>Margin: <strong className={isLoss ? 'text-rose-600' : 'text-slate-800'}>{formatNum(sMargin)}%</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setEditingSellerQuant({
                              id: s.id,
                              name: s.name,
                              price_idr: s.price_idr,
                              rating_pct: s.rating_pct,
                              reviews: s.reviews,
                              delivery: s.delivery,
                              tier: s.tier || 'mid_level'
                            })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Edit detail seller ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {isSelected ? (
                            <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                              Dipakai
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectSeller(s.id)}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Pilih
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Card 3: Tabel Sensitivitas Harga */}
            <div className="app-card rounded-2xl overflow-hidden bg-white">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-sans">
                  <Activity className="w-4 h-4 text-emerald-600" /> Analisis Sensitivitas Harga
                </h3>
              </div>
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-[11px] sm:text-xs font-mono text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Skenario</th>
                      <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Harga</th>
                      <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Laba</th>
                      <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px] text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sensitivityScenarios.map((sc: any) => (
                      <tr key={sc.delta} className={sc.isCurrent ? 'bg-emerald-50/60 font-bold' : 'hover:bg-slate-50'}>
                        <td className="px-2.5 sm:px-4 py-2.5 whitespace-nowrap">
                          {sc.delta === 0 ? (
                            <span className="text-emerald-700 font-bold">AKTIF</span>
                          ) : (
                            <span className="text-slate-500">{sc.delta > 0 ? '+' : ''}{formatRp(sc.delta)}</span>
                          )}
                        </td>
                        <td className="px-2.5 sm:px-4 py-2.5 text-slate-900 whitespace-nowrap tabular-nums">{formatRp(sc.price)}</td>
                        <td className={`px-2.5 sm:px-4 py-2.5 whitespace-nowrap tabular-nums ${sc.profit > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatRp(sc.profit)}
                        </td>
                        <td className={`px-2.5 sm:px-4 py-2.5 text-right whitespace-nowrap tabular-nums ${
                          sc.margin >= 20 ? 'text-emerald-700 font-bold' : sc.margin >= 10 ? 'text-amber-700' : 'text-rose-600'
                        }`}>
                          {formatNum(sc.margin)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column (4 cols, Sticky) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            
            {/* Profit Laba / Unit Card */}
            <div className="app-card p-6 space-y-5 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laba Bersih / Unit</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Calculator className="w-4 h-4" />
                </div>
              </div>

              {/* Big Profit Number */}
              <div className="text-center py-2">
                <div className={`text-3xl font-bold font-mono tracking-tight tabular-nums ${
                  profitBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {formatRp(profitBersih)}
                </div>
                <div className="mt-1.5 flex justify-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border tabular-nums ${
                    netMargin >= 20
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : netMargin >= 10
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    Margin: {formatNum(netMargin)}% {netMargin < 0 ? '(Rugi)' : ''}
                  </span>
                </div>
              </div>

              {/* Financial Line Item Breakdown */}
              <div className="space-y-2.5 font-mono text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between text-slate-900 font-semibold">
                  <span>Harga Jual Shopee</span>
                  <span className="tabular-nums">{formatRp(effectiveSellingPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Modal Supplier ({selectedSeller?.name.substring(0, 10)}...)</span>
                  <span className="tabular-nums text-slate-700">- {formatRp(cogsG2gIdr)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>QRIS Fee ({qrisFeePct}%)</span>
                  <span className="tabular-nums text-slate-700">- {formatRp(qrisFeeIdr)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Shopee Fee ({shopeeAdminPct}% + 1k)</span>
                  <span className="tabular-nums text-slate-700">- {formatRp(potonganShopee)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Packaging & Dokumen</span>
                  <span className="tabular-nums text-slate-700">- {formatRp(packaging)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold pt-2 border-t border-slate-100">
                  <span>Total Beban Biaya</span>
                  <span className="tabular-nums">{formatRp(totalCost)}</span>
                </div>
              </div>

              {/* Break Even Price */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Titik Impas (BEP):</span>
                <span className="font-bold text-slate-900 tabular-nums">{formatRp(breakEvenPrice)}</span>
              </div>
            </div>

            {/* Target 10 Jt / Bulan Card */}
            <div className="app-card p-6 space-y-4 bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target 10 Jt/Bulan</span>
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
                    {neededTx.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">Total Transaksi</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold font-mono text-emerald-600 tracking-tight tabular-nums">
                    {neededPerDay}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">Order / Hari</div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 leading-relaxed">
                Diperlukan rata-rata <strong>{neededPerDay} pesanan per hari</strong> dengan margin laba saat ini untuk mencapai target profit Rp 10.000.000 per bulan.
              </p>
            </div>

          </div>

        </div>

        {/* EDIT SELLER MODAL IN QUANT */}
        {editingSellerQuant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="app-card rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl bg-white border-slate-200 text-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Pencil className="w-4 h-4 text-emerald-600" />
                  <span>Edit Supplier — {gameTitle}</span>
                </div>
                <button
                  onClick={() => setEditingSellerQuant(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs font-sans">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nama Toko Seller</label>
                  <input
                    type="text"
                    value={editingSellerQuant.name}
                    onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Harga Modal G2G (IDR)</label>
                    <input
                      type="number"
                      value={editingSellerQuant.price_idr}
                      onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, price_idr: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Strategi Tier</label>
                    <select
                      value={editingSellerQuant.tier}
                      onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, tier: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white cursor-pointer"
                    >
                      <option value="ultra_safe">Tier 1: 🛡️ Top Verified</option>
                      <option value="lowest_price">Tier 2: ⚡ Lowest Price</option>
                      <option value="mid_level">Tier 3: ⚖️ Mid-Level</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Rating Toko (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingSellerQuant.rating_pct}
                      onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, rating_pct: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Total Ulasan</label>
                    <input
                      type="number"
                      value={editingSellerQuant.reviews}
                      onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, reviews: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingSellerQuant(null)}
                  disabled={isSavingEditSellerQuant}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditSellerQuant}
                  disabled={isSavingEditSellerQuant || !editingSellerQuant.name.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEditSellerQuant ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Competitor Modal */}
        {isCompetitorModalOpen && (
          <ShopeeCompetitorModal
            isOpen={isCompetitorModalOpen}
            onClose={() => setIsCompetitorModalOpen(false)}
            gameTitle={gameTitle}
            platform={platform}
            currentPriceIdr={effectiveSellingPrice}
            costG2gIdr={cogsG2gIdr}
            onApplyPrice={(newPrice) => {
              setSellingPrice(newPrice);
              setCalcMode('fixed_price');
              setIsCompetitorModalOpen(false);
            }}
          />
        )}

      </div>
    </div>
  );
}

export default function QuantPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8 text-slate-500 font-mono text-xs">
        Memuat The Quant Profit Calculator...
      </div>
    }>
      <QuantCalculatorContent />
    </Suspense>
  );
}

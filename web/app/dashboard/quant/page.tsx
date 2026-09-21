"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  DollarSign, Sliders, Activity, ArrowLeft, ArrowRight, Target, 
  TrendingUp, Calculator, Zap, ChevronRight, QrCode, ShieldCheck, 
  ExternalLink, Layers, Sparkles, Plus, Check, Save, RotateCcw,
  Store, AlertCircle, Info, Tag, CheckCircle2, RefreshCw, Trash2,
  ChevronDown, ChevronUp, Pencil, FileText, ShoppingBag
} from 'lucide-react';
import { getG2GSellerUrl } from '@/lib/g2g';
import ShopeeCompetitorModal from '@/app/components/ShopeeCompetitorModal';

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

export default function QuantPage() {
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
  const [packaging, setPackaging] = useState(2000); // Amplop + sertifikat garansi
  
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
  const [pulse, setPulse] = useState(false);
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

  // Fetch live catalog data — stable, called only on mount or explicit refresh
  const fetchCatalogData = useCallback(async (applyToUI = true): Promise<any[]> => {
    try {
      const res = await fetch('/api/catalog');
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setCatalogGames(json.data);

        if (applyToUI) {
          if (json.data.length > 0) {
            const matched = json.data.find((g: any) => g.id === currentGameId) || json.data[0];

            if (matched) {
              setCurrentGameId(matched.id);
              setActivePreset(matched.id);
              setGameTitle(matched.title);
              setPlatform(matched.platform);
              setCategory(matched.category);
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
          } else {
            // Clean empty state when catalog is empty
            setCurrentGameId('');
            setActivePreset('');
            setGameTitle('Game Baru (Simulasi)');
            setPlatform('Steam');
            setCategory('Digital Key / Account');
            setSellingPrice(150000);
            setTargetMarginPct(25);
            setSellers([]);
            setCogsG2gIdr(100000);
          }
        }
        return json.data;
      }
    } catch (err) {
      console.error('Failed to load initial catalog:', err);
    }
    return [];
  }, [currentGameId]);

  useEffect(() => {
    fetchCatalogData(true);
  }, []);

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

  const selectedSeller = sellers.find(s => s.is_selected) || sellers[0];

  useEffect(() => {
    if (selectedSeller) {
      setCogsG2gIdr(selectedSeller.price_idr);
    }
  }, [selectedSeller?.id, selectedSeller?.price_idr]);

  // Calculations
  const qrisFeeIdr = Math.round(cogsG2gIdr * (qrisFeePct / 100));
  const modalBersih = cogsG2gIdr + qrisFeeIdr;
  const fixedTotalCost = modalBersih + shopeeFixedFee + packaging;

  const calculatedRecommendedPrice = useMemo(() => {
    const adminDecimal = shopeeAdminPct / 100;
    const targetMarginDecimal = targetMarginPct / 100;
    const denominator = 1 - adminDecimal - targetMarginDecimal;
    
    if (denominator <= 0.05) return 999000;
    const rawPrice = fixedTotalCost / denominator;
    const roundedThousand = Math.ceil(rawPrice / 1000) * 1000;
    return roundedThousand > 900 ? roundedThousand - 100 : roundedThousand;
  }, [fixedTotalCost, shopeeAdminPct, targetMarginPct]);

  const effectiveSellingPrice = calcMode === 'target_margin' ? calculatedRecommendedPrice : sellingPrice;

  const potonganShopee = Math.round(effectiveSellingPrice * (shopeeAdminPct / 100)) + shopeeFixedFee;
  const totalCost = modalBersih + potonganShopee + packaging;
  const profitBersih = effectiveSellingPrice - totalCost;
  const netMargin = effectiveSellingPrice > 0 ? (profitBersih / effectiveSellingPrice) * 100 : 0;

  const breakEvenPrice = Math.round(fixedTotalCost / (1 - (shopeeAdminPct / 100)));

  const targetBulanan = 10000000;
  const neededTx = profitBersih > 0 ? Math.ceil(targetBulanan / profitBersih) : 0;
  const neededPerDay = neededTx > 0 ? Math.ceil(neededTx / 30) : 0;

  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 300);
    return () => clearTimeout(timer);
  }, [effectiveSellingPrice, cogsG2gIdr, qrisFeePct, shopeeAdminPct, packaging, calcMode]);

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
      await fetch('/api/catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: currentGameId,
          title: gameTitle,
          selected_seller_id: id
        })
      });
      setAutoSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error('Failed to auto-save selected seller', e);
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
        fetchCatalogData();
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
        const selectedSeller =
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
          g2gIdr: Number(selectedSeller.price_g2g_idr || selectedSeller.price_idr) || 100000,
          margin: Number(g.target_margin_pct) || 20,
          seller: selectedSeller.seller_name || selectedSeller.name || 'G2G Seller',
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
      }
    } catch (_) { }
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

  const handleSelectTierStrategy = (tier: 'ultra_safe' | 'lowest_price' | 'mid_level') => {
    const match = sellers.find(s => s.tier === tier);
    if (match) handleSelectSeller(match.id);
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
  }, [effectiveSellingPrice, targetMarginPct, currentGameId, selectedSeller?.id]);

  const handleSaveToCatalog = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        action: 'add',
        id: currentGameId,
        title: gameTitle,
        platform: platform,
        category: category,
        selling_price_shopee_idr: effectiveSellingPrice,
        target_margin_pct: Math.round(netMargin * 10) / 10,
        selected_seller_id: selectedSeller?.id || sellers[0]?.id || 'g2g-s1',
        sellers: sellers.map((s, idx) => ({
          seller_id: s.id || `g2g-s-${idx}`,
          seller_name: s.name,
          rating_pct: s.rating_pct,
          reviews_count: s.reviews,
          price_g2g_idr: s.price_idr,
          delivery_speed: s.delivery,
          tier: s.tier || 'mid_level',
          tier_label: s.tier_label || '⚖️ Mid-Level',
          tier_desc: s.tier_desc || '',
          stock: 25,
          risk_score: 0,
          is_recommended: s.is_selected,
          profile_url: getG2GSellerUrl(s.name, gameTitle)
        }))
      };

      const res = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveStatus('saved');
        setAutoSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('id-ID'));
        setSaveMessage(`Berhasil menyimpan "${gameTitle}" ke Radar Portofolio!`);
        setTimeout(() => setSaveStatus('idle'), 4000);
        fetchCatalogData();
      } else {
        setSaveStatus('error');
        setSaveMessage('Gagal menyimpan ke database catalog.');
        setTimeout(() => setSaveStatus('idle'), 4000);
      }
    } catch (e: any) {
      setSaveStatus('error');
      setSaveMessage(e.message || 'Terjadi kesalahan jaringan.');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const sensitivityScenarios = useMemo(() => {
    const deltas = [-20000, -10000, 0, 10000, 20000];
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
    <div className="px-5 sm:px-8 py-8 max-w-[960px] mx-auto space-y-7">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 font-mono transition-colors">
              <ArrowLeft className="w-3 h-3" /> Command Deck
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-[11px] font-mono text-slate-400">The Quant</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            The Quant — Profit Calculator
          </h1>
          <p className="text-[13px] text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Simulasi profitabilitas real-time untuk <span className="text-slate-300 font-medium">game apapun</span>. 
            Mendukung dual mode, penambahan seller G2G instan, auto-save sinkronisasi ke disk, dan integrasi ke Radar Portofolio.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full bg-zinc-950 border border-white/[0.06]">
            {autoSaveStatus === 'saving' ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400">Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-400">
                  Auto-Save {lastSavedTime ? `(${lastSavedTime})` : ''}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/description?game=${encodeURIComponent(gameTitle)}`}
              className="px-3 py-2 rounded-xl text-xs font-mono font-medium bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 transition-all flex items-center gap-1.5"
              title="Buat Deskripsi Shopee untuk game ini"
            >
              <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
              <span className="hidden sm:inline">Deskripsi Shopee</span>
            </Link>
            <button
              onClick={handleSaveToCatalog}
              disabled={saveStatus === 'saving'}
              className="v0-btn-primary bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Menyimpan...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="w-4 h-4 inline mr-2" /> Tersimpan!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 inline mr-2" /> Simpan ke Portofolio
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {saveStatus === 'saved' && (
        <div className="fixed bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:max-w-md z-50 p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/30 text-sm text-emerald-300 font-mono flex items-center gap-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
          <Link href="/dashboard/catalog" className="underline hover:text-white ml-2">Lihat Radar &rarr;</Link>
        </div>
      )}

      {/* Game Preset Tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-sm font-semibold text-white tracking-tight whitespace-nowrap flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" /> Presets
          </h2>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-white/[0.08] to-transparent" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {presets.length === 0 ? (
            <div className="p-4 rounded-xl border border-white/[0.06] bg-zinc-950/40 text-xs text-slate-400 flex items-center justify-between w-full">
              <span>Portofolio masih kosong. Tambahkan game baru di <Link href="/dashboard/catalog" className="text-emerald-400 underline font-medium">Katalog Radar</Link> atau ketik langsung di bawah.</span>
              <Link href="/dashboard/catalog" className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono hover:bg-emerald-500/20 whitespace-nowrap ml-4">
                + Tambah Game
              </Link>
            </div>
          ) : (
            presets.map((p) => {
              const live = catalogGames.find(g => g.id === p.catalogId || g.title.toLowerCase().includes(p.id));
              const displayPrice = live ? live.selling_price_shopee_idr : p.price;
              const displayMargin = live ? live.target_margin_pct : p.margin;

              return (
                <button
                  key={p.id}
                  onClick={() => handlePreset(p)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs transition-all border ${
                    activePreset === p.id 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-zinc-950/60 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.1]'
                  }`}
                >
                  <div className="font-semibold text-left">{p.title.split(':')[0]}</div>
                  <div className="flex items-center gap-3 mt-1 font-mono text-[10px]">
                    <span className={activePreset === p.id ? 'text-emerald-300' : 'text-slate-500'}>{formatRp(displayPrice)}</span>
                    <span className={activePreset === p.id ? 'text-emerald-400 font-bold' : 'text-emerald-500/70'}>{displayMargin}%</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950/60 border border-white/[0.06] w-full sm:w-max">
        <button
          onClick={() => setCalcMode('fixed_price')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            calcMode === 'fixed_price'
              ? 'bg-white/10 text-white border border-white/[0.1]' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Mode A: Harga Jual &rarr; Margin
        </button>
        <button
          onClick={() => setCalcMode('target_margin')}
          className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
            calcMode === 'target_margin'
              ? 'bg-white/10 text-white border border-white/[0.1]' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Mode B: Target Margin &rarr; Harga
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-7">
          
          <div className="v0-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" /> Identitas Game & Lisensi
              </h2>
              <div className="flex items-center gap-2">
                {catalogGames.length > 0 && (
                  <select
                    value={currentGameId}
                    onChange={(e) => {
                      const selected = catalogGames.find(g => g.id === e.target.value);
                      if (selected) {
                        const p = presets.find(pr => pr.catalogId === selected.id) || {
                          id: selected.id,
                          catalogId: selected.id,
                          title: selected.title,
                          platform: selected.platform,
                          category: selected.category,
                          price: selected.selling_price_shopee_idr,
                          margin: selected.target_margin_pct,
                          sellers: selected.sellers
                        };
                        handlePreset(p);
                      }
                    }}
                    className="text-[11px] font-mono bg-zinc-900 border border-white/[0.1] text-emerald-400 px-2 py-1 rounded-lg focus:outline-none"
                  >
                    <option value="" disabled>-- Pilih Portofolio ({catalogGames.length} Game) --</option>
                    {catalogGames.map(g => (
                      <option key={g.id} value={g.id} className="bg-zinc-950 text-white">
                        {g.title} ({formatRp(g.selling_price_shopee_idr)})
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-1 rounded-md border border-white/[0.06]">ID: {currentGameId || 'NEW'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
              <div className="sm:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-medium">Nama Produk</label>
                  {researchMsg && <span className="text-[10px] text-emerald-400 font-mono">{researchMsg}</span>}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gameTitle}
                    onChange={(e) => {
                      setGameTitle(e.target.value);
                      setActivePreset('custom');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAutoResearchQuant();
                      }
                    }}
                    placeholder="Contoh: Monster Hunter Wilds"
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2 text-sm font-mono text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAutoResearchQuant}
                    disabled={isResearching || !gameTitle.trim()}
                    className="v0-btn-secondary px-3 rounded-xl flex items-center justify-center disabled:opacity-50"
                  >
                    {isResearching ? <RotateCcw className="w-4 h-4 animate-spin text-slate-400" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3 space-y-2">
                <label className="text-xs text-slate-400 font-medium">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-600 transition-all appearance-none cursor-pointer"
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

              <div className="sm:col-span-3 space-y-2">
                <label className="text-xs text-slate-400 font-medium">Format Lisensi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-600 transition-all appearance-none cursor-pointer"
                >
                  <option value="Account (Full Access)">Full Access Account</option>
                  <option value="Digital Key / CDKey">Digital CDKey (Global)</option>
                  <option value="Steam Gift">Steam Gift</option>
                  <option value="In-Game Asset / Key">Item In-Game / Keys</option>
                </select>
              </div>
            </div>
          </div>

          <div className="v0-card rounded-2xl p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" /> Parameter Penjualan
              </h2>
              <button
                type="button"
                onClick={() => setIsCompetitorModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 transition-all shadow-sm"
                title="Cek Radar Kompetitor Shopee & AI Pricing Advisor"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                <span>Radar Kompetitor Shopee</span>
              </button>
            </div>

            {calcMode === 'fixed_price' ? (
              <div className="space-y-4 p-4 rounded-xl bg-black/40 border border-white/[0.04]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Harga Jual di Shopee (IDR)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">Rp</span>
                    <input
                      type="number"
                      step="1000"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Math.max(10000, Number(e.target.value)))}
                      className="w-32 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500/50 transition-all"
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
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
              </div>
            ) : (
              <div className="space-y-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-emerald-400">
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
                      className="w-24 bg-zinc-950/80 border border-emerald-900 rounded-lg px-3 py-1.5 text-sm font-mono text-emerald-400 text-right focus:outline-none focus:border-emerald-500/50 transition-all"
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
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                />
                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-emerald-900/50">
                  <span className="text-slate-400">Rekomendasi Harga Jual:</span>
                  <span className="text-base font-bold text-emerald-400">{formatRp(calculatedRecommendedPrice)}</span>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" /> Supplier G2G
                </label>
                <button
                  onClick={() => setShowAddSeller(!showAddSeller)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-mono text-slate-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Seller
                </button>
              </div>

              {showAddSeller && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.06] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1.5 font-semibold uppercase tracking-wider">Nama Toko</label>
                      <input
                        type="text"
                        value={newSellerName}
                        onChange={(e) => setNewSellerName(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-600 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1.5 font-semibold uppercase tracking-wider">Harga (IDR)</label>
                      <input
                        type="number"
                        value={newSellerPrice}
                        onChange={(e) => setNewSellerPrice(Number(e.target.value))}
                        className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-zinc-600 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1.5 font-semibold uppercase tracking-wider">Tier</label>
                      <select
                        value={newSellerTier}
                        onChange={(e: any) => setNewSellerTier(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-zinc-600 transition-all appearance-none cursor-pointer"
                      >
                        <option value="ultra_safe">🛡️ Top Verified</option>
                        <option value="lowest_price">⚡ Lowest Price</option>
                        <option value="mid_level">⚖️ Mid-Level</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1.5 font-semibold uppercase tracking-wider">Rating & Revs</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={newSellerRating}
                          onChange={(e) => setNewSellerRating(Number(e.target.value))}
                          className="w-16 bg-black/40 border border-zinc-800 rounded-lg px-2 py-2 text-xs font-mono text-zinc-100 text-center focus:outline-none focus:border-zinc-600 transition-all"
                        />
                        <input
                          type="number"
                          value={newSellerReviews}
                          onChange={(e) => setNewSellerReviews(Number(e.target.value))}
                          className="flex-1 bg-black/40 border border-zinc-800 rounded-lg px-2 py-2 text-xs font-mono text-zinc-100 text-right focus:outline-none focus:border-zinc-600 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => setShowAddSeller(false)}
                      className="px-4 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleAddSeller}
                      disabled={isAddingSeller || !newSellerName.trim()}
                      className="px-4 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isAddingSeller ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Simpan
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectTierStrategy('ultra_safe')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-mono text-left transition-all border ${
                    selectedSeller?.tier === 'ultra_safe'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-black/20 hover:bg-white/[0.02] text-slate-400 hover:text-emerald-400 border-white/[0.06]'
                  }`}
                >
                  <div className="font-semibold">🛡️ Top Verified</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTierStrategy('lowest_price')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-mono text-left transition-all border ${
                    selectedSeller?.tier === 'lowest_price'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-black/20 hover:bg-white/[0.02] text-slate-400 hover:text-amber-400 border-white/[0.06]'
                  }`}
                >
                  <div className="font-semibold">⚡ Lowest Price</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTierStrategy('mid_level')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-mono text-left transition-all border ${
                    selectedSeller?.tier === 'mid_level'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-black/20 hover:bg-white/[0.02] text-slate-400 hover:text-purple-400 border-white/[0.06]'
                  }`}
                >
                  <div className="font-semibold">⚖️ Mid-Level</div>
                </button>
              </div>

              <div className="space-y-3">
                {sellers.map((s) => {
                  const sQris = Math.round(s.price_idr * (qrisFeePct / 100));
                  const sNetCost = s.price_idr + sQris + potonganShopee + packaging;
                  const sProfit = effectiveSellingPrice - sNetCost;
                  const sMargin = effectiveSellingPrice > 0 ? (sProfit / effectiveSellingPrice) * 100 : 0;

                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSeller(s.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        s.is_selected
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : 'bg-black/20 border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.1]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          s.is_selected ? 'border-emerald-400 bg-emerald-500 text-black' : 'border-zinc-700'
                        }`}>
                          {s.is_selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{s.name}</span>
                            {s.tier === 'ultra_safe' && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">🛡️ VERIFIED</span>}
                            {s.tier === 'lowest_price' && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">⚡ LOW PRICE</span>}
                            {s.tier === 'mid_level' && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">⚖️ MID</span>}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                            <span>★ {s.rating_pct}%</span>
                            <span>•</span>
                            <span>{s.reviews.toLocaleString()} revs</span>
                            <span>•</span>
                            <a 
                              href={getG2GSellerUrl(s.name, gameTitle)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                            >
                              G2G <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right font-mono">
                          <div className="text-xs text-slate-400 mb-1">
                            Modal: <span className="text-slate-300">{formatRp(s.price_idr)}</span>
                          </div>
                          <div className="flex items-center sm:justify-end gap-3 text-xs">
                            <span className={sProfit > 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>{formatRp(sProfit)}</span>
                            <span className={`px-1.5 py-0.5 rounded ${sMargin >= 20 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {formatNum(sMargin)}%
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSellerQuant({
                              id: s.id,
                              name: s.name,
                              price_idr: s.price_idr,
                              rating_pct: s.rating_pct,
                              reviews: s.reviews,
                              delivery: s.delivery || 'Instant Delivery',
                              tier: s.tier || 'mid_level'
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/20"
                          title="Edit detail seller ini"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="v0-card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white flex items-center gap-2 font-mono">
                <Activity className="w-4 h-4 text-emerald-400" /> Sensitivitas Harga
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left min-w-[320px]">
                <thead className="bg-black/20 border-b border-white/[0.06]">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-widest">Skenario</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-widest">Harga</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-widest">Profit</th>
                    <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-widest text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sensitivityScenarios.map((sc: any) => (
                    <tr key={sc.delta} className={sc.isCurrent ? 'bg-emerald-500/5' : 'hover:bg-white/[0.02]'}>
                      <td className="px-5 py-3">
                        {sc.delta === 0 ? <span className="text-emerald-400 font-bold">CURRENT</span> : <span className="text-slate-400">{sc.delta > 0 ? '+' : ''}{formatRp(sc.delta)}</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-200">{formatRp(sc.price)}</td>
                      <td className={`px-5 py-3 ${sc.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatRp(sc.profit)}</td>
                      <td className={`px-5 py-3 text-right ${sc.margin >= 20 ? 'text-emerald-400' : sc.margin >= 10 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {formatNum(sc.margin)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 space-y-7">
          
          <div className={`v0-card rounded-2xl p-6 space-y-6 card-division-quant transition-transform ${pulse ? 'scale-[1.02]' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">Profit Laba / Unit</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>Harga Jual</span>
                <span className="font-semibold">{formatRp(effectiveSellingPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Modal ({selectedSeller?.name.substring(0, 10)}...)</span>
                <span>- {formatRp(cogsG2gIdr)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>QRIS ({qrisFeePct}%)</span>
                <span>- {formatRp(qrisFeeIdr)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Shopee ({shopeeAdminPct}%)</span>
                <span>- {formatRp(potonganShopee)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Packaging</span>
                <span>- {formatRp(packaging)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] text-center space-y-2">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Net Profit</div>
              <div className={`text-3xl font-bold font-mono tracking-tight ${profitBersih > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatRp(profitBersih)}
              </div>
              <div className={`inline-block px-2 py-1 rounded border text-xs font-mono font-bold ${
                netMargin >= 20 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                netMargin >= 10 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
                'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                Margin: {formatNum(netMargin)}%
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Break-Even (BEP):</span>
              <span className="font-semibold text-slate-300">{formatRp(breakEvenPrice)}</span>
            </div>
          </div>

          <div className="v0-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">Target 10Jt/Bln</span>
              <div className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-2xl font-bold font-mono text-white tracking-tight">{neededTx}</div>
                <div className="text-[10px] font-mono text-slate-500">Total Transaksi</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">{neededPerDay}</div>
                <div className="text-[10px] font-mono text-slate-500">Order / Hari</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* EDIT SELLER MODAL IN QUANT */}
      {editingSellerQuant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="v0-card rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl border-amber-500/30 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-mono">
                <Pencil className="w-4 h-4" />
                <span>Edit Supplier G2G — {gameTitle}</span>
              </div>
              <button
                onClick={() => setEditingSellerQuant(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Nama Toko Seller</label>
                <input
                  type="text"
                  value={editingSellerQuant.name}
                  onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Harga Modal G2G (IDR)</label>
                  <input
                    type="number"
                    value={editingSellerQuant.price_idr}
                    onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, price_idr: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Strategi Tier</label>
                  <select
                    value={editingSellerQuant.tier}
                    onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, tier: e.target.value })}
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
                    value={editingSellerQuant.rating_pct}
                    onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, rating_pct: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Total Ulasan</label>
                  <input
                    type="number"
                    value={editingSellerQuant.reviews}
                    onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, reviews: Number(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Kecepatan Pengiriman</label>
                <input
                  type="text"
                  value={editingSellerQuant.delivery}
                  onChange={(e) => setEditingSellerQuant({ ...editingSellerQuant, delivery: e.target.value })}
                  placeholder="Instant Delivery"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingSellerQuant(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-slate-300 text-xs font-mono transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditSellerQuant}
                disabled={isSavingEditSellerQuant || !editingSellerQuant.name.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold font-mono transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingEditSellerQuant ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shopee Competitor Intelligence Modal */}
      {isCompetitorModalOpen && (
        <ShopeeCompetitorModal
          isOpen={isCompetitorModalOpen}
          onClose={() => setIsCompetitorModalOpen(false)}
          gameTitle={gameTitle}
          platform={platform}
          currentPriceIdr={sellingPrice}
          costG2gIdr={cogsG2gIdr}
          onApplyPrice={(newPrice) => {
            setSellingPrice(newPrice);
            setPulse(true);
            setTimeout(() => setPulse(false), 800);
          }}
        />
      )}
    </div>
  );
}

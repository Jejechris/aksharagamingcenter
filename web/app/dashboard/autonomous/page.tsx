"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Zap, Send, Smartphone, Mail, ShoppingBag, CheckCircle2,
  Clock, ShieldCheck, Copy, ExternalLink, RefreshCw, Sliders,
  Plus, Check, ArrowLeft, Store, FileText, Search, Filter,
  Trash2, Eye, EyeOff, Key, Terminal, AlertTriangle, MessageSquare,
  Sparkles, CheckCheck, Database, Archive, Layers, Upload,
  AlertCircle, Edit3, DollarSign, Box
} from "lucide-react";

interface AutonomousOrder {
  id: string;
  order_id: string;
  created_at: string;
  channel: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string;
  game_title: string;
  platform: string;
  category: string;
  price_idr: number;
  credentials: {
    username: string;
    password: string;
    serial_warranty: string;
    vault_id?: string;
    source_mode?: string;
    notes: string;
  };
  status: "PENDING" | "PROCESSED" | "DISPATCHED";
  dispatched_channels: string[];
  messages: {
    whatsapp: string;
    gmail_subject: string;
    gmail_body: string;
    shopee_chat: string;
  };
}

interface VaultItem {
  id: string;
  game_title: string;
  platform: string;
  category: string;
  username: string;
  password: string;
  cost_idr: number;
  supplier_name: string;
  status: "AVAILABLE" | "RESERVED" | "DISPATCHED";
  added_at: string;
  dispatched_at?: string;
  assigned_order_id?: string;
  notes?: string;
}

interface CatalogItem {
  id: string;
  title: string;
  platform: string;
  category: string;
  selling_price_shopee_idr: number;
  target_margin_pct: number;
  sellers?: Array<{
    seller_id: string;
    seller_name: string;
    price_g2g_idr: number;
    is_selected?: boolean;
  }>;
}

export default function AutonomousFulfillmentPage() {
  // Navigation & Tab Switcher
  const [mainTab, setMainTab] = useState<"dispatch" | "vault">("dispatch");

  // Dynamic Catalog Portfolio Integration
  const [catalogGames, setCatalogGames] = useState<CatalogItem[]>([]);

  // Orders State
  const [orders, setOrders] = useState<AutonomousOrder[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [autoPilotOn, setAutoPilotOn] = useState(true);

  // Vault (Mode A) State
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [vaultStats, setVaultStats] = useState<any>(null);
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [vaultStatusFilter, setVaultStatusFilter] = useState<"ALL" | "AVAILABLE" | "DISPATCHED">("ALL");
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Vault Modals
  const [showAddVaultModal, setShowAddVaultModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editingVaultItem, setEditingVaultItem] = useState<VaultItem | null>(null);

  // Vault Form States (Single Add)
  const [vFormGame, setVFormGame] = useState("Minecraft: Java & Bedrock Edition");
  const [vFormPlatform, setVFormPlatform] = useState("PC / Microsoft");
  const [vFormCategory, setVFormCategory] = useState("Account (Full Access)");
  const [vFormUser, setVFormUser] = useState("");
  const [vFormPass, setVFormPass] = useState("");
  const [vFormCost, setVFormCost] = useState(125000);
  const [vFormSupplier, setVFormSupplier] = useState("HellenWong (G2G)");
  const [vFormNotes, setVFormNotes] = useState("Buffer stock siap kirim");

  // Bulk Import Form States
  const [bulkRaw, setBulkRaw] = useState("");
  const [bulkGame, setBulkGame] = useState("Minecraft: Java & Bedrock Edition");
  const [bulkPlatform, setBulkPlatform] = useState("PC / Microsoft");
  const [bulkCategory, setBulkCategory] = useState("Account (Full Access)");
  const [bulkCost, setBulkCost] = useState(125000);
  const [bulkSupplier, setBulkSupplier] = useState("G2G Verified");

  // Orders Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PROCESSED" | "DISPATCHED">("ALL");

  // Order Detail Inspector Modal
  const [inspectOrder, setInspectOrder] = useState<AutonomousOrder | null>(null);
  const [inspectTab, setInspectTab] = useState<"whatsapp" | "gmail" | "shopee" | "credentials">("whatsapp");
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual Order Form States
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formGame, setFormGame] = useState("Minecraft: Java & Bedrock Edition");
  const [formPlatform, setFormPlatform] = useState("PC / Microsoft");
  const [formPrice, setFormPrice] = useState(219900);
  const [formChannel, setFormChannel] = useState("Shopee");
  const [formUseVault, setFormUseVault] = useState(true);

  // Toast Notification
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Fetch catalog games to connect portfolio dynamically
  const fetchCatalog = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        setCatalogGames(json.data);
        if (json.data.length > 0) {
          const first = json.data[0];
          setVFormGame(first.title);
          setVFormPlatform(first.platform);
          setVFormCategory(first.category);
          const firstSeller = first.sellers?.find((s: any) => s.is_selected) || first.sellers?.[0];
          if (firstSeller) {
            setVFormCost(firstSeller.price_g2g_idr);
            setVFormSupplier(firstSeller.seller_name);
            setBulkCost(firstSeller.price_g2g_idr);
            setBulkSupplier(firstSeller.seller_name);
          }
          setBulkGame(first.title);
          setBulkPlatform(first.platform);
          setBulkCategory(first.category);
          setFormGame(first.title);
          setFormPlatform(first.platform);
          setFormPrice(first.selling_price_shopee_idr);
        }
      }
    } catch (e) {
      console.error("Failed to load catalog into autonomous page:", e);
    }
  }, []);

  // Fetch orders with localStorage hydration
  const fetchOrders = useCallback(async () => {
    try {
      try {
        const stored = localStorage.getItem("akshara_autonomous_orders_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) setOrders(parsed);
        }
      } catch(e) {}

      const res = await fetch("/api/orders/autonomous");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.orders)) {
        setOrders(json.orders);
        setStats(json.stats);
        try { localStorage.setItem("akshara_autonomous_orders_v1", JSON.stringify(json.orders)); } catch(e) {}
      }
    } catch (e) {
      console.error("Failed to fetch autonomous orders:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch vault items with localStorage hydration
  const fetchVault = useCallback(async () => {
    setIsVaultLoading(true);
    try {
      try {
        const stored = localStorage.getItem("akshara_inventory_vault_v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) setVaultItems(parsed);
        }
      } catch(e) {}

      const res = await fetch("/api/inventory/vault");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.items)) {
        setVaultItems(json.items);
        setVaultStats(json.stats);
        try { localStorage.setItem("akshara_inventory_vault_v1", JSON.stringify(json.items)); } catch(e) {}
      }
    } catch (e) {
      console.error("Failed to fetch vault items:", e);
    } finally {
      setIsVaultLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchVault();
    fetchCatalog();
    const timer = setInterval(() => {
      fetchOrders();
      fetchVault();
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchOrders, fetchVault, fetchCatalog]);

  // Format Indonesian Phone Number for WhatsApp Link
  const formatPhoneForWa = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("08")) {
      clean = "628" + clean.substring(2);
    } else if (clean.startsWith("8")) {
      clean = "628" + clean.substring(1);
    }
    return clean;
  };

  // Trigger WhatsApp Dispatch
  const handleDispatchWhatsApp = async (order: AutonomousOrder) => {
    const waPhone = formatPhoneForWa(order.buyer_phone);
    const waText = encodeURIComponent(order.messages.whatsapp);
    const waUrl = `https://wa.me/${waPhone}?text=${waText}`;

    window.open(waUrl, "_blank");

    try {
      const res = await fetch("/api/orders/autonomous", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, channel: "WhatsApp" })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === order.id ? {
          ...o,
          status: "DISPATCHED",
          dispatched_channels: Array.from(new Set([...(o.dispatched_channels || []), "WhatsApp"]))
        } : o));
        showToast(`✅ WhatsApp siap kirim ke ${order.buyer_name}!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Gmail Dispatch
  const handleDispatchGmail = async (order: AutonomousOrder) => {
    const email = encodeURIComponent(order.buyer_email);
    const subject = encodeURIComponent(order.messages.gmail_subject);
    const body = encodeURIComponent(order.messages.gmail_body);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

    window.open(gmailUrl, "_blank");

    try {
      const res = await fetch("/api/orders/autonomous", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, channel: "Gmail" })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === order.id ? {
          ...o,
          status: "DISPATCHED",
          dispatched_channels: Array.from(new Set([...(o.dispatched_channels || []), "Gmail"]))
        } : o));
        showToast(`✅ Draft Gmail berhasil disiapkan untuk ${order.buyer_email}!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Copy Shopee Message
  const handleCopyShopeeChat = async (order: AutonomousOrder) => {
    navigator.clipboard.writeText(order.messages.shopee_chat);
    try {
      await fetch("/api/orders/autonomous", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, channel: "Shopee" })
      });
      setOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        status: "DISPATCHED",
        dispatched_channels: Array.from(new Set([...(o.dispatched_channels || []), "Shopee"]))
      } : o));
    } catch (e) {}
    showToast(`📋 Chat Shopee berhasil disalin ke clipboard!`);
  };

  // Simulate or Create Order
  const handleSimulateOrder = async (preset: {
    buyer_name: string;
    buyer_phone: string;
    buyer_email: string;
    game_title: string;
    platform: string;
    price_idr: number;
    channel: string;
    use_vault?: boolean;
  }) => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/orders/autonomous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset)
      });
      const json = await res.json();
      if (json.status === "success" && json.order) {
        setOrders(prev => [json.order, ...prev]);
        fetchVault(); // Refresh vault to sync consumed stock
        const sourceNotice = json.order.credentials?.vault_id
          ? ` (Dialokasikan dari Brankas #${json.order.credentials.vault_id})`
          : "";
        showToast(`⚡ Pesanan (${json.order.order_id}) diproses${sourceNotice}!`);
      }
    } catch (e) {
      showToast("Gagal memproses pesanan.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Delete order
  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus pesanan ini dari antrean otonom?")) return;
    try {
      const res = await fetch(`/api/orders/autonomous?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setOrders(prev => prev.filter(o => o.id !== id));
        showToast("Pesanan dihapus.");
      }
    } catch (e) {}
  };

  // Add Single Item to Vault
  const handleAddSingleVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vFormUser.trim()) {
      showToast("Username / Email wajib diisi!");
      return;
    }
    try {
      const res = await fetch("/api/inventory/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_title: vFormGame,
          platform: vFormPlatform,
          category: vFormCategory,
          username: vFormUser.trim(),
          password: vFormPass.trim(),
          cost_idr: vFormCost,
          supplier_name: vFormSupplier,
          notes: vFormNotes
        })
      });
      const json = await res.json();
      if (json.status === "success") {
        showToast(`✅ ${json.message}`);
        setShowAddVaultModal(false);
        setVFormUser("");
        setVFormPass("");
        fetchVault();
      }
    } catch (e) {
      showToast("Gagal menambahkan unit ke brankas.");
    }
  };

  // Bulk Import to Vault
  const handleBulkImportVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkRaw.trim()) {
      showToast("Masukkan data kredensial massal terlebih dahulu!");
      return;
    }
    try {
      const res = await fetch("/api/inventory/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulk_raw: bulkRaw,
          game_title: bulkGame,
          platform: bulkPlatform,
          category: bulkCategory,
          cost_idr: bulkCost,
          supplier_name: bulkSupplier,
          notes: "Impor massal Mode A"
        })
      });
      const json = await res.json();
      if (json.status === "success") {
        showToast(`⚡ ${json.message}`);
        setShowBulkImportModal(false);
        setBulkRaw("");
        fetchVault();
      }
    } catch (e) {
      showToast("Gagal melakukan impor massal.");
    }
  };

  // Delete item from Vault
  const handleDeleteVaultItem = async (id: string) => {
    if (!confirm(`Hapus unit ${id} dari brankas stok?`)) return;
    try {
      const res = await fetch(`/api/inventory/vault?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setVaultItems(prev => prev.filter(i => i.id !== id));
        fetchVault();
        showToast("Unit dihapus dari brankas.");
      }
    } catch (e) {}
  };

  // Toggle Mask Password in Vault Table
  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatRp = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);
  };

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.game_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyer_phone.includes(searchQuery) ||
      o.buyer_email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Vault Items
  const filteredVaultItems = vaultItems.filter(item => {
    const matchesSearch =
      item.game_title.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      item.username.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      item.supplier_name.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      (item.assigned_order_id && item.assigned_order_id.toLowerCase().includes(vaultSearchQuery.toLowerCase()));
    const matchesStatus = vaultStatusFilter === "ALL" || item.status === vaultStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const availableVaultCount = vaultItems.filter(i => i.status === "AVAILABLE").length;
  const dispatchedVaultCount = vaultItems.filter(i => i.status === "DISPATCHED").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Link href="/dashboard" className="hover:text-zinc-200 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Command Deck
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-200 font-medium">Auto-Fulfillment & Vault</span>
            <span className="text-zinc-600">/</span>
            <span className="text-emerald-400 font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Mode A & JIT Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoPilotOn(!autoPilotOn)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border flex items-center gap-2 ${
                autoPilotOn
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoPilotOn ? "text-emerald-400 animate-bounce" : "text-zinc-500"}`} />
              <span>Auto-Pilot: {autoPilotOn ? "ON (OTONOM)" : "PAUSED"}</span>
            </button>

            <Link
              href="/dashboard/catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" /> Radar Portofolio ({catalogGames.length})
            </Link>
            <Link
              href="/dashboard/description"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-fuchsia-400" /> Deskripsi Maker
            </Link>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-gradient-to-r from-emerald-950/25 via-zinc-900 to-transparent p-6 rounded-2xl border border-emerald-500/20">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                <Zap className="w-5 h-5" />
              </div>
              Autonomous Fulfillment & Buffer Vault
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
              Arsitektur pemenuhan pesanan otonom: gabungan <span className="text-emerald-400 font-semibold">Mode A (Brankas Stok Buffer / 0 Detik)</span> dengan <span className="text-amber-400 font-semibold">Mode JIT</span> untuk pengiriman otomatis via WhatsApp, Gmail, dan Shopee Chat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {mainTab === "vault" ? (
              <>
                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>Impor Massal (Bulk Paste)</span>
                </button>
                <button
                  onClick={() => setShowAddVaultModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Stok Satuan</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowManualModal(true)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono font-semibold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Input Order Manual</span>
              </button>
            )}
          </div>
        </div>

        {/* Master Navigation Switcher: Tab Dispatch vs Tab Vault (Mode A) */}
        <div className="flex items-center gap-3 p-1.5 bg-zinc-900/80 rounded-2xl border border-zinc-800/80 max-w-xl">
          <button
            onClick={() => setMainTab("dispatch")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
              mainTab === "dispatch"
                ? "bg-zinc-800 text-white shadow-md border border-zinc-700/60"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Send className="w-4 h-4 text-emerald-400" />
            <span>Antrean Dispatch Live</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-300 text-[10px] border border-zinc-700">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setMainTab("vault")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
              mainTab === "vault"
                ? "bg-emerald-950/50 text-emerald-300 shadow-md border border-emerald-500/40"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Brankas Stok Buffer (Mode A)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 text-[10px] border border-emerald-800/60 font-bold">
              {availableVaultCount} Ready
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ANTREAN DISPATCH LIVE                                              */}
        {/* ========================================================================= */}
        {mainTab === "dispatch" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Quick Simulator Test Strip */}
            <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Simulasi Order Masuk (Mode A Auto-Consumes Buffer Vault):
                </div>
                <span className="text-[11px] font-mono text-zinc-500">Klik untuk uji eksekusi instan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleSimulateOrder({
                    buyer_name: "Kak Dimas Prasetyo",
                    buyer_phone: "081234567890",
                    buyer_email: "dimas.prasetyo@gmail.com",
                    game_title: "Minecraft: Java & Bedrock Edition",
                    platform: "PC / Microsoft",
                    price_idr: 219900,
                    channel: "Shopee",
                    use_vault: true
                  })}
                  disabled={isSimulating}
                  className="p-2.5 rounded-xl bg-zinc-950/80 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-500/40 text-left transition-all text-xs font-mono group disabled:opacity-50"
                >
                  <div className="font-bold text-zinc-200 group-hover:text-emerald-400 flex items-center justify-between">
                    <span>Minecraft (Kak Dimas)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Vault Auto</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">Rp 219.900 • Shopee IMAP</div>
                </button>

                <button
                  onClick={() => handleSimulateOrder({
                    buyer_name: "Kak Rian Kurniawan",
                    buyer_phone: "085712345678",
                    buyer_email: "rian.kurniawan@gmail.com",
                    game_title: "Grand Theft Auto V: Enhanced Edition",
                    platform: "Rockstar / Steam",
                    price_idr: 149000,
                    channel: "Shopee",
                    use_vault: true
                  })}
                  disabled={isSimulating}
                  className="p-2.5 rounded-xl bg-zinc-950/80 hover:bg-amber-950/30 border border-zinc-800 hover:border-amber-500/40 text-left transition-all text-xs font-mono group disabled:opacity-50"
                >
                  <div className="font-bold text-zinc-200 group-hover:text-amber-400 flex items-center justify-between">
                    <span>GTA V (Kak Rian)</span>
                    <span className="text-[10px] text-amber-400 font-normal">Vault Ready</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">Rp 149.000 • Shopee Direct</div>
                </button>

                <button
                  onClick={() => handleSimulateOrder({
                    buyer_name: "Kak Satria Ramadhan",
                    buyer_phone: "081987654321",
                    buyer_email: "satria.ramadhan@gmail.com",
                    game_title: "Terraria",
                    platform: "Steam",
                    price_idr: 39900,
                    channel: "WhatsApp Web",
                    use_vault: true
                  })}
                  disabled={isSimulating}
                  className="p-2.5 rounded-xl bg-zinc-950/80 hover:bg-fuchsia-950/30 border border-zinc-800 hover:border-fuchsia-500/40 text-left transition-all text-xs font-mono group disabled:opacity-50"
                >
                  <div className="font-bold text-zinc-200 group-hover:text-fuchsia-400 flex items-center justify-between">
                    <span>Terraria (Kak Satria)</span>
                    <span className="text-[10px] text-fuchsia-400 font-normal">Multi-Channel</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">Rp 39.900 • Web Direct</div>
                </button>

                <button
                  onClick={() => handleSimulateOrder({
                    buyer_name: "Kak Budi Santoso",
                    buyer_phone: "082198765432",
                    buyer_email: "budi.santoso@gmail.com",
                    game_title: "Black Myth: Wukong Standard Edition",
                    platform: "Steam",
                    price_idr: 349000,
                    channel: "Shopee",
                    use_vault: true
                  })}
                  disabled={isSimulating}
                  className="p-2.5 rounded-xl bg-zinc-950/80 hover:bg-purple-950/30 border border-zinc-800 hover:border-purple-500/40 text-left transition-all text-xs font-mono group disabled:opacity-50"
                >
                  <div className="font-bold text-zinc-200 group-hover:text-purple-400 flex items-center justify-between">
                    <span>Wukong (Kak Budi)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Full Auto</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">Rp 349.000 • Shopee Mall</div>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>TOTAL ORDER OTONOM</span>
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-2">
                  {stats?.total_orders || orders.length}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Diproses sistem</div>
              </div>

              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>DISPATCH WHATSAPP</span>
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                  {orders.filter(o => o.dispatched_channels?.includes("WhatsApp")).length}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">1-Click Direct WA API</div>
              </div>

              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>DISPATCH GMAIL</span>
                  <Mail className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                  {orders.filter(o => o.dispatched_channels?.includes("Gmail")).length}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Direct Web Composer</div>
              </div>

              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>STOK BUFFER READY</span>
                  <Database className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
                  {availableVaultCount} Unit
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Mode A Instant Vault</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari order, pembeli, game, no HP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs font-mono">
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === "ALL" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Semua ({orders.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("PROCESSED")}
                    className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === "PROCESSED" ? "bg-amber-950/60 text-amber-400 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Pending ({orders.filter(o => o.status === "PROCESSED").length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("DISPATCHED")}
                    className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === "DISPATCHED" ? "bg-emerald-950/60 text-emerald-400 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Terkirim ({orders.filter(o => o.status === "DISPATCHED").length})
                  </button>
                </div>

                <button
                  onClick={fetchOrders}
                  className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Orders Feed */}
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20">
                <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <div className="font-mono text-sm text-zinc-400">Belum ada pesanan dalam antrean</div>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                  Gunakan tombol simulasi di atas atau input manual untuk menguji proses fulfillment otonom.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isDispatched = order.status === "DISPATCHED";
                  const isWaDispatched = order.dispatched_channels?.includes("WhatsApp");
                  const isGmailDispatched = order.dispatched_channels?.includes("Gmail");
                  const isShopeeDispatched = order.dispatched_channels?.includes("Shopee");

                  return (
                    <div
                      key={order.id}
                      onClick={() => setInspectOrder(order)}
                      className={`v0-card rounded-2xl p-4 md:p-5 border transition-all cursor-pointer hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900/80 ${
                        isDispatched ? "border-zinc-800/80 opacity-90" : "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Order & Game Info */}
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300">
                              {order.order_id}
                            </span>
                            <span className="font-mono text-[11px] text-zinc-500">
                              {order.created_at}
                            </span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {order.channel}
                            </span>
                            {order.credentials?.vault_id && (
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/50 text-emerald-300 flex items-center gap-1">
                                <Database className="w-3 h-3 text-emerald-400" /> Mode A Vault ({order.credentials.vault_id})
                              </span>
                            )}
                            <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold flex items-center gap-1 ${
                              isDispatched ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60" : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                            }`}>
                              {isDispatched ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              {isDispatched ? "DISPATCHED" : "READY TO DISPATCH"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              <span>{order.game_title}</span>
                              <span className="text-xs font-normal text-zinc-400 font-mono">[{order.platform}]</span>
                            </div>
                            <span className="text-xs font-mono text-emerald-400 font-semibold">
                              {formatRp(order.price_idr)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
                            <span className="flex items-center gap-1 text-zinc-300">
                              👤 {order.buyer_name}
                            </span>
                            <span className="flex items-center gap-1 text-zinc-500">
                              📱 {order.buyer_phone}
                            </span>
                            <span className="flex items-center gap-1 text-zinc-500">
                              ✉️ {order.buyer_email}
                            </span>
                            <span className="flex items-center gap-1 text-zinc-500">
                              🔑 {order.credentials?.username}
                            </span>
                          </div>
                        </div>

                        {/* 1-Click Action Dispatch Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* WhatsApp Button */}
                          <button
                            onClick={() => handleDispatchWhatsApp(order)}
                            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
                              isWaDispatched
                                ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/50"
                                : "bg-emerald-600 hover:bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-950/40"
                            }`}
                            title="Kirim kredensial via WhatsApp"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>{isWaDispatched ? "Sent WA ✓" : "Kirim WA"}</span>
                          </button>

                          {/* Gmail Button */}
                          <button
                            onClick={() => handleDispatchGmail(order)}
                            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 border ${
                              isGmailDispatched
                                ? "bg-rose-950/40 border-rose-800/40 text-rose-300 hover:bg-rose-900/50"
                                : "bg-zinc-900 hover:bg-zinc-800 text-rose-400 border-rose-900/50"
                            }`}
                            title="Kirim data via Gmail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>{isGmailDispatched ? "Drafted ✓" : "Gmail"}</span>
                          </button>

                          {/* Shopee Chat Copy Button */}
                          <button
                            onClick={() => handleCopyShopeeChat(order)}
                            className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 border ${
                              isShopeeDispatched
                                ? "bg-amber-950/40 border-amber-800/40 text-amber-300"
                                : "bg-zinc-900 hover:bg-zinc-800 text-amber-400 border-amber-900/50"
                            }`}
                            title="Salin chat Shopee"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isShopeeDispatched ? "Chat Copied ✓" : "Shopee Chat"}</span>
                          </button>

                          {/* Detail & Delete */}
                          <button
                            onClick={() => setInspectOrder(order)}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                            title="Lihat pesan lengkap"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => handleDeleteOrder(order.id, e)}
                            className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-800"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BRANKAS STOK BUFFER (MODE A - PRE-STOCKING)                        */}
        {/* ========================================================================= */}
        {mainTab === "vault" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Vault Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>TOTAL UNIT DI BRANKAS</span>
                  <Database className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-white mt-2">
                  {vaultStats?.total_items || vaultItems.length}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Akun / Kunci Digital</div>
              </div>

              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>SIAP DISPATCH (READY)</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                  {vaultStats?.available_items || availableVaultCount}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Instant 0 Detik Delivery</div>
              </div>

              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>SUDAH TERKIRIM</span>
                  <Layers className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-blue-400 mt-2">
                  {vaultStats?.dispatched_items || dispatchedVaultCount}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Teralokasi ke Pembeli</div>
              </div>

              <div className="v0-card rounded-2xl p-4 border-zinc-800/80 bg-zinc-900/40">
                <div className="text-[11px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>NILAI ASET MODAL</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-2">
                  {formatRp(vaultStats?.total_capital_value_idr || 0)}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Modal Stok Aktif</div>
              </div>
            </div>

            {/* Low-Stock Warning Strip */}
            {vaultStats?.low_stock_alerts && vaultStats.low_stock_alerts.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-xs font-mono">
                    <span className="font-bold text-amber-300">Peringatan Buffer Stok: </span>
                    <span className="text-zinc-300">
                      Ada {vaultStats.low_stock_alerts.length} game dengan stok sisa &le; 2 unit:{" "}
                    </span>
                    <span className="text-amber-400 font-semibold">
                      {vaultStats.low_stock_alerts.map((a: any) => `${a.game_title} (${a.available_count} tersisa)`).join(", ")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold shrink-0 transition-colors"
                >
                  Restock Sekarang &rarr;
                </button>
              </div>
            )}

            {/* Vault Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800/80">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari game, username, ID unit, supplier..."
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs font-mono">
                  <button
                    onClick={() => setVaultStatusFilter("ALL")}
                    className={`px-3 py-1 rounded-lg transition-colors ${vaultStatusFilter === "ALL" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Semua ({vaultItems.length})
                  </button>
                  <button
                    onClick={() => setVaultStatusFilter("AVAILABLE")}
                    className={`px-3 py-1 rounded-lg transition-colors ${vaultStatusFilter === "AVAILABLE" ? "bg-emerald-950/60 text-emerald-400 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Ready ({availableVaultCount})
                  </button>
                  <button
                    onClick={() => setVaultStatusFilter("DISPATCHED")}
                    className={`px-3 py-1 rounded-lg transition-colors ${vaultStatusFilter === "DISPATCHED" ? "bg-blue-950/60 text-blue-400 font-bold" : "text-zinc-400 hover:text-zinc-200"}`}
                  >
                    Terkirim ({dispatchedVaultCount})
                  </button>
                </div>

                <button
                  onClick={fetchVault}
                  className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Muat ulang brankas"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Vault Inventory Table */}
            <div className="v0-card rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[680px]">
                  <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">ID Unit & Game</th>
                      <th className="p-3.5">Kredensial / Akun</th>
                      <th className="p-3.5">Modal & Supplier</th>
                      <th className="p-3.5">Status Brankas</th>
                      <th className="p-3.5">Order / Tanggal</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredVaultItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          Tidak ada unit stok ditemukan di brankas.
                        </td>
                      </tr>
                    ) : (
                      filteredVaultItems.map((item) => {
                        const isAvailable = item.status === "AVAILABLE";
                        const isRevealed = revealedPasswords[item.id] || false;

                        return (
                          <tr key={item.id} className="hover:bg-zinc-900/80 transition-colors">
                            <td className="p-3.5 align-top">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <Box className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{item.game_title}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                                <span className="font-semibold text-zinc-400">{item.id}</span>
                                <span>•</span>
                                <span>{item.platform}</span>
                                <span>•</span>
                                <span>{item.category}</span>
                              </div>
                            </td>

                            <td className="p-3.5 align-top">
                              <div className="flex items-center gap-1.5 text-zinc-200">
                                <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                                  {item.username}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.username);
                                    showToast("Username disalin!");
                                  }}
                                  className="text-zinc-500 hover:text-zinc-300"
                                  title="Salin username"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 text-zinc-400 mt-1">
                                <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                                  {isRevealed ? item.password : "••••••••••••"}
                                </span>
                                <button
                                  onClick={() => toggleRevealPassword(item.id)}
                                  className="text-zinc-500 hover:text-zinc-300"
                                  title={isRevealed ? "Sembunyikan" : "Tampilkan"}
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.password);
                                    showToast("Password disalin!");
                                  }}
                                  className="text-zinc-500 hover:text-zinc-300"
                                  title="Salin password"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            <td className="p-3.5 align-top">
                              <div className="font-bold text-amber-400">
                                {formatRp(item.cost_idr)}
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">
                                {item.supplier_name || "G2G"}
                              </div>
                            </td>

                            <td className="p-3.5 align-top">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isAvailable
                                  ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/60"
                                  : "bg-blue-950/70 text-blue-400 border border-blue-800/60"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-blue-400"}`} />
                                {item.status}
                              </span>
                            </td>

                            <td className="p-3.5 align-top text-zinc-400 text-[11px]">
                              {item.assigned_order_id ? (
                                <div>
                                  <span className="text-blue-400 font-semibold">{item.assigned_order_id}</span>
                                  <div className="text-[10px] text-zinc-600 mt-0.5">{item.dispatched_at}</div>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-zinc-500">Deposit Masuk</span>
                                  <div className="text-[10px] text-zinc-600 mt-0.5">{item.added_at}</div>
                                </div>
                              )}
                            </td>

                            <td className="p-3.5 align-top text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${item.username}:${item.password}`);
                                    showToast("Kredensial lengkap disalin (user:pass)!");
                                  }}
                                  className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                                  title="Salin format user:password"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteVaultItem(item.id)}
                                  className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 border border-zinc-800"
                                  title="Hapus unit ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: DETAIL / INSPECTOR PESANAN TERPILIH                               */}
        {/* ========================================================================= */}
        {inspectOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm font-mono text-white">
                    Inspector Kredensial & Pesan Otonom
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    ({inspectOrder.order_id})
                  </span>
                </div>
                <button
                  onClick={() => setInspectOrder(null)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center border-b border-zinc-800 bg-zinc-950 px-4 pt-2 gap-2 text-xs font-mono">
                <button
                  onClick={() => setInspectTab("whatsapp")}
                  className={`pb-2 px-3 border-b-2 font-bold transition-all ${
                    inspectTab === "whatsapp"
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  📱 Format WhatsApp
                </button>
                <button
                  onClick={() => setInspectTab("gmail")}
                  className={`pb-2 px-3 border-b-2 font-bold transition-all ${
                    inspectTab === "gmail"
                      ? "border-rose-500 text-rose-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  ✉️ Format Gmail
                </button>
                <button
                  onClick={() => setInspectTab("shopee")}
                  className={`pb-2 px-3 border-b-2 font-bold transition-all ${
                    inspectTab === "shopee"
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  🛍️ Shopee Chat
                </button>
                <button
                  onClick={() => setInspectTab("credentials")}
                  className={`pb-2 px-3 border-b-2 font-bold transition-all ${
                    inspectTab === "credentials"
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  🔑 Kredensial Lisensi
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 font-mono text-xs space-y-3">
                {inspectTab === "whatsapp" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Nomor Tujuan: {inspectOrder.buyer_phone}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inspectOrder.messages.whatsapp);
                          showToast("Teks WA disalin!");
                        }}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Salin Teks WA
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-96 overflow-y-auto">
                      {inspectOrder.messages.whatsapp}
                    </pre>
                  </div>
                )}

                {inspectTab === "gmail" && (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
                      <div className="text-[10px] text-zinc-500">SUBJECT EMAIL:</div>
                      <div className="font-semibold text-white">{inspectOrder.messages.gmail_subject}</div>
                    </div>
                    <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-80 overflow-y-auto">
                      {inspectOrder.messages.gmail_body}
                    </pre>
                  </div>
                )}

                {inspectTab === "shopee" && (
                  <div className="space-y-2">
                    <div className="text-zinc-400 text-[11px] flex justify-between">
                      <span>Anti-ban compliant (tanpa link luar / no WA)</span>
                      <button
                        onClick={() => handleCopyShopeeChat(inspectOrder)}
                        className="text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Salin Chat Shopee
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 whitespace-pre-wrap font-sans text-xs leading-relaxed">
                      {inspectOrder.messages.shopee_chat}
                    </pre>
                  </div>
                )}

                {inspectTab === "credentials" && (
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase">Username / Email Akun</div>
                        <div className="text-sm font-bold text-white mt-1 bg-zinc-950 p-2 rounded border border-zinc-800 select-all">
                          {inspectOrder.credentials.username}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase">Password Akun</div>
                        <div className="text-sm font-bold text-emerald-400 mt-1 bg-zinc-950 p-2 rounded border border-zinc-800 select-all">
                          {inspectOrder.credentials.password}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Kode Serial Garansi Toko</div>
                      <div className="text-xs font-bold text-amber-300 mt-1 bg-zinc-950 p-2 rounded border border-zinc-800 select-all">
                        {inspectOrder.credentials.serial_warranty}
                      </div>
                    </div>

                    {inspectOrder.credentials?.vault_id && (
                      <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Unit ini dialokasikan dari <strong>Brankas Stok Buffer #{inspectOrder.credentials.vault_id}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">
                  Status: <strong className="text-emerald-400">{inspectOrder.status}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDispatchWhatsApp(inspectOrder)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs font-mono flex items-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Kirim WA Sekarang
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: TAMBAH STOK SATUAN KE BRANKAS (MODE A)                           */}
        {/* ========================================================================= */}
        {showAddVaultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm font-mono text-white">Tambah Unit ke Brankas Stok (Mode A)</span>
                </div>
                <button
                  onClick={() => setShowAddVaultModal(false)}
                  className="text-zinc-500 hover:text-white text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSingleVault} className="space-y-3 text-xs font-mono">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400">Judul Game</label>
                    {catalogGames.length > 0 && (
                      <span className="text-[10px] text-emerald-400 font-medium">✨ Terhubung Portofolio</span>
                    )}
                  </div>
                  {catalogGames.length > 0 && (
                    <select
                      onChange={(e) => {
                        const sel = catalogGames.find(g => g.id === e.target.value);
                        if (sel) {
                          setVFormGame(sel.title);
                          setVFormPlatform(sel.platform);
                          setVFormCategory(sel.category);
                          const activeSeller = sel.sellers?.find((s: any) => s.is_selected) || sel.sellers?.[0];
                          if (activeSeller) {
                            setVFormCost(activeSeller.price_g2g_idr);
                            setVFormSupplier(activeSeller.seller_name);
                          }
                        }
                      }}
                      className="w-full bg-zinc-900 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-emerald-300 mb-2 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Pilih dari Portofolio ({catalogGames.length} Game) --</option>
                      {catalogGames.map(g => (
                        <option key={g.id} value={g.id}>{g.title} ({g.platform})</option>
                      ))}
                    </select>
                  )}
                  <input
                    type="text"
                    value={vFormGame}
                    onChange={(e) => setVFormGame(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: Monster Hunter Wilds"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Platform</label>
                    <input
                      type="text"
                      value={vFormPlatform}
                      onChange={(e) => setVFormPlatform(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Kategori</label>
                    <select
                      value={vFormCategory}
                      onChange={(e) => setVFormCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Account (Full Access)">Account (Full Access)</option>
                      <option value="CDKey / Digital Key">CDKey / Digital Key</option>
                      <option value="Steam Gift">Steam Gift</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Email / Username / Key</label>
                    <input
                      type="text"
                      value={vFormUser}
                      onChange={(e) => setVFormUser(e.target.value)}
                      placeholder="account@outlook.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Password</label>
                    <input
                      type="text"
                      value={vFormPass}
                      onChange={(e) => setVFormPass(e.target.value)}
                      placeholder="SecretPassword"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Modal Beli Supplier (IDR)</label>
                    <input
                      type="number"
                      value={vFormCost}
                      onChange={(e) => setVFormCost(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-amber-400 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Supplier (G2G/Lainnya)</label>
                    <input
                      type="text"
                      value={vFormSupplier}
                      onChange={(e) => setVFormSupplier(e.target.value)}
                      placeholder="HellenWong"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    value={vFormNotes}
                    onChange={(e) => setVFormNotes(e.target.value)}
                    placeholder="Full access, siap ganti email pribadi"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddVaultModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-mono"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs font-mono flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan ke Brankas</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: IMPOR MASSAL (BULK PASTE MODE A)                                 */}
        {/* ========================================================================= */}
        {showBulkImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-sm font-mono text-white">Impor Massal Brankas (Bulk Paste)</span>
                </div>
                <button
                  onClick={() => setShowBulkImportModal(false)}
                  className="text-zinc-500 hover:text-white text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBulkImportVault} className="space-y-3 text-xs font-mono">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400">Game Target</label>
                    {catalogGames.length > 0 && (
                      <span className="text-[10px] text-purple-400 font-medium">✨ Terhubung Portofolio</span>
                    )}
                  </div>
                  {catalogGames.length > 0 && (
                    <select
                      onChange={(e) => {
                        const sel = catalogGames.find(g => g.id === e.target.value);
                        if (sel) {
                          setBulkGame(sel.title);
                          setBulkPlatform(sel.platform);
                          setBulkCategory(sel.category);
                          const activeSeller = sel.sellers?.find((s: any) => s.is_selected) || sel.sellers?.[0];
                          if (activeSeller) {
                            setBulkCost(activeSeller.price_g2g_idr);
                            setBulkSupplier(activeSeller.seller_name);
                          }
                        }
                      }}
                      className="w-full bg-zinc-900 border border-purple-500/40 rounded-xl px-3.5 py-2 text-purple-300 mb-2 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Pilih dari Portofolio ({catalogGames.length} Game) --</option>
                      {catalogGames.map(g => (
                        <option key={g.id} value={g.id}>{g.title} ({g.platform})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Judul</label>
                    <input
                      type="text"
                      value={bulkGame}
                      onChange={(e) => setBulkGame(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Platform</label>
                    <input
                      type="text"
                      value={bulkPlatform}
                      onChange={(e) => setBulkPlatform(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Modal per Unit (IDR)</label>
                    <input
                      type="number"
                      value={bulkCost}
                      onChange={(e) => setBulkCost(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-amber-400 font-bold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Supplier</label>
                    <input
                      type="text"
                      value={bulkSupplier}
                      onChange={(e) => setBulkSupplier(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400">Paste Kredensial (1 baris per akun):</label>
                    <span className="text-[10px] text-zinc-500">Format: user:pass atau user|pass</span>
                  </div>
                  <textarea
                    rows={6}
                    value={bulkRaw}
                    onChange={(e) => setBulkRaw(e.target.value)}
                    placeholder={`acc_alpha_01@outlook.com:PassAlpha123!
acc_alpha_02@outlook.com:PassAlpha456!
acc_alpha_03@outlook.com:PassAlpha789!`}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-200 font-mono text-xs focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowBulkImportModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-mono"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-purple-950/50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Eksekusi Impor Massal</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: INPUT ORDER MANUAL (DENGAN TOGGLE MODE A BRANKAS)                */}
        {/* ========================================================================= */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm font-mono text-white">Input Pesanan Masuk</span>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-zinc-500 hover:text-white text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                {/* Mode A Vault Toggle */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-bold text-emerald-300 text-xs">Prioritaskan Brankas Stok (Mode A)</div>
                      <div className="text-[10px] text-zinc-400">Ambil kredensial instan dari stok ready</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formUseVault}
                    onChange={(e) => setFormUseVault(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Nama Pembeli</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Kak Alvin"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">No. WhatsApp</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Email (Gmail)</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="buyer@gmail.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-400">Game Terpilih</label>
                    {catalogGames.length > 0 && (
                      <span className="text-[10px] text-emerald-400 font-medium">✨ Auto-Fill Portofolio</span>
                    )}
                  </div>
                  {catalogGames.length > 0 && (
                    <select
                      onChange={(e) => {
                        const sel = catalogGames.find(g => g.id === e.target.value);
                        if (sel) {
                          setFormGame(sel.title);
                          setFormPlatform(sel.platform);
                          setFormPrice(sel.selling_price_shopee_idr);
                        }
                      }}
                      className="w-full bg-zinc-900 border border-emerald-500/40 rounded-xl px-3.5 py-2 text-emerald-300 mb-2 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Pilih dari Portofolio ({catalogGames.length} Game) --</option>
                      {catalogGames.map(g => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.platform}) - Rp {g.selling_price_shopee_idr.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Game</label>
                    <input
                      type="text"
                      value={formGame}
                      onChange={(e) => setFormGame(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Platform</label>
                    <input
                      type="text"
                      value={formPlatform}
                      onChange={(e) => setFormPlatform(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Harga (IDR)</label>
                    <input
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-amber-400 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Channel</label>
                    <select
                      value={formChannel}
                      onChange={(e) => setFormChannel(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-zinc-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Shopee">Shopee</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Tokopedia">Tokopedia</option>
                      <option value="Website">Website</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-mono"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!formName.trim()) return;
                    await handleSimulateOrder({
                      buyer_name: formName,
                      buyer_phone: formPhone || "081234567890",
                      buyer_email: formEmail || "buyer@gmail.com",
                      game_title: formGame,
                      platform: formPlatform,
                      price_idr: formPrice,
                      channel: formChannel,
                      use_vault: formUseVault
                    });
                    setShowManualModal(false);
                    setFormName("");
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs font-mono flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Proses Otomatis Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-zinc-900/95 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

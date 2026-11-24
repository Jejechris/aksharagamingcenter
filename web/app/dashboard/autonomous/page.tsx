"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchSmartCatalog } from "@/lib/catalogClient";
import Link from "next/link";
import {
  Zap,
  Send,
  Smartphone,
  Mail,
  ShoppingBag,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Copy,
  ExternalLink,
  RefreshCw,
  Plus,
  Check,
  Search,
  Filter,
  Trash2,
  Eye,
  EyeOff,
  Key,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Database,
  Upload,
  AlertCircle,
  Edit3,
  DollarSign,
  Box,
  ChevronDown,
  X,
  Layers,
  Inbox,
  ArrowRight,
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
    serial_warranty?: string;
    claim_code?: string;
    passcode?: string;
    vault_id?: string;
    source_mode?: string;
    notes?: string;
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

function formatRp(val: number) {
  return Math.round(val || 0).toLocaleString("id-ID");
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
  const [showSimulationPanel, setShowSimulationPanel] = useState(false);

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
      const mergedData = await fetchSmartCatalog();
      if (mergedData && mergedData.length > 0) {
        setCatalogGames(mergedData);
        const first = mergedData[0];
        setVFormGame(first.title);
        setVFormPlatform(first.platform);
        setVFormCategory(first.category);
        const firstSeller = first.sellers?.find((s) => s.is_selected) || first.sellers?.[0];
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
      } catch (e) {}

      const res = await fetch("/api/orders/autonomous");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.orders)) {
        setOrders(json.orders);
        setStats(json.stats);
        try {
          localStorage.setItem("akshara_autonomous_orders_v1", JSON.stringify(json.orders));
        } catch (e) {}
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
      } catch (e) {}

      const res = await fetch("/api/inventory/vault");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.items)) {
        setVaultItems(json.items);
        setVaultStats(json.stats);
        try {
          localStorage.setItem("akshara_inventory_vault_v1", JSON.stringify(json.items));
        } catch (e) {}
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
    const waText = encodeURIComponent(order.messages?.whatsapp || "");
    const waUrl = `https://wa.me/${waPhone}?text=${waText}`;

    window.open(waUrl, "_blank");

    try {
      const res = await fetch("/api/orders/autonomous", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, channel: "WhatsApp" }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: "DISPATCHED",
                  dispatched_channels: Array.from(new Set([...(o.dispatched_channels || []), "WhatsApp"])),
                }
              : o
          )
        );
        showToast(`✅ WhatsApp siap kirim ke ${order.buyer_name}!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Trigger Gmail Dispatch
  const handleDispatchGmail = async (order: AutonomousOrder) => {
    const email = encodeURIComponent(order.buyer_email);
    const subject = encodeURIComponent(order.messages?.gmail_subject || "");
    const body = encodeURIComponent(order.messages?.gmail_body || "");
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

    window.open(gmailUrl, "_blank");

    try {
      const res = await fetch("/api/orders/autonomous", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, channel: "Gmail" }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  status: "DISPATCHED",
                  dispatched_channels: Array.from(new Set([...(o.dispatched_channels || []), "Gmail"])),
                }
              : o
          )
        );
        showToast(`✅ Draft Gmail siap untuk ${order.buyer_email}!`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Copy Shopee Message
  const handleCopyShopeeChat = async (order: AutonomousOrder) => {
    navigator.clipboard.writeText(order.messages?.shopee_chat || "");
    try {
      await fetch("/api/orders/autonomous", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, channel: "Shopee" }),
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "DISPATCHED",
                dispatched_channels: Array.from(new Set([...(o.dispatched_channels || []), "Shopee"])),
              }
            : o
        )
      );
    } catch (e) {}
    showToast(`📋 Chat Shopee berhasil disalin ke clipboard!`);
  };

  // Delete Order
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Hapus pesanan ini dari antrean dispatch?")) return;
    try {
      const res = await fetch(`/api/orders/autonomous?id=${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        showToast("Pesanan berhasil dihapus.");
      }
    } catch (e) {
      showToast("Gagal menghapus pesanan.");
    }
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
        body: JSON.stringify(preset),
      });
      const json = await res.json();
      if (json.status === "success" && json.order) {
        setOrders((prev) => [json.order, ...prev]);
        fetchVault();
        const sourceNotice = json.order.credentials?.vault_id
          ? ` (Dialokasikan dari Brankas #${json.order.credentials.vault_id})`
          : "";
        showToast(`⚡ Pesanan (${json.order.order_id}) diproses${sourceNotice}!`);
      }
    } catch (e) {
      showToast("Gagal memproses pesanan simulasi.");
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle Manual Order Submission
  const handleManualOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formGame.trim()) {
      showToast("Nama pembeli dan judul game wajib diisi.");
      return;
    }
    await handleSimulateOrder({
      buyer_name: formName,
      buyer_phone: formPhone || "081234567890",
      buyer_email: formEmail || `${formName.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
      game_title: formGame,
      platform: formPlatform,
      price_idr: Number(formPrice) || 199000,
      channel: formChannel,
      use_vault: formUseVault,
    });
    setShowManualModal(false);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
  };

  // Save or Update Vault Item
  const handleSaveVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vFormUser.trim() || !vFormPass.trim()) {
      showToast("Username dan password wajib diisi.");
      return;
    }

    const payload = {
      id: editingVaultItem ? editingVaultItem.id : undefined,
      game_title: vFormGame,
      platform: vFormPlatform,
      category: vFormCategory,
      username: vFormUser.trim(),
      password: vFormPass.trim(),
      cost_idr: Number(vFormCost) || 100000,
      supplier_name: vFormSupplier || "G2G Verified",
      notes: vFormNotes || "",
    };

    try {
      const res = await fetch("/api/inventory/vault", {
        method: editingVaultItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.status === "success") {
        fetchVault();
        setShowAddVaultModal(false);
        setEditingVaultItem(null);
        setVFormUser("");
        setVFormPass("");
        showToast(editingVaultItem ? "Item brankas diperbarui!" : "Stok brankas berhasil ditambahkan!");
      } else {
        showToast(json.error || "Gagal menyimpan item brankas.");
      }
    } catch (err) {
      showToast("Terjadi kesalahan jaringan.");
    }
  };

  // Bulk Import Vault Items
  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkRaw.trim()) {
      showToast("Isi data akun terlebih dahulu.");
      return;
    }

    const lines = bulkRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const itemsToImport: any[] = [];
    for (const line of lines) {
      let u = "";
      let p = "";
      let n = "";

      if (line.includes(":")) {
        const parts = line.split(":");
        u = parts[0]?.trim() || "";
        p = parts[1]?.trim() || "";
        n = parts.slice(2).join(":").trim();
      } else if (line.includes(",")) {
        const parts = line.split(",");
        u = parts[0]?.trim() || "";
        p = parts[1]?.trim() || "";
        n = parts.slice(2).join(",").trim();
      } else if (line.includes("|")) {
        const parts = line.split("|");
        u = parts[0]?.trim() || "";
        p = parts[1]?.trim() || "";
        n = parts.slice(2).join("|").trim();
      }

      if (u && p) {
        itemsToImport.push({
          game_title: bulkGame,
          platform: bulkPlatform,
          category: bulkCategory,
          username: u,
          password: p,
          cost_idr: Number(bulkCost) || 100000,
          supplier_name: bulkSupplier || "G2G Bulk Import",
          notes: n || "Impor massal",
        });
      }
    }

    if (itemsToImport.length === 0) {
      showToast("Format tidak valid. Gunakan format username:password per baris.");
      return;
    }

    try {
      let successCount = 0;
      for (const item of itemsToImport) {
        const res = await fetch("/api/inventory/vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (res.ok) successCount++;
      }
      fetchVault();
      setShowBulkImportModal(false);
      setBulkRaw("");
      showToast(`✅ Berhasil mengimpor ${successCount} item ke brankas!`);
    } catch (e) {
      showToast("Gagal melakukan impor massal.");
    }
  };

  // Delete Vault Item
  const handleDeleteVaultItem = async (itemId: string) => {
    if (!confirm("Hapus item ini dari brankas stok?")) return;
    try {
      const res = await fetch(`/api/inventory/vault?id=${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setVaultItems((prev) => prev.filter((v) => v.id !== itemId));
        showToast("Item brankas berhasil dihapus.");
      }
    } catch (e) {
      showToast("Gagal menghapus item brankas.");
    }
  };

  // Calculations for Vault metrics
  const availableVaultCount = vaultItems.filter((i) => i.status === "AVAILABLE").length;
  const dispatchedVaultCount = vaultItems.filter((i) => i.status === "DISPATCHED").length;
  const totalCostReady = vaultItems
    .filter((i) => i.status === "AVAILABLE")
    .reduce((acc, curr) => acc + (Number(curr.cost_idr) || 0), 0);

  // Group vault by game to check low stock
  const vaultByGame: Record<string, number> = {};
  vaultItems.forEach((item) => {
    if (item.status === "AVAILABLE") {
      vaultByGame[item.game_title] = (vaultByGame[item.game_title] || 0) + 1;
    }
  });
  const lowStockGames = Object.entries(vaultByGame).filter(([, count]) => count <= 2);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.buyer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.order_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.game_title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ? true : statusFilter === "PROCESSED" ? o.status === "PROCESSED" || o.status === "PENDING" : o.status === "DISPATCHED";
    return matchesSearch && matchesStatus;
  });

  // Filtered Vault
  const filteredVault = vaultItems.filter((v) => {
    const matchesSearch =
      (v.game_title || "").toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      (v.username || "").toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
      (v.supplier_name || "").toLowerCase().includes(vaultSearchQuery.toLowerCase());
    const matchesStatus = vaultStatusFilter === "ALL" ? true : v.status === vaultStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ─── 1. Header Halaman ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Auto-Fulfillment &amp; Buffer Vault
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Mode A Vault + JIT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Otomasi pemenuhan pesanan Shopee &amp; Direct: dispatch instan dari brankas stok (Mode A) dan approval JIT HITL via Telegram.
          </p>
        </div>

        {/* Action Buttons Right */}
        <div className="flex items-center gap-2.5">
          {mainTab === "dispatch" ? (
            <>
              <button
                type="button"
                onClick={() => setShowSimulationPanel(!showSimulationPanel)}
                className="btn-secondary text-xs font-medium px-3 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <span>Simulasi Uji Coba</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    showSimulationPanel ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="btn-primary-emerald text-xs font-semibold px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Input Order Manual</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(true)}
                className="btn-secondary text-xs font-medium px-3 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Impor Massal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingVaultItem(null);
                  setVFormUser("");
                  setVFormPass("");
                  setShowAddVaultModal(true);
                }}
                className="btn-primary-emerald text-xs font-semibold px-3.5 py-2 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Stok Satuan</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── 2. Segmented Tab Switcher (Clean Light Pill) ─── */}
      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMainTab("dispatch")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            mainTab === "dispatch"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span>Antrean Dispatch ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("vault")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            mainTab === "vault"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>Brankas Stok Buffer ({availableVaultCount} Ready)</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════ */}
      {/* TAB 1: ANTREAN DISPATCH                                   */}
      {/* ═════════════════════════════════════════════════════════ */}
      {mainTab === "dispatch" && (
        <div className="space-y-6">
          {/* Collapsible Panel Simulasi (Default Tertutup) */}
          {showSimulationPanel && (
            <div className="app-card p-5 border-l-4 border-l-emerald-500 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Simulasi Ingestion Order Cepat
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Uji coba alur pemenuhan pesanan instan. Jika stok tersedia di brankas, kredensial langsung teralokasi otomatis.
                  </p>
                </div>
                <button
                  onClick={() => setShowSimulationPanel(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {[
                  {
                    title: "Terraria (Steam Account)",
                    buyer: "Kak Dimas",
                    phone: "081234567890",
                    price: 99000,
                    platform: "PC / Steam Key",
                  },
                  {
                    title: "Minecraft: Java & Bedrock Edition",
                    buyer: "Kak Rian",
                    phone: "089876543210",
                    price: 219900,
                    platform: "PC / Microsoft",
                  },
                  {
                    title: "Grand Theft Auto V: Premium Edition",
                    buyer: "Kak Alvin",
                    phone: "081345678901",
                    price: 185000,
                    platform: "Rockstar / Steam",
                  },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSimulating}
                    onClick={() =>
                      handleSimulateOrder({
                        buyer_name: preset.buyer,
                        buyer_phone: preset.phone,
                        buyer_email: `${preset.buyer.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
                        game_title: preset.title,
                        platform: preset.platform,
                        price_idr: preset.price,
                        channel: "Shopee",
                        use_vault: true,
                      })
                    }
                    className="p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-left transition-all group"
                  >
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex justify-between tabular-nums">
                      <span>{preset.buyer}</span>
                      <span className="font-semibold text-slate-700">Rp {formatRp(preset.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                Total Order
              </span>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {orders.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Antrean diproses</p>
            </div>

            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider block mb-1">
                Terkirim WA
              </span>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                {orders.filter((o) => o.dispatched_channels?.includes("WhatsApp")).length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Notifikasi WhatsApp</p>
            </div>

            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-indigo-800 uppercase tracking-wider block mb-1">
                Terkirim Gmail
              </span>
              <div className="text-2xl font-bold text-indigo-600 tabular-nums">
                {orders.filter((o) => o.dispatched_channels?.includes("Gmail")).length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Sertifikat terkirim</p>
            </div>

            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                Stok Buffer Ready
              </span>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {availableVaultCount}{" "}
                <span className="text-xs font-normal text-slate-500">Unit</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Siap alokasi instan</p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="app-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pembeli, order ID, atau judul game..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                {(["ALL", "PROCESSED", "DISPATCHED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-md font-medium text-[11px] transition-colors ${
                      statusFilter === st
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st === "ALL" ? "Semua" : st === "PROCESSED" ? "Ready Kirim" : "Terkirim"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchOrders()}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                title="Refresh Antrean"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Daftar Order Cards */}
          {filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isDispatched = order.status === "DISPATCHED";
                const hasWa = order.dispatched_channels?.includes("WhatsApp");
                const hasGmail = order.dispatched_channels?.includes("Gmail");
                const hasShopee = order.dispatched_channels?.includes("Shopee");

                return (
                  <div
                    key={order.id}
                    className="app-card p-4 sm:p-5 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Left: Info Order */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {order.order_id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isDispatched
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isDispatched ? "Dispatched" : "Ready to Send"}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {order.channel}
                        </span>
                        {order.credentials?.vault_id && (
                          <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            Vault #{order.credentials.vault_id.slice(-4)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-baseline gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {order.game_title}
                        </h4>
                        <span className="text-xs text-slate-500">({order.platform})</span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 tabular-nums">
                        <span>
                          Buyer: <strong className="text-slate-800">{order.buyer_name}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>{order.buyer_phone}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-900">Rp {formatRp(order.price_idr)}</span>
                        <span>&bull;</span>
                        <span className="text-slate-400 text-[11px]">{order.created_at}</span>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        onClick={() => handleDispatchWhatsApp(order)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-colors ${
                          hasWa
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                        title="Kirim ke WhatsApp"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WA</span>
                      </button>

                      <button
                        onClick={() => handleDispatchGmail(order)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-colors ${
                          hasGmail
                            ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                        title="Kirim ke Gmail"
                      >
                        <Mail className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Gmail</span>
                      </button>

                      <button
                        onClick={() => handleCopyShopeeChat(order)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 transition-colors ${
                          hasShopee
                            ? "bg-orange-50 text-orange-800 border-orange-200"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                        title="Salin Template Shopee Chat"
                      >
                        <Copy className="w-3.5 h-3.5 text-orange-600" />
                        <span>Shopee</span>
                      </button>

                      <button
                        onClick={() => {
                          setInspectOrder(order);
                          setInspectTab("whatsapp");
                        }}
                        className="btn-secondary text-xs px-2.5 py-1.5 rounded-lg"
                        title="Buka Detail Pesanan"
                      >
                        Inspect
                      </button>

                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus Pesanan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="app-card py-12 px-6 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Inbox className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Tidak ada pesanan di antrean</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Gunakan tombol &quot;Simulasi Uji Coba&quot; atau &quot;Input Order Manual&quot; untuk memasukkan pesanan baru ke antrean.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* TAB 2: BRANKAS STOK BUFFER (MODE A)                       */}
      {/* ═════════════════════════════════════════════════════════ */}
      {mainTab === "vault" && (
        <div className="space-y-6">
          {/* Low Stock Warning Banner */}
          {lowStockGames.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold">Peringatan Stok Buffer Menipis:</span> Terdapat game dengan stok &le; 2 unit:{" "}
                  {lowStockGames.map(([game, count]) => `${game} (${count} unit)`).join(", ")}.
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingVaultItem(null);
                  setShowAddVaultModal(true);
                }}
                className="btn-primary text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto"
              >
                + Restock Sekarang
              </button>
            </div>
          )}

          {/* 4 KPI Cards Vault */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                Total Akun Terdaftar
              </span>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {vaultItems.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Seluruh inventori</p>
            </div>

            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider block mb-1">
                Ready (Available)
              </span>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                {availableVaultCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Siap dialokasikan</p>
            </div>

            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                Dispatched
              </span>
              <div className="text-2xl font-bold text-slate-700 tabular-nums">
                {dispatchedVaultCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Telah diserahkan</p>
            </div>

            <div className="app-card p-4 sm:p-5">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                Nilai Aset Modal
              </span>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                Rp {formatRp(totalCostReady)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Modal stok aktif</p>
            </div>
          </div>

          {/* Filter & Search Bar Vault */}
          <div className="app-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={vaultSearchQuery}
                onChange={(e) => setVaultSearchQuery(e.target.value)}
                placeholder="Cari judul game, username, atau supplier..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                {(["ALL", "AVAILABLE", "DISPATCHED"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setVaultStatusFilter(st)}
                    className={`px-3 py-1 rounded-md font-medium text-[11px] transition-colors ${
                      vaultStatusFilter === st
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st === "ALL" ? "Semua" : st === "AVAILABLE" ? "Ready" : "Dispatched"}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchVault()}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                title="Refresh Brankas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVaultLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Tabel Brankas Light Mode */}
          <div className="app-card overflow-hidden bg-white">
            {filteredVault.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Game &amp; Platform</th>
                      <th className="px-4 py-3">Kredensial Akun</th>
                      <th className="px-4 py-3 text-right">Modal</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVault.map((item) => {
                      const isRevealed = !!revealedPasswords[item.id];
                      const isAvailable = item.status === "AVAILABLE";

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-900 block">
                              {item.game_title}
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {item.platform} &bull; {item.category}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 font-mono">
                            <div className="flex items-center gap-1.5 text-slate-800">
                              <span className="font-medium">{item.username}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.username);
                                  showToast("Username disalin!");
                                }}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title="Copy username"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                              <span>{isRevealed ? item.password : "••••••••"}</span>
                              <button
                                onClick={() =>
                                  setRevealedPasswords((prev) => ({
                                    ...prev,
                                    [item.id]: !isRevealed,
                                  }))
                                }
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title={isRevealed ? "Sembunyikan" : "Tampilkan password"}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.password);
                                  showToast("Password disalin!");
                                }}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                                title="Copy password"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-right font-medium text-slate-800 tabular-nums">
                            Rp {formatRp(item.cost_idr)}
                          </td>

                          <td className="px-4 py-3.5 text-slate-600">
                            <span className="block">{item.supplier_name}</span>
                            {item.notes && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                                {item.notes}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                isAvailable
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {item.status}
                            </span>
                            {item.assigned_order_id && (
                              <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                                Order: {item.assigned_order_id}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => {
                                setEditingVaultItem(item);
                                setVFormGame(item.game_title);
                                setVFormPlatform(item.platform);
                                setVFormCategory(item.category);
                                setVFormUser(item.username);
                                setVFormPass(item.password);
                                setVFormCost(item.cost_idr);
                                setVFormSupplier(item.supplier_name);
                                setVFormNotes(item.notes || "");
                                setShowAddVaultModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title="Edit item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVaultItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Hapus item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 px-6 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Brankas belum memiliki stok</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Gunakan tombol &quot;Tambah Stok Satuan&quot; atau &quot;Impor Massal&quot; untuk mengisi stok penyangga.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* MODAL 1: ORDER INSPECTOR                                  */}
      {/* ═════════════════════════════════════════════════════════ */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Detail Pesanan #{inspectOrder.order_id}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {inspectOrder.game_title} &bull; {inspectOrder.buyer_name}
                </p>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-200 gap-4">
                {(["whatsapp", "gmail", "shopee", "credentials"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setInspectTab(t)}
                    className={`pb-2 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                      inspectTab === t
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {inspectTab === "whatsapp" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Format WhatsApp:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inspectOrder.messages?.whatsapp || "");
                        showToast("Pesan WhatsApp disalin!");
                      }}
                      className="text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin Pesan
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] whitespace-pre-wrap text-slate-800">
                    {inspectOrder.messages?.whatsapp || "Format pesan belum dibuat."}
                  </pre>
                </div>
              )}

              {inspectTab === "gmail" && (
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-500 block mb-1">Subject:</span>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-slate-800">
                      {inspectOrder.messages?.gmail_subject || "Pemberitahuan Pesanan"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Body Email:</span>
                    <pre className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] whitespace-pre-wrap text-slate-800">
                      {inspectOrder.messages?.gmail_body || "Konten email belum dibuat."}
                    </pre>
                  </div>
                </div>
              )}

              {inspectTab === "shopee" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Format Shopee Chat:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inspectOrder.messages?.shopee_chat || "");
                        showToast("Pesan Shopee disalin!");
                      }}
                      className="text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Salin Pesan
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] whitespace-pre-wrap text-slate-800">
                    {inspectOrder.messages?.shopee_chat || "Format Shopee chat belum dibuat."}
                  </pre>
                </div>
              )}

              {inspectTab === "credentials" && (
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Username / ID:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {inspectOrder.credentials?.username || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Password:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {inspectOrder.credentials?.password || "-"}
                    </span>
                  </div>
                  {inspectOrder.credentials?.claim_code && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Kode Klaim:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {inspectOrder.credentials.claim_code}
                      </span>
                    </div>
                  )}
                  {inspectOrder.credentials?.passcode && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Passcode PIN:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {inspectOrder.credentials.passcode}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectOrder(null)}
                className="btn-secondary text-xs px-4 py-2 rounded-lg"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* MODAL 2: TAMBAH / EDIT STOK SATUAN                        */}
      {/* ═════════════════════════════════════════════════════════ */}
      {showAddVaultModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingVaultItem ? "Edit Item Brankas" : "Tambah Stok Brankas Satuan"}
              </h3>
              <button
                onClick={() => setShowAddVaultModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVaultItem} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Judul Game</label>
                <input
                  type="text"
                  value={vFormGame}
                  onChange={(e) => setVFormGame(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Platform</label>
                  <input
                    type="text"
                    value={vFormPlatform}
                    onChange={(e) => setVFormPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kategori</label>
                  <input
                    type="text"
                    value={vFormCategory}
                    onChange={(e) => setVFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Username / ID</label>
                  <input
                    type="text"
                    value={vFormUser}
                    onChange={(e) => setVFormUser(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Password</label>
                  <input
                    type="text"
                    value={vFormPass}
                    onChange={(e) => setVFormPass(e.target.value)}
                    required
                    placeholder="KataSandi#123"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Harga Modal (Rp)</label>
                  <input
                    type="number"
                    value={vFormCost}
                    onChange={(e) => setVFormCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Supplier</label>
                  <input
                    type="text"
                    value={vFormSupplier}
                    onChange={(e) => setVFormSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={vFormNotes}
                  onChange={(e) => setVFormNotes(e.target.value)}
                  placeholder="Buffer stock siap kirim"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddVaultModal(false)}
                  className="btn-secondary text-xs px-4 py-2 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary-emerald text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  Simpan ke Brankas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* MODAL 3: IMPOR MASSAL BRANKAS                             */}
      {/* ═════════════════════════════════════════════════════════ */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Impor Massal Akun ke Brankas</h3>
              <button
                onClick={() => setShowBulkImportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pilih Judul Game</label>
                <input
                  type="text"
                  value={bulkGame}
                  onChange={(e) => setBulkGame(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Modal per Akun (Rp)</label>
                  <input
                    type="number"
                    value={bulkCost}
                    onChange={(e) => setBulkCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Supplier</label>
                  <input
                    type="text"
                    value={bulkSupplier}
                    onChange={(e) => setBulkSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Data Kredensial (1 Baris per Akun)
                </label>
                <p className="text-[11px] text-slate-500 mb-1">
                  Format yang didukung: <code className="text-slate-800">username:password</code> atau <code className="text-slate-800">username:password:catatan</code>
                </p>
                <textarea
                  rows={6}
                  value={bulkRaw}
                  onChange={(e) => setBulkRaw(e.target.value)}
                  placeholder={`user1@mail.com:Password#1\nuser2@mail.com:Password#2\nuser3@mail.com:Password#3`}
                  className="w-full p-3 font-mono text-[11px] border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(false)}
                  className="btn-secondary text-xs px-4 py-2 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary-emerald text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  Mulai Impor Massal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════ */}
      {/* MODAL 4: INPUT ORDER MANUAL                               */}
      {/* ═════════════════════════════════════════════════════════ */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Input Order Manual</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualOrderSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Pembeli</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="Kak Dimas"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Judul Game</label>
                <input
                  type="text"
                  value={formGame}
                  onChange={(e) => setFormGame(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Saluran Penjualan</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Shopee">Shopee</option>
                    <option value="WhatsApp">WhatsApp Direct</option>
                    <option value="Tokopedia">Tokopedia</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-vault"
                  checked={formUseVault}
                  onChange={(e) => setFormUseVault(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="chk-vault" className="text-slate-700 font-medium">
                  Alokasikan stok dari brankas penyangga jika tersedia (Mode A)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="btn-secondary text-xs px-4 py-2 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="btn-primary-emerald text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  {isSimulating ? "Memproses..." : "Proses Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

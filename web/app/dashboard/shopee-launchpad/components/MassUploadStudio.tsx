"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Globe,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  SHOPEE_FEE_PRESETS,
  ShopeeFeePresetId,
  calculateShopeeEconomics,
  calculateTargetSellingPrice,
} from "@/lib/pricing";
import {
  SHOPEE_CATEGORY_PRESETS,
  ShopeeMassProductInput,
  ShopeeValidationIssue,
} from "@/lib/shopeeMassUpload";
import { isHighRiskHakiProduct } from "@/lib/shopeeCompliance";
import {
  ArtworkCandidate,
  renderAndHostBatchCover,
  renderAndHostBatchRulesSlide,
  uploadCustomCoverImage,
} from "@/lib/batchThumbnailRenderer";

const DEFAULT_VERCEL_ORIGIN = "https://asksharagaming.vercel.app";

interface MassUploadRow extends ShopeeMassProductInput {
  selected: boolean;
  cogs_net_idr: number;
  preview_thumb_data?: string;
  has_artwork?: boolean;
  artwork_candidates?: ArtworkCandidate[];
  selected_artwork_url?: string;
  frame_color?: string;
  haki_risk_reason?: string;
}

export default function MassUploadStudio() {
  const [rows, setRows] = useState<MassUploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feePreset, setFeePreset] = useState<ShopeeFeePresetId>("reguler");
  const [targetMarginPct, setTargetMarginPct] = useState<number>(18);
  const [warrantyDays, setWarrantyDays] = useState<number>(30);
  const [enableVariantMode, setEnableVariantMode] = useState<boolean>(false);

  const [publicOrigin, setPublicOrigin] = useState<string>(DEFAULT_VERCEL_ORIGIN);
  const [customTemplateName, setCustomTemplateName] = useState<string>("");
  const [customTemplateBase64, setCustomTemplateBase64] = useState<string>("");

  const [isRenderingMedia, setIsRenderingMedia] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ShopeeValidationIssue[]>([]);
  const [editingDescRowId, setEditingDescRowId] = useState<string | null>(null);
  const [previewRowId, setPreviewRowId] = useState<string | null>(null);
  const [rulesPreviewDataUrl, setRulesPreviewDataUrl] = useState<string>("");
  const [customArtUrlInput, setCustomArtUrlInput] = useState<string>("");
  const [isRenderingSingle, setIsRenderingSingle] = useState<boolean>(false);
  const [brokenCandidateIds, setBrokenCandidateIds] = useState<Record<string, boolean>>({});
  const [mediaStats, setMediaStats] = useState<{ totalCount: number; totalBytes: number } | null>(null);
  const [isPruningMedia, setIsPruningMedia] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedOrigin = localStorage.getItem("akshara_public_media_origin");
      const currentOrigin = window.location.origin;
      const isLocal = currentOrigin.includes("localhost") || currentOrigin.includes("127.0.0.1");
      if (savedOrigin && !savedOrigin.includes("localhost") && !savedOrigin.includes("127.0.0.1")) {
        setPublicOrigin(savedOrigin);
      } else {
        setPublicOrigin(isLocal ? DEFAULT_VERCEL_ORIGIN : currentOrigin);
      }
    }
  }, []);

  const loadRows = async () => {
    setLoading(true);
    try {
      const [massRes, catRes] = await Promise.all([
        fetch("/api/shopee/mass-upload", { cache: "no-store" }),
        fetch("/api/catalog", { cache: "no-store" }),
      ]);
      const massJson = await massRes.json();
      const catJson = await catRes.json();
      const catalogMap = new Map<string, any>(
        (Array.isArray(catJson?.data) ? catJson.data : []).map((g: any) => [g.id, g])
      );

      if (massJson.status === "success" && Array.isArray(massJson.data)) {
        setRows(
          massJson.data.map((r: ShopeeMassProductInput) => {
            const cat = catalogMap.get(r.id);
            const cogsNet = Number(cat?.metrics?.cogs_net_idr || 0);
            const haki = isHighRiskHakiProduct(r.title, r.platform, r.category_type);
            return {
              ...r,
              selected: !haki.highRisk,
              cogs_net_idr: cogsNet,
              haki_risk_reason: haki.highRisk ? haki.reason : undefined,
            };
          })
        );
      }
    } catch {
      showToast("Gagal memuat katalog untuk Mass Upload.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaStats = async () => {
    try {
      const res = await fetch("/api/shopee/host-media", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json?.stats) setMediaStats(json.stats);
      }
    } catch {}
  };

  const handlePruneOldMedia = async () => {
    setIsPruningMedia(true);
    try {
      const res = await fetch("/api/shopee/host-media?olderThanDays=30", { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        if (json.stats) setMediaStats(json.stats);
        showToast(
          json.deletedCount > 0
            ? `✅ ${json.deletedCount} gambar lama (>30 hari) berhasil dibersihkan dari database.`
            : "Database media sudah bersih (tidak ada file >30 hari)."
        );
      }
    } catch {
      showToast("Gagal membersihkan media lama.", "error");
    } finally {
      setIsPruningMedia(false);
    }
  };

  useEffect(() => {
    loadRows();
    fetchMediaStats();
  }, []);

  const selectedRows = useMemo(() => rows.filter((r) => r.selected), [rows]);

  const rewriteMediaOrigin = (url: string, newOrigin: string) => {
    if (!url || !newOrigin) return url;
    const idx = url.indexOf("/api/public/media/");
    if (idx === -1) return url;
    return `${newOrigin.replace(/\/$/, "")}${url.slice(idx)}`;
  };

  const handleApplyOriginChange = (val: string) => {
    setPublicOrigin(val);
    const trimmed = val.trim().replace(/\/$/, "");
    if (typeof window !== "undefined") {
      localStorage.setItem("akshara_public_media_origin", trimmed);
    }
    if (trimmed.startsWith("http")) {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          cover_image_url: rewriteMediaOrigin(r.cover_image_url, trimmed),
          image_1_url: rewriteMediaOrigin(r.image_1_url, trimmed),
        }))
      );
    }
  };

  const handleRecalculatePrices = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (!r.selected || r.cogs_net_idr <= 0) return r;
        const nextPrice = calculateTargetSellingPrice({
          cogsIdr: r.cogs_net_idr,
          presetId: feePreset,
          packagingCostIdr: 0,
          targetMarginPct,
        });
        return { ...r, price_idr: nextPrice };
      })
    );
    showToast(
      `Harga jual Shopee dikalibrasi untuk preset ${SHOPEE_FEE_PRESETS[feePreset].label} (Margin target ${targetMarginPct}%)!`
    );
  };

  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomTemplateBase64(reader.result);
        setCustomTemplateName(file.name);
        showToast(`Template Shopee "${file.name}" dimuat. Baris data akan ditulis ke struktur aslinya!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBatchRenderAndHostMedia = async () => {
    if (selectedRows.length === 0) {
      showToast("Pilih minimal 1 produk terlebih dahulu.", "error");
      return;
    }
    const cleanOrigin = (publicOrigin || DEFAULT_VERCEL_ORIGIN).trim().replace(/\/$/, "");
    setIsRenderingMedia(true);
    setRenderProgress({ done: 0, total: selectedRows.length + 1 });

    try {
      // 1. Render shared Slide 2 (Rules & Terms Digital)
      const rulesRes = await renderAndHostBatchRulesSlide({
        publicOrigin: cleanOrigin,
        warrantyDays,
      });
      setRulesPreviewDataUrl(rulesRes.previewDataUrl);
      setRenderProgress({ done: 1, total: selectedRows.length + 1 });

      // 2. Render & Host Cover unik per produk
      let missedArtworkCount = 0;
      for (let i = 0; i < selectedRows.length; i++) {
        const target = selectedRows[i];
        try {
          const rendered = await renderAndHostBatchCover({
            id: target.id,
            title: target.title,
            platform: target.platform,
            category: target.category_type,
            priceIdr: target.price_idr,
            warrantyDays,
            publicOrigin: cleanOrigin,
            customArtworkUrl: target.selected_artwork_url,
            customFrameColor: target.frame_color,
          });
          if (!rendered.hasArtwork) missedArtworkCount++;
          setRows((prev) =>
            prev.map((row) =>
              row.id === target.id
                ? {
                    ...row,
                    cover_image_url: rendered.publicUrl,
                    image_1_url: rulesRes.publicUrl,
                    preview_thumb_data: rendered.previewDataUrl,
                    has_artwork: rendered.hasArtwork,
                    artwork_candidates: rendered.artworkCandidates,
                    selected_artwork_url: rendered.selectedArtworkUrl,
                    frame_color: rendered.frameColor,
                  }
                : row
            )
          );
        } catch (err) {
          console.warn("Failed rendering cover for", target.title, err);
        }
        setRenderProgress({ done: i + 2, total: selectedRows.length + 1 });
      }

      if (missedArtworkCount > 0) {
        showToast(
          `⚠️ ${selectedRows.length} Cover selesai, namun ${missedArtworkCount} game belum ketemu artwork-nya. Klik thumbnail untuk pilih gambar manual.`,
          "error"
        );
      } else {
        showToast(
          `✅ ${selectedRows.length} Cover unik & Slide 2 Aturan Digital berhasil di-render! Klik thumbnail untuk preview besar.`
        );
      }
      fetchMediaStats();
    } catch (err: any) {
      showToast(err?.message || "Gagal memproses gambar batch.", "error");
    } finally {
      setIsRenderingMedia(false);
    }
  };

  const handleRenderSingleCover = async (
    rowId: string,
    overrideArtworkUrl?: string,
    overrideFrameColor?: string | null
  ) => {
    const target = rows.find((r) => r.id === rowId);
    if (!target) return;
    const cleanOrigin = (publicOrigin || DEFAULT_VERCEL_ORIGIN).trim().replace(/\/$/, "");
    setIsRenderingSingle(true);
    try {
      let currentRulesUrl = target.image_1_url;
      if (!currentRulesUrl || !rulesPreviewDataUrl) {
        const rulesRes = await renderAndHostBatchRulesSlide({
          publicOrigin: cleanOrigin,
          warrantyDays,
        });
        currentRulesUrl = rulesRes.publicUrl;
        setRulesPreviewDataUrl(rulesRes.previewDataUrl);
      }
      const nextFrameColor =
        overrideFrameColor === null
          ? undefined
          : overrideFrameColor !== undefined
          ? overrideFrameColor
          : target.frame_color;
      const rendered = await renderAndHostBatchCover({
        id: target.id,
        title: target.title,
        platform: target.platform,
        category: target.category_type,
        priceIdr: target.price_idr,
        warrantyDays,
        publicOrigin: cleanOrigin,
        customArtworkUrl: overrideArtworkUrl ?? target.selected_artwork_url,
        customFrameColor: nextFrameColor,
      });
      setRows((prev) =>
        prev.map((row) =>
          row.id === target.id
            ? {
                ...row,
                cover_image_url: rendered.publicUrl,
                image_1_url: currentRulesUrl,
                preview_thumb_data: rendered.previewDataUrl,
                has_artwork: rendered.hasArtwork,
                artwork_candidates:
                  rendered.artworkCandidates.length > 0
                    ? rendered.artworkCandidates
                    : row.artwork_candidates,
                selected_artwork_url: rendered.selectedArtworkUrl,
                frame_color: rendered.frameColor,
              }
            : row
        )
      );
      showToast(`✅ Cover "${target.title}" berhasil di-render ulang!`);
    } catch (err: any) {
      showToast(err?.message || "Gagal render ulang cover.", "error");
    } finally {
      setIsRenderingSingle(false);
    }
  };

  const handleUploadCustomCover = (rowId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const target = rows.find((r) => r.id === rowId);
    if (!target) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== "string") return;
      const cleanOrigin = (publicOrigin || DEFAULT_VERCEL_ORIGIN).trim().replace(/\/$/, "");
      setIsRenderingSingle(true);
      try {
        const uploaded = await uploadCustomCoverImage({
          id: target.id,
          dataUrl: reader.result,
          publicOrigin: cleanOrigin,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? {
                  ...r,
                  cover_image_url: uploaded.publicUrl,
                  preview_thumb_data: uploaded.previewDataUrl,
                  has_artwork: true,
                }
              : r
          )
        );
        showToast(`✅ Cover custom "${target.title}" diunggah & siap di-export!`);
      } catch (err: any) {
        showToast(err?.message || "Gagal mengunggah cover custom.", "error");
      } finally {
        setIsRenderingSingle(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const buildPayloadItems = (): ShopeeMassProductInput[] => {
    return selectedRows.map((r) => {
      if (!enableVariantMode) {
        return { ...r, variants: undefined };
      }
      const stdPrice = r.price_idr;
      const vipPrice = Math.min(stdPrice * 2, Math.round((stdPrice * 1.18) / 1000) * 1000 - 100);
      return {
        ...r,
        variation_name: "Paket Garansi",
        variants: [
          {
            option_name: `Digital ${warrantyDays}H`,
            price_idr: stdPrice,
            stock: r.stock,
            sku_variant: `${r.sku_parent}-STD`,
          },
          {
            option_name: "VIP Priority 90H",
            price_idr: vipPrice,
            stock: r.stock,
            sku_variant: `${r.sku_parent}-VIP`,
          },
        ],
      };
    });
  };

  const handleValidateOnly = async () => {
    const items = buildPayloadItems();
    if (items.length === 0) return;
    try {
      const res = await fetch("/api/shopee/mass-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate", items }),
      });
      const json = await res.json();
      if (json.status === "success") {
        setValidationIssues(json.issues || []);
        if ((json.issues || []).length === 0) {
          showToast("✅ Lolos 100% pengecekan aturan Mass Upload Shopee!");
        } else {
          showToast(`Ditemukan ${json.issues.length} catatan validasi untuk diperiksa.`, "error");
        }
      }
    } catch {
      showToast("Gagal memvalidasi data.", "error");
    }
  };

  const handleExportWorkbook = async (mode: "mass_upload" | "mass_update") => {
    const items = buildPayloadItems();
    if (items.length === 0) {
      showToast("Pilih minimal 1 produk untuk di-export.", "error");
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch("/api/shopee/mass-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export",
          mode,
          items,
          customTemplateBase64: customTemplateBase64 || undefined,
          ignoreWarnings: false,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (Array.isArray(errJson?.issues)) setValidationIssues(errJson.issues);
        showToast(errJson?.message || "Export Excel gagal.", "error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dt = new Date().toISOString().slice(0, 10);
      a.download =
        mode === "mass_update"
          ? `shopee-mass-update-${dt}.xlsx`
          : `shopee-mass-upload-${dt}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(
        mode === "mass_update"
          ? `✅ File Mass Update Harga & Stok (.xlsx) berhasil diunduh (${items.length} produk)!`
          : `✅ File Shopee Mass Upload (.xlsx) berhasil diunduh (${items.length} produk)!`
      );
    } catch {
      showToast("Terjadi kesalahan saat mengekspor file Excel.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const editingRow = rows.find((r) => r.id === editingDescRowId) || null;
  const previewRow = rows.find((r) => r.id === previewRowId) || null;
  const localOriginWarning =
    publicOrigin.includes("localhost") || publicOrigin.includes("127.0.0.1");

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-medium flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-800"
              : "bg-slate-900 border-slate-800 text-white"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Controls Card */}
      <div className="app-card p-5 bg-white border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Shopee Seller Centre Mass Upload Generator (100% Pure Digital)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ekspor massal produk katalog lengkap dengan Judul SEO, Deskripsi Bebas Link URL, Foto Sampul 1080×1080 ter-host, dan SKU mapping.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mediaStats && (
              <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600">
                <span>
                  DB Media: <strong className="text-slate-900">{mediaStats.totalCount}</strong> file (
                  {Math.max(1, Math.round(mediaStats.totalBytes / 1024))} KB)
                </span>
                <button
                  type="button"
                  disabled={isPruningMedia}
                  onClick={handlePruneOldMedia}
                  className="text-indigo-700 hover:underline font-sans font-semibold cursor-pointer disabled:opacity-40"
                >
                  {isPruningMedia ? "..." : "Bersihkan >30H"}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={loadRows}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Muat Ulang Katalog</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Public Origin for Shopee Image Pull */}
          <div className="md:col-span-5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                Domain Publik Host Gambar (URL Vercel Production Anda)
              </label>
              {publicOrigin.trim().replace(/\/$/, "") !== DEFAULT_VERCEL_ORIGIN && (
                <button
                  type="button"
                  onClick={() => {
                    handleApplyOriginChange(DEFAULT_VERCEL_ORIGIN);
                    showToast(`✅ Domain host diatur ke ${DEFAULT_VERCEL_ORIGIN}`);
                  }}
                  className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  Pakai asksharagaming.vercel.app
                </button>
              )}
            </div>
            <input
              type="text"
              value={publicOrigin}
              onChange={(e) => handleApplyOriginChange(e.target.value)}
              placeholder={DEFAULT_VERCEL_ORIGIN}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
            />
            {localOriginWarning ? (
              <p className="text-[10.5px] text-amber-700">
                ⚠️ Saat dijalankan dari localhost, klik{" "}
                <button
                  type="button"
                  onClick={() => handleApplyOriginChange(DEFAULT_VERCEL_ORIGIN)}
                  className="underline font-bold cursor-pointer"
                >
                  Pakai asksharagaming.vercel.app
                </button>{" "}
                agar Shopee bisa mengunduh gambar.
              </p>
            ) : (
              <p className="text-[10px] text-slate-500">
                Gambar otomatis tersimpan di Supabase DB sehingga langsung aktif di link HTTPS ini.
              </p>
            )}
          </div>

          {/* Preset Biaya Shopee */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Kalibrasi Harga Jual Shopee + Margin {targetMarginPct}%
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={feePreset}
                onChange={(e) => setFeePreset(e.target.value as ShopeeFeePresetId)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              >
                {Object.values(SHOPEE_FEE_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleRecalculatePrices}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold shrink-0 cursor-pointer"
              >
                Kalibrasi
              </button>
            </div>
          </div>

          {/* Custom Shopee Template Upload */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Template .xlsx Shopee (Opsional)
            </label>
            <label className="flex items-center justify-between gap-2 w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 border-dashed rounded-lg px-3 py-1.5 text-xs text-slate-700 cursor-pointer truncate">
              <span className="truncate">
                {customTemplateName ? `✓ ${customTemplateName}` : "Upload Template Seller Centre"}
              </span>
              <input type="file" accept=".xlsx" onChange={handleUploadTemplate} className="hidden" />
            </label>
          </div>
        </div>

        {/* Mode Options & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={enableVariantMode}
                onChange={(e) => setEnableVariantMode(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Aktifkan 2 Variasi Paket Garansi (Digital {warrantyDays}H vs VIP 90H)</span>
            </label>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Pure Digital (Berat 1g • Bebas Link URL)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isRenderingMedia || selectedRows.length === 0}
              onClick={handleBatchRenderAndHostMedia}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isRenderingMedia ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>
                    Render Thumbnail ({renderProgress.done}/{renderProgress.total})...
                  </span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Render &amp; Host Thumbnail ({selectedRows.length})</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleValidateOnly}
              disabled={selectedRows.length === 0}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Cek Validasi</span>
            </button>

            <button
              type="button"
              disabled={isExporting || selectedRows.length === 0}
              onClick={() => handleExportWorkbook("mass_update")}
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Export ringan hanya SKU, Harga Jual Shopee terbaru & Stok Aman"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Mass Update Stok/Harga</span>
            </button>

            <button
              type="button"
              disabled={isExporting || selectedRows.length === 0}
              onClick={() => handleExportWorkbook("mass_upload")}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isExporting
                  ? "Membuat Excel..."
                  : `2. Download Mass Upload .xlsx (${selectedRows.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Validation Alerts */}
        {validationIssues.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span>Checklist Validasi Aturan Shopee ({validationIssues.length} temuan):</span>
              <button
                type="button"
                onClick={() => setValidationIssues([])}
                className="text-amber-700 hover:text-amber-950 text-[11px] font-medium"
              >
                Tutup
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
              {validationIssues.map((iss, i) => (
                <div
                  key={i}
                  className={
                    iss.severity === "error" ? "text-rose-700 font-semibold" : "text-amber-800"
                  }
                >
                  [{iss.severity.toUpperCase()}] {iss.title}: {iss.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet Preview Table */}
      <div className="app-card bg-white border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="font-bold text-slate-800">
            Preview Produk Siap Export ({selectedRows.length} / {rows.length} dipilih)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: true })))}
              className="text-emerald-700 font-semibold hover:underline"
            >
              Pilih Semua
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: false })))}
              className="text-slate-600 font-semibold hover:underline"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[980px]">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                <th className="py-2.5 px-3">Cover &amp; Link</th>
                <th className="py-2.5 px-3 min-w-[260px]">Judul SEO Shopee (5–120 char)</th>
                <th className="py-2.5 px-3 min-w-[180px]">Kategori ID</th>
                <th className="py-2.5 px-3 w-32">Harga (Rp)</th>
                <th className="py-2.5 px-3 w-24">Stok</th>
                <th className="py-2.5 px-3">SKU &amp; Margin</th>
                <th className="py-2.5 px-3 text-right">Deskripsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Memuat katalog produk untuk Mass Upload...
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const eco = calculateShopeeEconomics({
                    sellingPriceIdr: row.price_idr,
                    cogsIdr: row.cogs_net_idr,
                    presetId: feePreset,
                    packagingCostIdr: 0,
                  });
                  return (
                    <tr
                      key={row.id}
                      className={row.selected ? "bg-white hover:bg-slate-50/70" : "bg-slate-50/40 opacity-60"}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, selected: e.target.checked } : r
                              )
                            )
                          }
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomArtUrlInput(row.selected_artwork_url || "");
                              setPreviewRowId(row.id);
                            }}
                            title="Klik untuk Preview Penuh & Ganti Artwork Cover"
                            className="relative group w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer hover:border-indigo-400"
                          >
                            {row.preview_thumb_data ? (
                              <img
                                src={row.preview_thumb_data}
                                alt={row.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <div className="min-w-0 max-w-[140px]">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomArtUrlInput(row.selected_artwork_url || "");
                                setPreviewRowId(row.id);
                              }}
                              className={`text-[10px] font-mono font-bold block text-left hover:underline cursor-pointer ${
                                row.cover_image_url
                                  ? row.has_artwork === false
                                    ? "text-amber-700"
                                    : "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {row.cover_image_url
                                ? row.has_artwork === false
                                  ? "⚠️ Tanpa Art (Cek)"
                                  : "✓ Preview & Cek"
                                : "Preview / Render"}
                            </button>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {row.cover_image_url || "Klik Render Batch"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.seo_title}
                          maxLength={120}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, seo_title: e.target.value } : r
                              )
                            )
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono flex flex-wrap items-center gap-1.5">
                          <span>{row.title} ({row.seo_title.length}/120 char)</span>
                          {row.haki_risk_reason && (
                            <span
                              title={row.haki_risk_reason}
                              className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                            >
                              ⚠️ Risiko HAKI (Di-uncheck)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={row.shopee_category_id}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, shopee_category_id: e.target.value } : r
                              )
                            )
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-800"
                        >
                          {SHOPEE_CATEGORY_PRESETS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={row.price_idr}
                          step={500}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, price_idr: Number(e.target.value) || 0 } : r
                              )
                            )
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 tabular-nums"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={row.stock}
                          min={0}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id ? { ...r, stock: Number(e.target.value) || 0 } : r
                              )
                            )
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 tabular-nums"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-mono">
                        <div className="text-[11px] text-slate-700 font-semibold truncate max-w-[140px]">
                          {row.sku_parent}
                        </div>
                        {row.cogs_net_idr > 0 && (
                          <div
                            className={`text-[10px] font-bold tabular-nums ${
                              eco.netMarginPct >= 15 ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            Margin {eco.netMarginPct.toFixed(1)}% (+Rp{" "}
                            {eco.netProfitIdr.toLocaleString("id-ID")})
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingDescRowId(row.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                        >
                          Edit Teks
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Visual Preview & Artwork Customizer Modal */}
      {previewRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-6">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Visual Inspector Cover &amp; Rules Shopee — {previewRow.title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cek hasil render 1080×1080 sebelum export .xlsx, ganti artwork, atau upload foto cover custom.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewRowId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* Preview Cover Slide 1 & Slide 2 */}
              <div className="md:col-span-7 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Slide 1 — Cover Utama (1080×1080)
                    </span>
                    <div className="aspect-square rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                      {previewRow.preview_thumb_data ? (
                        <img
                          src={previewRow.preview_thumb_data}
                          alt={previewRow.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-4 text-xs text-slate-400 space-y-2">
                          <ImageIcon className="w-7 h-7 mx-auto text-slate-300" />
                          <p>Belum dirender. Klik Render Foto Ini di kanan.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Slide 2 — Rules &amp; Garansi Digital
                    </span>
                    <div className="aspect-square rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                      {rulesPreviewDataUrl ? (
                        <img
                          src={rulesPreviewDataUrl}
                          alt="Slide 2 Rules Digital"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-4 text-xs text-slate-400">
                          Akan tampil setelah render Slide 2.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {previewRow.cover_image_url && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 break-all">
                    URL Publik Shopee:{" "}
                    <a
                      href={previewRow.cover_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-700 underline"
                    >
                      {previewRow.cover_image_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column: Artwork Picker, Frame Color & Custom Upload */}
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-1.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      Warna Border Frame
                    </span>
                    <button
                      type="button"
                      disabled={isRenderingSingle}
                      onClick={() => handleRenderSingleCover(previewRow.id, undefined, null)}
                      className="text-[10px] font-semibold text-indigo-700 hover:underline cursor-pointer disabled:opacity-40"
                    >
                      Reset Otomatis
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: "Charcoal", hex: "#18181B" },
                      { label: "Emerald", hex: "#059669" },
                      { label: "Royal Blue", hex: "#1E3A8A" },
                      { label: "Crimson", hex: "#881337" },
                      { label: "Bronze", hex: "#78350F" },
                      { label: "Slate Navy", hex: "#0F172A" },
                    ].map((sw) => (
                      <button
                        key={sw.hex}
                        type="button"
                        disabled={isRenderingSingle}
                        onClick={() => handleRenderSingleCover(previewRow.id, undefined, sw.hex)}
                        title={sw.label}
                        className={`w-6 h-6 rounded-md border transition-transform cursor-pointer hover:scale-110 ${
                          previewRow.frame_color?.toUpperCase() === sw.hex.toUpperCase()
                            ? "ring-2 ring-slate-900 ring-offset-1 border-white"
                            : "border-slate-300"
                        }`}
                        style={{ backgroundColor: sw.hex }}
                      />
                    ))}
                    <input
                      type="color"
                      value={previewRow.frame_color || "#18181B"}
                      onChange={(e) => handleRenderSingleCover(previewRow.id, undefined, e.target.value)}
                      title="Pilih warna kustom"
                      className="w-7 h-6 p-0 border border-slate-300 rounded cursor-pointer bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Pilih Artwork Resmi Lainnya
                    </span>
                    <button
                      type="button"
                      disabled={isRenderingSingle}
                      onClick={() =>
                        handleRenderSingleCover(
                          previewRow.id,
                          customArtUrlInput.trim() || undefined
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isRenderingSingle ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Render Ulang Foto Ini</span>
                    </button>
                  </div>

                  {Array.isArray(previewRow.artwork_candidates) &&
                  previewRow.artwork_candidates.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                      {previewRow.artwork_candidates
                        .filter((cand) => !brokenCandidateIds[cand.id])
                        .map((cand) => {
                        const isPicked = previewRow.selected_artwork_url === cand.rawUrl;
                        return (
                          <button
                            key={cand.id}
                            type="button"
                            disabled={isRenderingSingle}
                            onClick={() => {
                              setCustomArtUrlInput(cand.rawUrl);
                              handleRenderSingleCover(previewRow.id, cand.rawUrl);
                            }}
                            title={cand.label}
                            className={`rounded-lg overflow-hidden border text-left transition-all cursor-pointer ${
                              isPicked
                                ? "border-emerald-500 ring-2 ring-emerald-500/30"
                                : "border-slate-200 hover:border-indigo-400"
                            }`}
                          >
                            <img
                              src={cand.proxyUrl}
                              alt={cand.label}
                              onError={() =>
                                setBrokenCandidateIds((prev) => ({ ...prev, [cand.id]: true }))
                              }
                              className="w-full h-14 object-cover bg-slate-100"
                            />
                            <span className="block px-1 py-0.5 text-[9px] text-slate-600 truncate">
                              {cand.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      Klik <strong>Render Ulang Foto Ini</strong> untuk mengambil kandidat artwork otomatis dari Steam/Microsoft, atau tempel URL gambar di bawah.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Atau Paste URL Gambar Artwork Custom
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customArtUrlInput}
                      onChange={(e) => setCustomArtUrlInput(e.target.value)}
                      placeholder="https://.../cover-game.jpg"
                      className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      disabled={isRenderingSingle || !customArtUrlInput.trim()}
                      onClick={() =>
                        handleRenderSingleCover(previewRow.id, customArtUrlInput.trim())
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Atau Upload Cover Jadimu Sendiri (dari Wizard / Canva)
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Cover Custom (PNG / JPG)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => handleUploadCustomCover(previewRow.id, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Description Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Deskripsi Shopee — {editingRow.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDescRowId(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[11px] text-slate-500">
                Pastikan bebas URL eksternal (.com / https / wa.me) agar aman dari auto-reject Shopee.
              </p>
              <textarea
                rows={12}
                value={editingRow.description}
                maxLength={3000}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === editingRow.id ? { ...r, description: e.target.value } : r
                    )
                  )
                }
                className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Panjang: {editingRow.description.length} / 3000 karakter</span>
                <button
                  type="button"
                  onClick={() => setEditingDescRowId(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-sans font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Simpan Teks</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

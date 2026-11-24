"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Zap,
  Cpu,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Store,
  PackageSearch,
  Calculator,
  ShieldAlert,
  ShoppingBag,
  Compass,
  Key,
  FileText,
  Layers,
  Headphones,
  Terminal,
  Activity,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  LogOut,
  Clock,
  Plus,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    id: "orders",
    title: "Orders & Fulfillment",
    items: [
      {
        label: "Auto-Fulfillment",
        href: "/dashboard/autonomous",
        icon: <Zap className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Buku Kas & Operator",
        href: "/dashboard/operator",
        icon: <BookOpen className="w-4 h-4 shrink-0" />,
      },
      {
        label: "AI Delivery Formatter",
        href: "/dashboard/formatter",
        icon: <Sparkles className="w-4 h-4 shrink-0" />,
        badge: "AI",
      },
      {
        label: "Brankas Klaim",
        href: "/dashboard/claims",
        icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
      },
    ],
  },
  {
    id: "catalog",
    title: "Catalog & Pricing",
    items: [
      {
        label: "Radar Katalog",
        href: "/dashboard/catalog",
        icon: <Store className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Stock Sentry",
        href: "/dashboard/stock",
        icon: <PackageSearch className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Kalkulator Profit",
        href: "/dashboard/quant",
        icon: <Calculator className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Risk Officer",
        href: "/dashboard/risk",
        icon: <ShieldAlert className="w-4 h-4 shrink-0" />,
      },
    ],
  },
  {
    id: "sourcing",
    title: "Sourcing & Shopee",
    items: [
      {
        label: "Shopee Launchpad",
        href: "/dashboard/shopee-launchpad",
        icon: <ShoppingBag className="w-4 h-4 shrink-0" />,
        badge: "1-FLOW",
      },
      {
        label: "Research Center",
        href: "/dashboard/research",
        icon: <Compass className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Eneba CDKey",
        href: "/dashboard/eneba",
        icon: <Key className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Listing Studio",
        href: "/dashboard/description",
        icon: <FileText className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Marketer Hub",
        href: "/dashboard/marketer",
        icon: <Layers className="w-4 h-4 shrink-0" />,
      },
    ],
  },
  {
    id: "system",
    title: "Support & System",
    items: [
      {
        label: "Customer Support",
        href: "/dashboard/support",
        icon: <Headphones className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Bot Commander",
        href: "/dashboard/bot",
        icon: <Terminal className="w-4 h-4 shrink-0" />,
      },
      {
        label: "System Health",
        href: "/dashboard/health",
        icon: <Activity className="w-4 h-4 shrink-0" />,
      },
    ],
  },
];

const routeTitles: Record<string, string> = {
  "/dashboard": "Command Deck",
  "/dashboard/autonomous": "Auto-Fulfillment",
  "/dashboard/operator": "Buku Kas & Operator",
  "/dashboard/formatter": "AI Delivery Formatter",
  "/dashboard/claims": "Brankas Klaim",
  "/dashboard/catalog": "Radar Katalog",
  "/dashboard/stock": "Stock Sentry",
  "/dashboard/quant": "Kalkulator Profit",
  "/dashboard/risk": "Risk Officer",
  "/dashboard/shopee-launchpad": "Shopee Launchpad",
  "/dashboard/research": "Research Center",
  "/dashboard/eneba": "Eneba CDKey",
  "/dashboard/description": "Listing Studio",
  "/dashboard/marketer": "Marketer Hub",
  "/dashboard/support": "Customer Support",
  "/dashboard/bot": "Bot Commander",
  "/dashboard/health": "System Health",
};

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clockTime, setClockTime] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    orders: true,
    catalog: true,
    sourcing: true,
    system: true,
  });

  // Strict route scoping: Only render shell on /dashboard/*
  const isDashboardRoute = pathname?.startsWith("/dashboard");

  // Keep active section open when route changes
  useEffect(() => {
    setSidebarOpen(false);
    if (!pathname) return;

    navSections.forEach((section) => {
      const hasActive = section.items.some((item) => pathname.startsWith(item.href));
      if (hasActive) {
        setOpenSections((prev) => ({ ...prev, [section.id]: true }));
      }
    });
  }, [pathname]);

  // Clean WIB Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Jakarta",
        }) + " WIB"
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Prevent background scroll when mobile sidebar is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // If NOT a dashboard route, render children clean with NO sidebar or header
  if (!isDashboardRoute) {
    return <>{children}</>;
  }

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  // Determine current breadcrumb title
  const currentTitle =
    routeTitles[pathname] ||
    Object.entries(routeTitles).find(([route]) => route !== "/dashboard" && pathname.startsWith(route))?.[1] ||
    "Command Deck";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Desktop & Mobile Sidebar (Width 256px / w-64) ─── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-200 shadow-sm transition-transform duration-200 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Brand Header */}
        <div className="h-[60px] px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-[14px] tracking-tight text-slate-900 block leading-tight">
                Akshara Ops
              </span>
              <span className="text-[11px] text-slate-500 font-medium block leading-tight">
                Shopee Automation
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Accordion */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5 scrollbar-none text-xs">
          {/* 1. Overview (Static Link on top) */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold tracking-wider text-slate-400 uppercase select-none">
              Overview
            </p>
            <Link
              href="/dashboard"
              className={[
                "group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors select-none",
                isActive("/dashboard")
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
              ].join(" ")}
            >
              <span
                className={
                  isActive("/dashboard")
                    ? "text-emerald-600"
                    : "text-slate-400 group-hover:text-slate-600"
                }
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
              </span>
              <span>Command Deck</span>
            </Link>
          </div>

          {/* 2-5 Accordion Sections */}
          {navSections.map((section) => {
            const isOpen = !!openSections[section.id];
            const hasActiveChild = section.items.some((item) => isActive(item.href));

            return (
              <div key={section.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase select-none hover:text-slate-700 transition-colors"
                >
                  <span className={hasActiveChild ? "text-emerald-700 font-bold" : ""}>
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "transform rotate-0" : "transform -rotate-90"
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-0.5 pt-0.5">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={[
                            "group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors select-none",
                            active
                              ? "bg-emerald-50 text-emerald-700 font-semibold"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={
                                active
                                  ? "text-emerald-600"
                                  : "text-slate-400 group-hover:text-slate-600"
                              }
                            >
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={[
                                "text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0",
                                active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600",
                              ].join(" ")}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions: Storefront Link & Logout */}
        <div className="p-3 border-t border-slate-200 shrink-0 space-y-1 bg-white">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <span>Storefront VIP</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Publik
            </span>
          </Link>

          <button
            onClick={handleLogout}
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content Shell ─── */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar (Height 60px, Sticky) */}
        <header className="sticky top-0 z-30 h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left: Mobile hamburger + Dynamic Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Buka navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="text-slate-400">Dashboard</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">{currentTitle}</span>
            </div>
          </div>

          {/* Right: WIB Clock + Fast Order CTA */}
          <div className="flex items-center gap-3 sm:gap-4">
            {clockTime && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 tabular-nums font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{clockTime}</span>
              </div>
            )}

            <Link
              href="/dashboard/autonomous"
              className="btn-primary-emerald text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Proses Order</span>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 bg-[#F8FAFC]">
          {children}
        </main>

        {/* Minimalist Dashboard Footer */}
        <footer className="border-t py-4 px-4 sm:px-6 lg:px-8 border-slate-200 bg-white text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
            <span>Akshara Gaming Center &copy; 2026</span>
            <span className="text-slate-400">
              Autonomous Operations &bull; Shopee Automation Engine &bull; ITS Surabaya
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

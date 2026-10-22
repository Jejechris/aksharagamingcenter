"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Home,
  LayoutDashboard,
  Store,
  Calculator,
  Sparkles,
  ShieldAlert,
  Cpu,
  FileText,
  Headphones,
  Menu,
  X,
  Terminal,
  Zap,
  Activity,
  ChevronRight,
  Compass,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Radio,
  Clock,
  Wifi,
  Database
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  color?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        label: "Storefront VIP",
        href: "/",
        icon: <Home className="w-4 h-4 shrink-0" />,
        badge: "LIVE",
        color: "text-emerald-400"
      },
      {
        label: "Command Deck",
        href: "/dashboard",
        icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
        color: "text-cyan-400"
      },
    ],
  },
  {
    title: "INTELLIGENCE & TOOLS",
    items: [
      {
        label: "Radar Katalog",
        href: "/dashboard/catalog",
        icon: <Store className="w-4 h-4 shrink-0 text-amber-400" />,
        badge: "v2.5",
        color: "text-amber-400"
      },
      {
        label: "Research Center",
        href: "/dashboard/research",
        icon: <Compass className="w-4 h-4 shrink-0 text-cyan-400" />,
        color: "text-cyan-400"
      },
      {
        label: "Eneba CDKey",
        href: "/dashboard/eneba",
        icon: <Zap className="w-4 h-4 shrink-0 text-violet-400" />,
        color: "text-violet-400"
      },
      {
        label: "Profit Calculator",
        href: "/dashboard/quant",
        icon: <Calculator className="w-4 h-4 shrink-0 text-emerald-400" />,
        color: "text-emerald-400"
      },
      {
        label: "Shopee Listing Studio",
        href: "/dashboard/description",
        icon: <ShoppingBag className="w-4 h-4 shrink-0 text-orange-400" />,
        color: "text-orange-400"
      },
      {
        label: "AI Formatter",
        href: "/dashboard/formatter",
        icon: <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />,
        badge: "AI",
        color: "text-purple-400"
      },
    ],
  },
  {
    title: "AUTONOMOUS OPERATIONS",
    items: [
      {
        label: "Auto-Fulfillment",
        href: "/dashboard/autonomous",
        icon: <Zap className="w-4 h-4 shrink-0 text-emerald-400" />,
        badge: "JIT",
        color: "text-emerald-400"
      },
      {
        label: "Risk Officer",
        href: "/dashboard/risk",
        icon: <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />,
        color: "text-rose-400"
      },
      {
        label: "Kas & Operator",
        href: "/dashboard/operator",
        icon: <Cpu className="w-4 h-4 shrink-0 text-indigo-400" />,
        color: "text-indigo-400"
      },
      {
        label: "Marketer Hub",
        href: "/dashboard/marketer",
        icon: <FileText className="w-4 h-4 shrink-0 text-fuchsia-400" />,
        color: "text-fuchsia-400"
      },
      {
        label: "Stock Sentry",
        href: "/dashboard/stock",
        icon: <PackageSearch className="w-4 h-4 shrink-0 text-amber-400" />,
        color: "text-amber-400"
      },
      {
        label: "Customer Support",
        href: "/dashboard/support",
        icon: <Headphones className="w-4 h-4 shrink-0 text-sky-400" />,
        color: "text-sky-400"
      },
      {
        label: "Klaim Forensik",
        href: "/dashboard/claims",
        icon: <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />,
        badge: "AES",
        color: "text-emerald-400"
      },
    ],
  },
  {
    title: "SYSTEM & INFRA",
    items: [
      {
        label: "Bot Commander",
        href: "/dashboard/bot",
        icon: <Terminal className="w-4 h-4 shrink-0 text-cyan-400" />,
        color: "text-cyan-400"
      },
      {
        label: "Operations Health",
        href: "/dashboard/health",
        icon: <Activity className="w-4 h-4 shrink-0 text-emerald-400" />,
        badge: "99.9%",
        color: "text-emerald-400"
      },
    ],
  },
];

function NavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={[
        "group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 w-full outline-none select-none border",
        active
          ? "bg-gradient-to-r from-white/[0.09] to-white/[0.04] text-white border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.4)]"
          : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] hover:border-white/[0.06] active:scale-[0.98]",
      ].join(" ")}
    >
      <span
        className={[
          "transition-all duration-200 transform group-hover:scale-110",
          active ? "opacity-100 scale-105" : "opacity-70 group-hover:opacity-100",
        ].join(" ")}
      >
        {item.icon}
      </span>
      <span className="leading-none tracking-tight">{item.label}</span>

      {item.badge && (
        <span
          className={[
            "ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border",
            active
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : "bg-white/[0.05] text-slate-400 border-white/[0.08] group-hover:text-slate-200",
          ].join(" ")}
        >
          {item.badge}
        </span>
      )}

      {active && !item.badge && (
        <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] shrink-0 animate-pulse" />
      )}
    </Link>
  );
}

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clockTime, setClockTime] = useState("");
  const [pingLatency, setPingLatency] = useState(16);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Live Clock & Ping Telemetry
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

    const pingTimer = setInterval(() => {
      setPingLatency(Math.floor(14 + Math.random() * 8));
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(pingTimer);
    };
  }, []);

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      {/* ── Mobile Backdrop Blur Overlay ─────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── High-Tech Obsidian Sidebar ───────────────────── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col",
          "bg-[#07090f]/95 backdrop-blur-2xl border-r border-white/[0.08]",
          "shadow-[8px_0_32px_rgba(0,0,0,0.6)]",
          "transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Brand Header */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group mb-3.5">
            <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500/25 via-slate-900/80 to-emerald-500/25 border border-white/[0.15] flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.5)] group-hover:border-emerald-400/50 group-hover:shadow-[0_0_16px_rgba(52,211,153,0.3)] transition-all shrink-0">
              <Shield className="w-4 h-4 text-slate-100 group-hover:text-emerald-300 transition-colors" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#07090f] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[14px] tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  Akshara
                </span>
                <span className="text-[9px] font-mono px-1.5 py-[2px] rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold leading-none">
                  v4.0
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block leading-tight mt-[2px] tracking-wide">
                Autonomous Ops Core
              </span>
            </div>
          </Link>

          {/* System Telemetry Beacon */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-inner">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold leading-none tracking-wide">
                ONLINE
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1 text-slate-400">
                <Wifi className="w-3 h-3 text-emerald-400" />
                {pingLatency}ms
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-[9px] truncate">
                {clockTime ? clockTime.split(" ")[0] : "SYNC"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-none">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold font-mono tracking-[0.14em] text-slate-500 uppercase select-none flex items-center justify-between">
                <span>{section.title}</span>
              </p>
              <div className="space-y-[3px]">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Database & System Health Quick Link */}
        <div className="px-3 pb-2 pt-2 border-t border-white/[0.06] shrink-0 bg-[#06070a]/50">
          <Link
            href="/dashboard/health"
            className={[
              "flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 w-full group outline-none select-none",
              isActive("/dashboard/health")
                ? "bg-white/[0.08] text-white border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]"
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-mono text-slate-300 group-hover:text-white">
                Supabase SQL
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              HEALTHY <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="px-4 py-3 border-t border-white/[0.06] shrink-0 bg-[#06070a]/80">
          <div className="flex items-center justify-between text-slate-500">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="text-[10px] font-mono truncate text-slate-400">
                Senna Autonomous Engine
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
              ITS
            </span>
          </div>
        </div>
      </aside>

      {/* ── Content Shell ─────────────────────────────────── */}
      <div className="flex flex-col min-h-screen md:pl-[252px]">
        {/* Mobile Header */}
        <header className="flex md:hidden sticky top-0 z-30 h-[56px] shrink-0 items-center justify-between px-4 bg-[#07090f]/90 border-b border-white/[0.08] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-slate-900/80 to-emerald-500/20 border border-white/[0.12] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
                Akshara
              </span>
              <span className="text-[9px] font-mono text-emerald-400 leading-none">
                OPS COMMAND
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-9 h-9 rounded-xl border border-white/[0.10] bg-white/[0.04] flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Dynamic Page Content */}
        {children}
      </div>
    </>
  );
}

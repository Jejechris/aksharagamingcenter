"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import OperationsHealthWidget from "./OperationsHealthWidget";
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
  Send,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
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
        label: "Overview",
        href: "/",
        icon: <Home className="w-4 h-4 shrink-0" />,
      },
      {
        label: "Command Deck",
        href: "/dashboard",
        icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      },
    ],
  },
  {
    title: "TOOLS",
    items: [
      {
        label: "Radar Katalog",
        href: "/dashboard/catalog",
        icon: <Store className="w-4 h-4 shrink-0 text-amber-400" />,
      },
      {
        label: "Profit Calculator",
        href: "/dashboard/quant",
        icon: <Calculator className="w-4 h-4 shrink-0 text-emerald-400" />,
      },
      {
        label: "Deskripsi Maker",
        href: "/dashboard/description",
        icon: <FileText className="w-4 h-4 shrink-0 text-fuchsia-400" />,
      },
      {
        label: "AI Formatter",
        href: "/dashboard/formatter",
        icon: <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />,
      },
    ],
  },
  {
    title: "OPS",
    items: [
      {
        label: "Auto-Fulfillment",
        href: "/dashboard/autonomous",
        icon: <Zap className="w-4 h-4 shrink-0 text-emerald-400" />,
      },
      {
        label: "Risk Officer",
        href: "/dashboard/risk",
        icon: <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />,
      },
      {
        label: "Kas & Operator",
        href: "/dashboard/operator",
        icon: <Cpu className="w-4 h-4 shrink-0 text-indigo-400" />,
      },
      {
        label: "Marketer Hub",
        href: "/dashboard/marketer",
        icon: <FileText className="w-4 h-4 shrink-0 text-fuchsia-400" />,
      },
      {
        label: "Customer Support",
        href: "/dashboard/support",
        icon: <Headphones className="w-4 h-4 shrink-0 text-sky-400" />,
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
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 w-full",
        active
          ? "bg-white/[0.08] text-white border border-white/[0.09]"
          : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]",
      ].join(" ")}
    >
      <span className={active ? "opacity-100" : "opacity-60"}>
        {item.icon}
      </span>
      <span className="leading-none">{item.label}</span>
      {active && (
        <span className="ml-auto w-1 h-4 rounded-full bg-white/25 shrink-0" />
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
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
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

  return (
    <>
      {/* ── Mobile overlay ─────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col",
          "bg-[#07080d]/98 border-r border-white/[0.06] backdrop-blur-2xl",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4 border-b border-white/[0.05] shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 via-slate-900/50 to-emerald-500/20 border border-white/[0.10] flex items-center justify-center shadow-inner group-hover:border-indigo-400/30 transition-all shrink-0">
              <Shield className="w-4 h-4 text-slate-200 group-hover:text-white transition-colors" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px] tracking-tight text-white">
                  Akshara
                </span>
                <span className="text-[9px] font-mono px-1.5 py-[2px] rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 leading-none">
                  v2.5
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-600 block leading-tight mt-[2px]">
                Autonomous Ops Engine
              </span>
            </div>
          </Link>

          {/* Status */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-medium leading-none">
              All Systems Operational
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-[2px]">
          {navSections.map((section) => (
            <div key={section.title} className="mb-1">
              <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold font-mono tracking-[0.1em] text-slate-600 uppercase select-none">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </div>
          ))}
        </nav>

        {/* Operations Health Telemetry */}
        <OperationsHealthWidget />

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.05] shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Terminal className="w-3 h-3 shrink-0" />
            <span className="text-[10px] font-mono truncate">
              Engineering @ ITS Surabaya
            </span>
          </div>
        </div>
      </aside>

      {/* ── Content wrapper ─────────────────────────────────── */}
      <div className="flex flex-col min-h-screen md:pl-[240px]">
        {/* Mobile top bar — hidden on md+ */}
        <header className="flex md:hidden sticky top-0 z-30 h-[52px] shrink-0 items-center justify-between px-4 bg-[#08090e]/92 border-b border-white/[0.06] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 via-slate-900/50 to-emerald-500/20 border border-white/[0.10] flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 text-slate-200" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white">
              Akshara
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </header>

        {/* Page content */}
        {children}
      </div>
    </>
  );
}

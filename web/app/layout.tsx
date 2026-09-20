import type { Metadata, Viewport } from "next";
import "./globals.css";
import SidebarLayout from "./components/SidebarLayout";

export const viewport: Viewport = {
  themeColor: "#08090e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Akshara Command Center | Operations Dashboard",
  description:
    "Pusat komando operasional otonom Akshara Gaming Center — monitoring multi-seller G2G, kalkulasi margin, dan manajemen garansi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="bg-[#08090e] text-slate-100 min-h-screen antialiased selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
        {/* Ambient Mesh Background */}
        <div className="akshara-ambient-mesh" />

        {/* App Shell with Sidebar */}
        <SidebarLayout>
          <main className="flex-1 relative z-10 v0-grid-pattern">
            {children}
          </main>
          <footer className="relative z-10 border-t border-white/[0.05] py-5">
            <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-[11px] text-slate-700 font-mono">
              <span>Akshara Autonomous Engine &copy; 2026</span>
              <span className="hidden sm:inline">
                Autonomous Ops &bull; Real-Time Analytics &bull; Digital Warranty
              </span>
            </div>
          </footer>
        </SidebarLayout>
      </body>
    </html>
  );
}

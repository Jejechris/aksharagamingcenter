import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SidebarLayout from "./components/SidebarLayout";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Akshara Ops | Operations Dashboard",
  description:
    "Pusat komando operasional otonom Akshara Gaming Center — monitoring multi-seller G2G, kalkulasi margin, dan manajemen garansi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#F8FAFC] text-slate-900 min-h-screen font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </body>
    </html>
  );
}

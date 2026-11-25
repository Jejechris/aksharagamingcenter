import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akshara Gaming Center | Direct Storefront & Portal Klaim Resmi",
  description:
    "Toko lisensi game digital resmi Akshara Gaming Center (0% biaya admin marketplace), verifikasi sertifikat garansi, dan Portal Brankas Klaim terenkripsi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-[#06070a] text-zinc-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-100">
        {children}
      </body>
    </html>
  );
}

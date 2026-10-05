import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akshara Digital License Vault | Portal Klaim Lisensi Resmi",
  description: "Portal resmi pembukaan kredensial akun dan digital key resmi Akshara Gaming Center dengan verifikasi Passcode unik.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-[#070709] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AdminImpersonationBanner } from "@/components/AdminImpersonationBanner";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LopHoc.Online - Nền tảng kết nối giáo viên",
  description: "Kết nối giáo viên và học viên chất lượng cao",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AdminImpersonationBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}

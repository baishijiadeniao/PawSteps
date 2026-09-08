import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DesktopPet } from "@/components/DesktopPet";

export const metadata: Metadata = {
  title: "十一的康复小窝",
  description: "十一的术后康复陪伴小窝",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFF8F0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-cream text-cocoa">
        {children}
        <DesktopPet />
      </body>
    </html>
  );
}

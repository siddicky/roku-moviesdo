import type { Metadata, Viewport } from "next";
import { LibraryProvider } from "@/components/LibraryProvider";
import { Nav } from "@/components/Nav";
import { TvNavigation } from "@/components/TvNavigation";
import { catalogSource, libraryDefaults } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Marquee", template: "%s · Marquee" },
  description: "Marquee is a cinematic shelf for original films and series.",
};

export const viewport: Viewport = {
  themeColor: "#070708",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LibraryProvider defaults={libraryDefaults()} source={catalogSource()}>
          <Nav />
          <TvNavigation />
          {children}
        </LibraryProvider>
      </body>
    </html>
  );
}

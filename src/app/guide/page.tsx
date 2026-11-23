import type { Metadata } from "next";
import { CatalogHeader } from "@/components/CatalogHeader";
import { JewelryGuideClient } from "@/components/JewelryGuideClient";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: `Jewelry Guide | ${SITE_CONFIG.name}`,
  description: `Plain-English guide to ring sizing, resizing, band widths, chain lengths, metals, and stones from ${SITE_CONFIG.name}.`,
};

export default function JewelryGuidePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <CatalogHeader />

      <main className="flex-1">
        <JewelryGuideClient />
      </main>

      <SiteFooter />
    </div>
  );
}

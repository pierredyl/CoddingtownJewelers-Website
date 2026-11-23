export const SITE_CONFIG = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Coddingtown Jewelers",
  /** Store logo path (overridable via NEXT_PUBLIC_STORE_LOGO). */
  logoUrl: process.env.NEXT_PUBLIC_STORE_LOGO || "/images/logo-artisanal-script.png",
  phone: process.env.NEXT_PUBLIC_STORE_PHONE || "+1 707 546 4884",
  email:
    process.env.NEXT_PUBLIC_STORE_EMAIL || "hello@coddingtownjewelers.com",
  address:
    process.env.NEXT_PUBLIC_STORE_ADDRESS ||
    "348 Coddingtown Ctr, Santa Rosa, CA 95401",
  hours: "Mon–Sat: 10:00 AM – 7:00 PM · Sun: 11:00 AM – 6:00 PM",
  hoursList: [
    "Mon – Sat: 10:00 AM – 7:00 PM",
    "Sunday: 11:00 AM – 6:00 PM",
  ],
  metadata: {
    title: process.env.NEXT_PUBLIC_STORE_NAME || "Coddingtown Jewelers",
    description:
      "Coddingtown Jewelers in Santa Rosa, CA — browse our jewelry catalogue by category, note any Item #, and call or visit us in Coddingtown Center.",
  },
  footerNote:
    "Catalogue reference only. Pricing & availability confirmed by Item # — call or visit us.",
} as const;

export function getPhoneHref(phone: string = SITE_CONFIG.phone): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function getEmailHref(email: string = SITE_CONFIG.email): string {
  return `mailto:${email}`;
}

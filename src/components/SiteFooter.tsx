import Link from "next/link";
import { Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { SITE_CONFIG, getEmailHref, getPhoneHref } from "@/config/site";

const CATALOGUE_LINKS = [
  { label: "Engagement Rings", href: "/catalogue/engagement-rings" },
  { label: "Wedding Bands", href: "/catalogue/wedding-bands" },
  { label: "Necklaces & Chains", href: "/catalogue/necklaces-pendants" },
  { label: "Bracelets", href: "/catalogue/bracelets" },
  { label: "Earrings", href: "/catalogue/earrings" },
  { label: "Gemstone Jewelry", href: "/catalogue/gemstone-jewelry" },
  { label: "Jewelry Guide", href: "/guide" },
] as const;

const POLICY_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
] as const;

export function SiteFooter() {
  const phoneHref = getPhoneHref();
  const emailHref = getEmailHref();
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${SITE_CONFIG.name} ${SITE_CONFIG.address}`
  )}`;

  return (
    <footer className="border-t border-gold/25 bg-obsidian text-canvas/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Catalogue Quick Links */}
          <div className="lg:col-span-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
              Catalogue
            </h2>
            <ul className="mt-3.5 space-y-2 text-xs">
              {CATALOGUE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-canvas/80 transition-colors hover:text-gold-light"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Visit & Contact */}
          <div className="lg:col-span-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
              Visit &amp; Contact
            </h2>
            <ul className="mt-3.5 space-y-3 text-xs text-canvas/80">
              <li className="flex items-start gap-2.5">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-light"
                  aria-hidden="true"
                />
                <div>
                  <p>{SITE_CONFIG.address}</p>
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-gold-light underline decoration-gold/50 underline-offset-4 transition-colors hover:text-canvas"
                  >
                    <span>Get Directions</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone
                  className="h-3.5 w-3.5 shrink-0 text-gold-light"
                  aria-hidden="true"
                />
                <a
                  href={phoneHref}
                  className="underline decoration-gold/50 underline-offset-4 transition-colors hover:text-gold-light"
                >
                  {SITE_CONFIG.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail
                  className="h-3.5 w-3.5 shrink-0 text-gold-light"
                  aria-hidden="true"
                />
                <a
                  href={emailHref}
                  className="break-all underline decoration-gold/50 underline-offset-4 transition-colors hover:text-gold-light"
                >
                  {SITE_CONFIG.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Store Hours */}
          <div className="lg:col-span-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
              Hours
            </h2>
            <div className="mt-3.5 flex items-start gap-2.5 text-xs text-canvas/80">
              <Clock
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-light"
                aria-hidden="true"
              />
              <div className="space-y-1.5">
                {SITE_CONFIG.hoursList.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Policies & Legal */}
          <div className="lg:col-span-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
              Policies
            </h2>
            <ul className="mt-3.5 space-y-2 text-xs">
              {POLICY_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-canvas/80 transition-colors hover:text-gold-light"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-10 border-t border-canvas/12 pt-6 text-[11px] text-canvas/60">
          <p>
            &copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import { CatalogHeader } from "@/components/CatalogHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_CONFIG, getEmailHref, getPhoneHref } from "@/config/site";

export const metadata: Metadata = {
  title: `Terms of Use | ${SITE_CONFIG.name}`,
  description: `Terms of use for browsing the ${SITE_CONFIG.name} online catalogue.`,
};

export default function TermsPage() {
  const phoneHref = getPhoneHref();
  const emailHref = getEmailHref();

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2ede4]">
      <CatalogHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <h1 className="font-display text-3xl font-bold text-obsidian sm:text-4xl">
            Terms of Use
          </h1>
          <p className="mt-3 text-xs text-ink-muted">
            Effective {new Date().getFullYear()} &middot; {SITE_CONFIG.name}
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-secondary">
            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Catalogue Reference
              </h2>
              <p className="mt-2">
                This website is provided for browsing jewelry styles, metal
                options, and Item Numbers. Images, stone weights, and
                availability may vary slightly from finished pieces and are
                always confirmed in person or by phone with {SITE_CONFIG.name}.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Pricing &amp; Custom Orders
              </h2>
              <p className="mt-2">
                No purchases are completed online. Pricing, current metal market
                rates, sizing, and special-order timelines are provided directly
                by our store team when you reference an Item #.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Contact Us
              </h2>
              <p className="mt-2">
                Questions about any piece or policy? Call{" "}
                <a
                  href={phoneHref}
                  className="font-medium text-obsidian underline decoration-gold underline-offset-4 hover:text-gold-deep"
                >
                  {SITE_CONFIG.phone}
                </a>{" "}
                or email{" "}
                <a
                  href={emailHref}
                  className="font-medium text-obsidian underline decoration-gold underline-offset-4 hover:text-gold-deep"
                >
                  {SITE_CONFIG.email}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

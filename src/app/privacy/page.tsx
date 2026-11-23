import type { Metadata } from "next";
import { CatalogHeader } from "@/components/CatalogHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_CONFIG, getEmailHref, getPhoneHref } from "@/config/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_CONFIG.name}`,
  description: `Privacy policy and catalogue reference notice for ${SITE_CONFIG.name} in Santa Rosa, CA.`,
};

export default function PrivacyPage() {
  const phoneHref = getPhoneHref();
  const emailHref = getEmailHref();

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2ede4]">
      <CatalogHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <h1 className="font-display text-3xl font-bold text-obsidian sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-xs text-ink-muted">
            Effective {new Date().getFullYear()} &middot; {SITE_CONFIG.name}
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-secondary">
            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Reference Catalogue Only
              </h2>
              <p className="mt-2">
                This website serves as a digital reference catalogue for{" "}
                {SITE_CONFIG.name}. We do not process online payments, maintain
                customer accounts, or sell personal information to third
                parties.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Information You Choose to Share
              </h2>
              <p className="mt-2">
                If you call or email us with a question or Item #, we use your
                contact details solely to respond to your inquiry and assist you
                in store. We do not share your information for marketing
                purposes.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Catalogue Availability &amp; Pricing
              </h2>
              <p className="mt-2">
                Product photos, stone details, and metal options are provided
                for reference and may vary slightly from finished pieces. All
                pricing, availability, and custom order timelines are confirmed
                directly by {SITE_CONFIG.name}.
              </p>
            </section>

            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Questions
              </h2>
              <p className="mt-2">
                For any privacy questions, call us at{" "}
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

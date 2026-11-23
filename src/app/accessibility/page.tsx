import type { Metadata } from "next";
import { CatalogHeader } from "@/components/CatalogHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE_CONFIG, getEmailHref, getPhoneHref } from "@/config/site";

export const metadata: Metadata = {
  title: `Accessibility | ${SITE_CONFIG.name}`,
  description: `Accessibility statement and direct assistance information for ${SITE_CONFIG.name} in Santa Rosa, CA.`,
};

export default function AccessibilityPage() {
  const phoneHref = getPhoneHref();
  const emailHref = getEmailHref();

  return (
    <div className="flex min-h-dvh flex-col bg-[#f2ede4]">
      <CatalogHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <h1 className="font-display text-3xl font-bold text-obsidian sm:text-4xl">
            Accessibility Statement
          </h1>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-secondary">
            <p>
              {SITE_CONFIG.name} is committed to making our website and in-store
              experience welcoming and accessible to every visitor. We work to
              follow Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
              standards across our catalogue, navigation, and personalization
              controls.
            </p>

            <section>
              <h2 className="font-serif text-xl font-semibold text-obsidian">
                Need Assistance?
              </h2>
              <p className="mt-2">
                If you encounter any difficulty browsing our catalogue, reading
                an Item #, or viewing options on any device, please reach out.
                We are happy to help directly over the phone or in person at{" "}
                {SITE_CONFIG.address}.
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <strong className="text-obsidian">Phone:</strong>{" "}
                  <a
                    href={phoneHref}
                    className="underline decoration-gold underline-offset-4 hover:text-gold-deep"
                  >
                    {SITE_CONFIG.phone}
                  </a>
                </li>
                <li>
                  <strong className="text-obsidian">Email:</strong>{" "}
                  <a
                    href={emailHref}
                    className="underline decoration-gold underline-offset-4 hover:text-gold-deep"
                  >
                    {SITE_CONFIG.email}
                  </a>
                </li>
                <li>
                  <strong className="text-obsidian">Hours:</strong>{" "}
                  {SITE_CONFIG.hours}
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

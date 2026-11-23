"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { STORE_FAQS } from "@/config/faq";
import type { StoreYelpData } from "@/config/reviews";
import { SITE_CONFIG, getEmailHref, getPhoneHref } from "@/config/site";
import { SITE_IMAGES } from "@/config/siteImages";

const STORE_SERVICES = [
  {
    id: "repairs-sizing",
    title: "Repairs & Sizing",
    summary: "Repairs, resizing, and restorations — all done right here in store.",
    image: SITE_IMAGES.serviceRepairs,
    imageAlt:
      "18K yellow gold diamond ring held in a jeweler's bench clamp beside loose accent diamonds, setting pliers, brass loupe, and a gold chain",
    colClass: "md:col-span-5",
    aspectClass: "aspect-[4/3]",
  },
  {
    id: "cleaning",
    title: "Complimentary Cleaning",
    summary: "Stop by anytime for complimentary jewelry cleaning.",
    image: SITE_IMAGES.serviceCleaning,
    imageAlt:
      "Sparkling diamond solitaire studs, pavé band, and sterling silver and gold chain on warm ivory linen",
    colClass: "md:col-span-3 md:mt-16",
    aspectClass: "aspect-[4/5]",
  },
  {
    id: "personalize",
    title: "Personalize & Order",
    summary:
      "Choose your metal, stone, or size from our catalogue or with us at the counter.",
    image: SITE_IMAGES.servicePersonalize,
    imageAlt:
      "Loose royal blue sapphire, emerald, and diamond arranged beside an 18K gold ring mounting and brass calipers",
    colClass: "md:col-span-4 md:mt-6",
    aspectClass: "aspect-[4/3]",
  },
] as const;

interface HomeShowcaseProps {
  yelpData: StoreYelpData;
}

export function HomeShowcase({ yelpData }: HomeShowcaseProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [activeServiceIdx, setActiveServiceIdx] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const [reviewsPaused, setReviewsPaused] = useState(false);

  const activeService = STORE_SERVICES[activeServiceIdx];

  const REVIEWS_PER_VIEW = 3;
  const reviewPageCount = Math.max(
    1,
    Math.ceil(yelpData.reviews.length / REVIEWS_PER_VIEW)
  );

  useEffect(() => {
    if (reviewPageCount <= 1 || reviewsPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setReviewPage((prev) => (prev + 1) % reviewPageCount);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [reviewPageCount, reviewsPaused]);

  const visibleReviews = yelpData.reviews.slice(
    reviewPage * REVIEWS_PER_VIEW,
    reviewPage * REVIEWS_PER_VIEW + REVIEWS_PER_VIEW
  );

  const phoneHref = getPhoneHref();
  const emailHref = getEmailHref();

  return (
    <div className="w-full bg-[#f2ede4] text-obsidian">
      {/* 1. Full-Bleed Editorial Hero (ever so slightly taller than the Services banner below) */}
      <section
        aria-labelledby="home-hero-heading"
        className="relative min-h-[540px] w-full overflow-hidden bg-obsidian sm:min-h-[620px] lg:min-h-[670px]"
      >
        <img
          src={SITE_IMAGES.homeHero}
          alt={`Fine diamond engagement ring, 18K gold band, tennis bracelet, and gold chain at ${SITE_CONFIG.name}`}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#12100e]/82 via-[#12100e]/42 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#12100e]/55 to-transparent"
        />

        <div className="relative z-10 mx-auto flex min-h-[540px] max-w-7xl flex-col justify-end px-4 py-12 sm:min-h-[620px] sm:px-6 sm:py-16 lg:min-h-[670px] lg:px-8 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h1
              id="home-hero-heading"
              className="font-display text-4xl font-bold leading-[1.08] tracking-normal text-canvas sm:text-6xl lg:text-[64px]"
            >
              Your neighborhood jeweler in Santa Rosa.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-canvas/92 sm:text-lg">
              We take pride in taking care of our neighbors. Honest guidance,
              zero pressure, and the time to help you find something that truly
              feels like yours.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/catalogue"
                className="inline-flex items-center gap-2 rounded-pill bg-gold px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-obsidian shadow-sm transition-all duration-200 hover:bg-gold-light"
              >
                <span>Explore Catalogue</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-pill border border-canvas/40 bg-[#12100e]/40 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-canvas backdrop-blur-sm transition-all duration-200 hover:border-gold hover:text-gold-light"
              >
                <span>Hours &amp; Visit Us</span>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Rotating Customer Reviews Section on Clean Warm Stone Surface */}
      {yelpData.reviews.length > 0 && (
        <motion.section
          aria-labelledby="reviews-heading"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onMouseEnter={() => setReviewsPaused(true)}
          onMouseLeave={() => setReviewsPaused(false)}
          className="border-b border-hairline bg-[#f2ede4] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2
                  id="reviews-heading"
                  className="font-display text-3xl font-bold tracking-normal text-obsidian sm:text-4xl"
                >
                  What Our Customers Say
                </h2>
                {yelpData.rating !== null && yelpData.reviewCount !== null && (
                  <div className="mt-2.5 flex items-center gap-2 text-sm text-ink-secondary">
                    <span
                      className="inline-flex items-center gap-0.5 text-gold-deep"
                      aria-label={`${yelpData.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.round(yelpData.rating ?? 5)
                              ? "fill-gold text-gold"
                              : "text-obsidian/20"
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                    <span className="font-semibold text-obsidian">
                      {yelpData.rating.toFixed(1)}
                    </span>
                    <span>
                      based on {yelpData.reviewCount.toLocaleString()} Yelp{" "}
                      {yelpData.reviewCount === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                )}
              </div>

              <a
                href={yelpData.yelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-pill border border-obsidian/20 bg-[#faf7f1] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-obsidian transition-colors hover:border-obsidian hover:bg-obsidian hover:text-canvas"
              >
                <span>Read Reviews on Yelp</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={reviewPage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="grid gap-6 md:grid-cols-3"
              >
                {visibleReviews.map((review) => (
                  <article
                    key={review.id}
                    className="flex flex-col justify-between rounded-card border border-obsidian/10 bg-[#faf7f1] p-6 shadow-[0_8px_24px_rgba(17,17,17,0.05)]"
                  >
                    <div>
                      <div
                        className="flex items-center gap-0.5"
                        aria-label={`${review.rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-gold text-gold"
                                : "text-obsidian/20"
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>

                      <p className="mt-4 text-base leading-relaxed text-obsidian/90">
                        &ldquo;{review.text}&rdquo;
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3 border-t border-obsidian/10 pt-4 text-xs">
                      <div>
                        <p className="font-semibold text-obsidian">
                          {review.author}
                        </p>
                        <p className="text-ink-muted">{review.dateLabel}</p>
                      </div>

                      {review.url && (
                        <a
                          href={review.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-gold-deep transition-colors hover:text-obsidian"
                        >
                          <span>Yelp</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </motion.div>
            </AnimatePresence>

            {reviewPageCount > 1 && (
              <div
                role="group"
                aria-label="Review pages"
                className="mt-8 flex items-center justify-center gap-2"
              >
                {Array.from({ length: reviewPageCount }).map((_, idx) => {
                  const active = idx === reviewPage;
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Show review set ${idx + 1}`}
                      aria-pressed={active}
                      onClick={() => setReviewPage(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        active
                          ? "w-7 bg-obsidian"
                          : "w-2 bg-obsidian/25 hover:bg-obsidian/50"
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>
      )}

      {/* 3. Services Section with Full-Bleed Crossfading Background Imagery */}
      <section
        aria-labelledby="services-heading"
        className="relative min-h-[560px] w-full overflow-hidden border-b border-gold/20 bg-[#141210] py-18 sm:min-h-[620px] sm:py-24"
      >
        {/* Crossfading Full-Bleed Service Background Photograph */}
        <AnimatePresence initial={false}>
          <motion.img
            key={activeService.id}
            src={activeService.image}
            alt={activeService.imageAlt}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          />
        </AnimatePresence>

        {/* Directional Gradient Scrim — crisp text readability on the left, vivid photography on the right */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#12100e]/90 via-[#12100e]/68 to-[#12100e]/22"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#12100e]/70 to-transparent"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <h2
              id="services-heading"
              className="font-display text-4xl font-bold tracking-normal text-canvas drop-shadow-xs sm:text-5xl"
            >
              Services
            </h2>

            {/* Interactive Service Rows Floating Over Background Image */}
            <div
              role="group"
              aria-label="In-store services"
              className="mt-8 divide-y divide-canvas/20 border-y border-canvas/20"
            >
              {STORE_SERVICES.map((svc, idx) => {
                const active = idx === activeServiceIdx;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    aria-pressed={active}
                    onMouseEnter={() => setActiveServiceIdx(idx)}
                    onFocus={() => setActiveServiceIdx(idx)}
                    onClick={() => setActiveServiceIdx(idx)}
                    className={`group/row relative flex w-full items-start gap-5 py-6 text-left transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:py-7 ${
                      active ? "opacity-100" : "opacity-65 hover:opacity-95"
                    }`}
                  >
                    {/* Active Gold Accent Indicator */}
                    <span
                      aria-hidden="true"
                      className={`mt-3 h-0.5 shrink-0 transition-all duration-300 ${
                        active ? "w-7 bg-gold-light" : "w-3 bg-canvas/35"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-2xl font-bold tracking-normal text-canvas sm:text-3xl">
                        {svc.title}
                      </h3>

                      <p
                        className={`mt-2 text-sm leading-relaxed sm:text-base ${
                          active ? "text-canvas/92" : "text-canvas/75"
                        }`}
                      >
                        {svc.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Family Heritage Section with Stylish Black-and-White Archival-Style Photo */}
      <section
        aria-labelledby="heritage-heading"
        className="border-b border-hairline bg-[#eae3d6] py-18 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="lg:col-span-6"
            >
              <h2
                id="heritage-heading"
                className="font-display text-3xl font-bold leading-tight tracking-normal text-obsidian sm:text-4xl lg:text-5xl"
              >
                Family-owned, serving Santa Rosa for generations.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-secondary">
                Founded in 1976 and proudly family-owned,{" "}
                {SITE_CONFIG.name} has spent decades helping Sonoma County
                celebrate engagements, anniversaries, and everyday milestones.
              </p>

              <div className="mt-8 grid max-w-sm grid-cols-2 gap-6 border-t border-obsidian/12 pt-6">
                <div>
                  <p className="font-serif text-2xl font-semibold text-obsidian sm:text-3xl">
                    1976
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-deep">
                    Founded
                  </p>
                </div>
                <div>
                  <p className="font-serif text-2xl font-semibold text-obsidian sm:text-3xl">
                    Family
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-deep">
                    Owned &amp; Operated
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Stylish Monochrome Black-and-White Frame (Swap src to your own 1976 family/store photo anytime!) */}
            <motion.figure
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
              className="lg:col-span-6"
            >
              <div className="overflow-hidden rounded-card border border-obsidian/15 bg-obsidian p-2.5 shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[6px]">
                  <img
                    src={SITE_IMAGES.homeHeritage}
                    alt="Black and white archival-style photograph of a classic jeweler's bench, loupe, ring mandrel, and gold bands"
                    loading="lazy"
                    className="h-full w-full object-cover grayscale contrast-110 transition-transform duration-700 ease-out hover:scale-[1.03]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian/50 via-transparent to-transparent"
                  />
                  <figcaption className="absolute bottom-3 left-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-canvas/85">
                    Santa Rosa, CA &middot; Since 1976
                  </figcaption>
                </div>
              </div>
            </motion.figure>
          </div>
        </div>
      </section>

      {/* 5. Contact & Visit Us Over Darker Warm Boutique Background (100% from SITE_CONFIG) */}
      <section
        id="contact"
        aria-labelledby="contact-heading"
        className="relative scroll-mt-20 overflow-hidden bg-obsidian py-18 sm:py-22"
      >
        <img
          src={SITE_IMAGES.homeContact}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#12100e]/82 via-[#12100e]/52 to-[#12100e]/28"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <h2
                id="contact-heading"
                className="font-display text-3xl font-bold tracking-normal text-canvas drop-shadow-xs sm:text-4xl"
              >
                Reach {SITE_CONFIG.name}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-canvas/85 sm:text-base">
                Have a question or an Item # from the catalogue? Give us a call,
                send an email, or stop by our store in Coddingtown Center.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={phoneHref}
                  className="inline-flex items-center gap-2 rounded-pill bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-obsidian shadow-sm transition-colors hover:bg-gold-light"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Call {SITE_CONFIG.phone}</span>
                </a>
                <a
                  href={emailHref}
                  className="inline-flex items-center gap-2 rounded-pill border border-canvas/35 bg-[#12100e]/45 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-canvas backdrop-blur-sm transition-colors hover:border-gold hover:text-gold-light"
                >
                  <Mail
                    className="h-3.5 w-3.5 text-gold-light"
                    aria-hidden="true"
                  />
                  <span>Email Us</span>
                </a>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              <div className="rounded-card border border-canvas/20 bg-[#12100e]/55 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <Phone
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold-light"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                      Phone
                    </span>
                    <a
                      href={phoneHref}
                      className="mt-1 block text-sm font-medium text-canvas underline decoration-gold/70 underline-offset-4 hover:text-gold-light"
                    >
                      {SITE_CONFIG.phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-card border border-canvas/20 bg-[#12100e]/55 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <Mail
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold-light"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                      Email
                    </span>
                    <a
                      href={emailHref}
                      className="mt-1 block break-all text-sm font-medium text-canvas underline decoration-gold/70 underline-offset-4 hover:text-gold-light"
                    >
                      {SITE_CONFIG.email}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-card border border-canvas/20 bg-[#12100e]/55 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold-light"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                      Address
                    </span>
                    <p className="mt-1 text-sm text-canvas/90">
                      {SITE_CONFIG.address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-card border border-canvas/20 bg-[#12100e]/55 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="flex items-start gap-3">
                  <Clock
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold-light"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                      Hours
                    </span>
                    <div className="mt-1 space-y-0.5 text-sm text-canvas/90">
                      {SITE_CONFIG.hoursList.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Dedicated Non-Image Q&A Section (managed cleanly in src/config/faq.ts) */}
      {STORE_FAQS.length > 0 && (
        <section
          aria-labelledby="faq-heading"
          className="border-t border-hairline bg-[#f2ede4] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2
              id="faq-heading"
              className="font-display text-3xl font-bold tracking-normal text-obsidian sm:text-4xl"
            >
              Common Questions
            </h2>

            <div className="mt-7 divide-y divide-obsidian/12 overflow-hidden rounded-card border border-obsidian/12 bg-[#faf7f1] shadow-[0_8px_24px_rgba(17,17,17,0.06)]">
              {STORE_FAQS.map((faq) => {
                const isOpen = openFaqId === faq.id;
                const panelId = `faq-panel-${faq.id}`;
                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() =>
                        setOpenFaqId((prev) =>
                          prev === faq.id ? null : faq.id
                        )
                      }
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#f2ede4]/60"
                    >
                      <span className="text-base font-semibold text-obsidian sm:text-lg">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-gold-deep transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={panelId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <p className="px-6 pb-6 text-base leading-relaxed text-obsidian/90">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

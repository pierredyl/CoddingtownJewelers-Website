"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home", href: "/", match: (p: string) => p === "/" },
  {
    label: "Catalogue",
    href: "/catalogue",
    match: (p: string) => p.startsWith("/catalogue"),
  },
  {
    label: "Jewelry Guide",
    href: "/guide",
    match: (p: string) => p === "/guide" || p.startsWith("/guide/"),
  },
] as const;

export function HeaderNavLinks() {
  const pathname = usePathname();

  return (
    <ul className="flex items-center gap-6 sm:gap-9">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative whitespace-nowrap py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors sm:text-xs ${
                isActive
                  ? "text-obsidian"
                  : "text-ink-secondary hover:text-obsidian"
              }`}
            >
              {item.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 -bottom-1 h-[1.5px] bg-gold transition-transform duration-300 origin-left ${
                  isActive ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

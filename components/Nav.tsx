"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";

const LINKS = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/movies", label: "Movies", icon: "film" as const },
  { href: "/tv", label: "TV Shows", icon: "tv" as const },
  { href: "/search", label: "Search", icon: "search" as const },
  { href: "/library", label: "Library", icon: "library" as const },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "nav scrolled" : "nav"}>
      <div className="nav-inner" data-tv-row="nav">
        <Link href="/" className="brand" data-tv-item="" aria-label="Marquee home">
          <span className="mark" />
          <span className="word">marquee</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((link) => {
            const current = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} className="nav-link" aria-current={current ? "page" : undefined} data-tv-item="">
                <Icon name={link.icon} />
                <span className="label">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

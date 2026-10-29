"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { MetaLine } from "@/components/MetaLine";
import { PlayButton } from "@/components/PlayButton";
import type { MediaCard } from "@/lib/types";

const ROTATE_MS = 7000;

export function Hero({ items, eyebrow, compact = false }: { items: MediaCard[]; eyebrow?: string; compact?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const shiftFrame = useRef(0);
  const count = items.length;
  const item = items[index] ?? items[0];

  useEffect(() => {
    if (!count || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, index]);

  useEffect(() => {
    function onHero(event: Event) {
      const dir = (event as CustomEvent<number>).detail || 1;
      setIndex((current) => (current + dir + count) % count);
    }
    window.addEventListener("marquee-hero", onHero);
    return () => window.removeEventListener("marquee-hero", onHero);
  }, [count]);

  if (!item) return null;

  function onMove(event: React.MouseEvent<HTMLElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * -18;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
    if (shiftFrame.current) return;
    shiftFrame.current = window.requestAnimationFrame(() => {
      setShift({ x, y });
      shiftFrame.current = 0;
    });
  }

  return (
    <section
      className={compact ? "hero compact" : "hero"}
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseLeave={() => setShift({ x: 0, y: 0 })}
      onMouseMove={onMove}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      {items.map((slide, slideIndex) => (
        <div key={slide.id} className={slideIndex === index ? "slide on" : "slide"} aria-hidden={slideIndex !== index}>
          <div className="slide-media" style={slideIndex === index ? { transform: `translate(${shift.x}px, ${shift.y}px)` } : undefined}>
            <img src={slide.backdrop || slide.poster} alt="" />
          </div>
        </div>
      ))}
      <div className="hero-shade" />
      <div className="hero-grain" />
      <div className="hero-content">
        <div className="copy-swap" key={item.id}>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="hero-title">{item.title}</h1>
          <p className="hero-logline">{item.logline || item.description}</p>
          <MetaLine card={item} />
        </div>
        <div
          className="hero-actions"
          data-tv-row="hero"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <PlayButton videoId={item.id} label={item.progress && item.progress > 2 ? "Resume" : "Play"} primary />
          <Link href={`/title/${item.id}`} className="btn btn-ghost" data-tv-item="">
            <Icon name="info" />
            More Info
          </Link>
        </div>
        {count > 1 ? (
          <div className="hero-dots">
            {items.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                className={slideIndex === index ? "hero-dot on" : "hero-dot"}
                aria-label={`Show ${slide.title}`}
                aria-current={slideIndex === index}
                onClick={() => setIndex(slideIndex)}
              >
                <span>
                  <i />
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

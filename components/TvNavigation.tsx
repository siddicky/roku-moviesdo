"use client";

import { useEffect } from "react";

function rows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-tv-row]")].filter((row) => row.offsetParent !== null || row.getClientRects().length > 0);
}

function itemsIn(row: HTMLElement): HTMLElement[] {
  return [...row.querySelectorAll<HTMLElement>("[data-tv-item]")];
}

function centerX(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return rect.left + rect.width / 2;
}

function moveInGrid(current: HTMLElement, key: string): HTMLElement | null {
  const grid = current.closest("[data-tv-grid]");
  if (!(grid instanceof HTMLElement)) return null;
  const items = [...grid.querySelectorAll<HTMLElement>("[data-tv-item]")];
  const rect = current.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const item of items) {
    if (item === current) continue;
    const box = item.getBoundingClientRect();
    const dx = box.left + box.width / 2 - cx;
    const dy = box.top + box.height / 2 - cy;
    if (key === "ArrowRight" && dx <= 8) continue;
    if (key === "ArrowLeft" && dx >= -8) continue;
    if (key === "ArrowDown" && dy <= 8) continue;
    if (key === "ArrowUp" && dy >= -8) continue;
    const primary = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
    const secondary = key === "ArrowLeft" || key === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2.4;
    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return best;
}

function focusItem(el: HTMLElement) {
  el.focus({ preventScroll: true });
  const scroller = el.closest(".row-scroller");
  if (scroller instanceof HTMLElement) {
    const item = el.getBoundingClientRect();
    const frame = scroller.getBoundingClientRect();
    const delta = item.left - frame.left - (frame.width - item.width) / 2;
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  }
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

export function TvNavigation() {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = event.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) return;
      if (document.querySelector("[data-player-open]")) return;

      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        if (key === "ArrowLeft" || key === "ArrowRight") return;
      }

      const allRows = rows();
      if (!allRows.length) return;

      const current = active?.closest("[data-tv-item]") instanceof HTMLElement
        ? (active.closest("[data-tv-item]") as HTMLElement)
        : null;

      if (!current) {
        const primary = document.querySelector<HTMLElement>("[data-tv-primary]") ?? document.querySelector<HTMLElement>("[data-tv-item]");
        if (primary) {
          event.preventDefault();
          focusItem(primary);
        }
        return;
      }

      const row = current.closest("[data-tv-row]");
      if (!(row instanceof HTMLElement)) return;

      if (current.closest("[data-tv-grid]")) {
        const moved = moveInGrid(current, key);
        if (moved || key === "ArrowLeft" || key === "ArrowRight") {
          event.preventDefault();
          if (moved) focusItem(moved);
          return;
        }
      }

      const siblings = itemsIn(row);
      const index = siblings.indexOf(current);
      const rowIndex = allRows.indexOf(row);

      if (key === "ArrowLeft" || key === "ArrowRight") {
        const dir = key === "ArrowRight" ? 1 : -1;
        const next = siblings[index + dir];
        event.preventDefault();
        if (next) {
          focusItem(next);
          return;
        }
        if (row.dataset.tvRow === "hero") {
          window.dispatchEvent(new CustomEvent("marquee-hero", { detail: dir }));
        }
        return;
      }

      const dir = key === "ArrowDown" ? 1 : -1;
      const targetRow = allRows[rowIndex + dir];
      if (!targetRow) return;
      const candidates = itemsIn(targetRow);
      if (!candidates.length) return;
      const x = centerX(current);
      let best = candidates[0];
      let bestDist = Infinity;
      for (const candidate of candidates) {
        const dist = Math.abs(centerX(candidate) - x);
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
      event.preventDefault();
      focusItem(best);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}

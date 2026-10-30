"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icons";
import { MediaCard } from "@/components/MediaCard";
import { MediaRow } from "@/components/MediaRow";
import type { MediaCard as Card, MediaRow as Row } from "@/lib/types";

const CHIPS = ["Drama", "Sci-Fi", "Thriller", "Animation", "Comedy", "Mystery", "Adventure"];

function matches(card: Card, query: string) {
  const hay = `${card.title} ${card.logline} ${card.description} ${card.genres.join(" ")} ${card.year} ${card.kind}`.toLowerCase();
  return hay.includes(query);
}

export function SearchScreen({
  initialQuery,
  initialResults,
  suggestions,
  catalog,
}: {
  initialQuery: string;
  initialResults: Card[];
  suggestions: Row[];
  catalog?: Card[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [remote, setRemote] = useState(initialResults);
  const [pending, setPending] = useState(false);
  const [settled, setSettled] = useState(Boolean(initialQuery));
  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();

  const localResults = useMemo(() => {
    if (!catalog || !needle) return null;
    return catalog.filter((card) => matches(card, needle));
  }, [catalog, needle]);

  useEffect(() => {
    if (catalog) return;
    if (!trimmed) {
      setRemote([]);
      setSettled(false);
      setPending(false);
      return;
    }
    let cancelled = false;
    setPending(true);
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then(async (response) => {
          const data = (await response.json()) as { items?: Card[] };
          if (cancelled) return;
          setRemote(data.items ?? []);
          setSettled(true);
          window.history.replaceState(null, "", `/search?q=${encodeURIComponent(trimmed)}`);
        })
        .catch(() => {
          if (!cancelled) setSettled(true);
        })
        .finally(() => {
          if (!cancelled) setPending(false);
        });
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed, catalog]);

  useEffect(() => {
    if (!catalog) return;
    const url = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
    window.history.replaceState(null, "", url);
  }, [trimmed, catalog]);

  const results = localResults ?? remote;
  const showEmpty = Boolean(trimmed) && results.length === 0 && (catalog ? true : settled && !pending);

  return (
    <div className="page">
      <h1 className="page-title">Search</h1>
      <p className="lede">Find a title, a genre, or a word from the description.</p>
      <div data-tv-row="search">
        <label className="search-field">
          <Icon name="search" />
          <input
            data-tv-item=""
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titles, genres, stories"
            autoFocus
            aria-label="Search titles"
          />
        </label>
      </div>
      <div className="chips" data-tv-row="chips">
        {CHIPS.map((chip) => (
          <button key={chip} type="button" className="chip" data-tv-item="" aria-pressed={query === chip} onClick={() => setQuery(chip)}>
            {chip}
          </button>
        ))}
      </div>
      {trimmed ? (
        <>
          <p className="result-count" aria-live="polite">
            {pending && !catalog ? "Searching…" : `${results.length} ${results.length === 1 ? "title" : "titles"}`}
          </p>
          {showEmpty ? (
            <div className="empty">Nothing matches “{trimmed}”. Try a title or a genre.</div>
          ) : (
            <div className="grid" data-tv-row="results" data-tv-grid="">
              {results.map((card) => (
                <MediaCard key={card.id} card={card} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="rows">
          {suggestions.map((row) => (
            <MediaRow key={row.title} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

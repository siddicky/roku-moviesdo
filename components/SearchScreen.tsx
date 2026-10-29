"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { MediaCard } from "@/components/MediaCard";
import { MediaRow } from "@/components/MediaRow";
import type { MediaCard as Card, MediaRow as Row } from "@/lib/types";

const CHIPS = ["Drama", "Sci-Fi", "Thriller", "Animation", "Comedy", "Mystery", "Adventure"];

export function SearchScreen({
  initialQuery,
  initialResults,
  suggestions,
}: {
  initialQuery: string;
  initialResults: Card[];
  suggestions: Row[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === initialQuery.trim()) {
      setResults(initialResults);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPending(true);
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(async (response) => {
          const data = (await response.json()) as { items?: Card[] };
          setResults(data.items ?? []);
          const url = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
          window.history.replaceState(null, "", url);
        })
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") return;
        })
        .finally(() => setPending(false));
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, initialQuery, initialResults]);

  const trimmed = query.trim();

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
          <p className="result-count">
            {pending ? "Searching…" : `${results.length} ${results.length === 1 ? "title" : "titles"}`}
          </p>
          {results.length === 0 && !pending ? (
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

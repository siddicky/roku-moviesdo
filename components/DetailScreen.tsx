"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { useLibrary } from "@/components/LibraryProvider";
import { MediaRow } from "@/components/MediaRow";
import { MetaLine } from "@/components/MetaLine";
import { PlayButton } from "@/components/PlayButton";
import type { TitleDetail } from "@/lib/types";

const Player = dynamic(() => import("@/components/Player").then((mod) => mod.Player), { ssr: false });

export function DetailScreen({ detail }: { detail: TitleDetail }) {
  const router = useRouter();
  const library = useLibrary();
  const { card, seasons, related } = detail;
  const [seasonIndex, setSeasonIndex] = useState(0);
  const [episodeId, setEpisodeId] = useState<string | null>(null);
  const season = seasons[seasonIndex] ?? seasons[0];
  const multi = seasons.some((entry) => entry.episodes.length > 1) || seasons.length > 1;
  const progress = library.progressFor(card.id) || card.progress || 0;
  const saved = library.inList(card.id);
  const later = library.inLater(card.id);

  return (
    <article className="detail">
      <header className="detail-hero">
        <img className="detail-bg" src={card.backdrop || card.poster} alt="" />
        <div className="hero-shade" />
        <div className="hero-grain" />
        <div className="detail-copy">
          <div data-tv-row="back">
            <button
              type="button"
              className="back"
              data-tv-item=""
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push("/");
              }}
            >
              <Icon name="back" />
              Back
            </button>
          </div>
          <h1 className="detail-title">{card.title}</h1>
          <MetaLine card={card} />
          <p className="detail-desc">{card.description || card.logline}</p>
          <div className="hero-actions" data-tv-row="detail-actions">
            <PlayButton
              videoId={card.id}
              referer={card.watchUrl || `/title/${card.id}`}
              label={progress > 2 && progress < 97 ? "Resume" : "Play"}
              primary
            />
            <button type="button" className="btn btn-ghost" data-tv-item="" onClick={() => library.toggleList(card.id)} aria-pressed={saved}>
              <Icon name={saved ? "check" : "plus"} />
              {saved ? "In My List" : "My List"}
            </button>
            <button type="button" className="btn btn-ghost" data-tv-item="" onClick={() => library.toggleLater(card.id)} aria-pressed={later}>
              {later ? "Saved for Later" : "Watch Later"}
            </button>
          </div>
        </div>
      </header>

      {multi && season ? (
        <section aria-label="Episodes">
          {seasons.length > 1 ? (
            <div className="season-tabs" role="tablist" data-tv-row="seasons">
              {seasons.map((entry, index) => (
                <button
                  key={entry.title || index}
                  type="button"
                  className="season-tab"
                  role="tab"
                  data-tv-item=""
                  aria-selected={index === seasonIndex}
                  onClick={() => setSeasonIndex(index)}
                >
                  {entry.title || `Season ${index + 1}`}
                </button>
              ))}
            </div>
          ) : (
            <h2 className="row-title">Episodes</h2>
          )}
          <div>
            {season.episodes.map((episode, index) => (
              <div key={episode.id} data-tv-row="">
                <button type="button" className="episode" data-tv-item="" onClick={() => setEpisodeId(episode.id)}>
                  <img src={episode.poster || card.backdrop} alt="" />
                  <span>
                    <h3>
                      {index + 1}. {episode.title}
                    </h3>
                    <p>{episode.synopsis}</p>
                  </span>
                  <span className="ep-dur">{episode.duration}</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <MediaRow row={{ title: "Related", variant: "poster", items: related }} />
      ) : null}

      {episodeId ? (
        <Player videoId={episodeId} referer={card.watchUrl || `/title/${card.id}`} onClose={() => setEpisodeId(null)} />
      ) : null}
    </article>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import { useLibrary } from "@/components/LibraryProvider";
import { formatClock } from "@/lib/time";
import type { StreamPayload } from "@/lib/types";

export function Player({
  videoId,
  referer,
  onClose,
}: {
  videoId: string;
  referer: string;
  onClose: () => void;
}) {
  const library = useLibrary();
  const [data, setData] = useState<StreamPayload | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const parentId = videoId.replace(/-s\d+e\d+$/, "");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/stream?video_id=${encodeURIComponent(videoId)}&referer=${encodeURIComponent(referer)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as StreamPayload & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Playback is unavailable");
        setData(payload);
        setSeconds(payload.watched_seconds || 0);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Playback is unavailable");
      });
    return () => controller.abort();
  }, [videoId, referer]);

  useEffect(() => {
    if (!playing || !data?.preview) return;
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        const next = Math.min((data.duration_seconds || 3600) - 1, current + 1);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, data]);

  useEffect(() => {
    if (!data?.duration_seconds || seconds <= 0 || seconds % 5 !== 0) return;
    library.setProgress(parentId, (seconds / data.duration_seconds) * 100);
  }, [seconds, data, library, parentId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
        const video = videoRef.current;
        if (video) {
          if (video.paused) void video.play();
          else video.pause();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const duration = data?.duration_seconds || 0;
  const stream = data?.streams?.[0];

  return (
    <div className="player" data-player-open="" role="dialog" aria-modal="true" aria-label={data?.title || "Player"}>
      <div className="player-stage">
        {stream ? (
          <video
            ref={videoRef}
            src={stream.url}
            poster={data?.backdrop}
            autoPlay
            controls={false}
            onTimeUpdate={(event) => setSeconds(event.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : (
          data?.backdrop && <img src={data.backdrop} alt="" className={playing ? "playing" : ""} />
        )}
        <div className="player-ui">
          <div className="player-top">
            <div>
              <h2 className="player-title">{data?.title || "Loading"}</h2>
              {data?.subtitle ? <p className="player-sub">{data.subtitle}</p> : null}
              {error ? <p className="player-sub">{error}</p> : null}
            </div>
            <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close player">
              <Icon name="close" />
              Close
            </button>
          </div>
          <div className="scrub">
            <button type="button" className="btn btn-primary" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>
              <Icon name={playing ? "pause" : "play"} />
              {playing ? "Pause" : "Play"}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={Math.min(seconds, duration || seconds)}
              aria-label="Playback position"
              onChange={(event) => {
                const next = Number(event.target.value);
                setSeconds(next);
                if (videoRef.current) videoRef.current.currentTime = next;
              }}
            />
            <span className="clock">
              {formatClock(seconds)} / {formatClock(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

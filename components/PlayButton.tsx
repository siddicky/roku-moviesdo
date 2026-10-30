"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Icon } from "@/components/Icons";

const Player = dynamic(() => import("@/components/Player").then((mod) => mod.Player), { ssr: false });

export function PlayButton({
  videoId,
  referer = "",
  label = "Play",
  variant = "primary",
  primary = false,
}: {
  videoId: string;
  referer?: string;
  label?: string;
  variant?: "primary" | "ghost";
  primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`btn ${variant === "primary" ? "btn-primary" : "btn-ghost"}`}
        data-tv-item=""
        data-tv-primary={primary ? "" : undefined}
        onClick={() => setOpen(true)}
      >
        <Icon name="play" />
        {label}
      </button>
      {open ? <Player videoId={videoId} referer={referer} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

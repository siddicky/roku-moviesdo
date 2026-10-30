"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CatalogSource, LibraryDefaults } from "@/lib/types";

const KEY = "marquee.library.v1";

type Store = {
  list: string[];
  later: string[];
  progress: Record<string, number>;
};

type LibraryApi = Store & {
  inList: (id: string) => boolean;
  inLater: (id: string) => boolean;
  progressFor: (id: string) => number;
  toggleList: (id: string) => void;
  toggleLater: (id: string) => void;
  setProgress: (id: string, value: number) => void;
};

const Ctx = createContext<LibraryApi | null>(null);

function fromDefaults(defaults: LibraryDefaults): Store {
  const progress: Record<string, number> = {};
  for (const item of defaults.continue) progress[item.id] = item.progress;
  return { list: [...defaults.list], later: [...defaults.later], progress };
}

function parseStore(raw: string, fallback: Store): Store {
  try {
    const data = JSON.parse(raw) as Partial<Store>;
    return {
      list: Array.isArray(data.list) ? data.list.filter((id) => typeof id === "string") : fallback.list,
      later: Array.isArray(data.later) ? data.later.filter((id) => typeof id === "string") : fallback.later,
      progress:
        data.progress && typeof data.progress === "object"
          ? Object.fromEntries(
              Object.entries(data.progress).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
            )
          : fallback.progress,
    };
  } catch {
    return fallback;
  }
}

export function LibraryProvider({
  defaults,
  source,
  children,
}: {
  defaults: LibraryDefaults;
  source: CatalogSource;
  children: React.ReactNode;
}) {
  const seed = useMemo(() => fromDefaults(defaults), [defaults]);
  const [store, setStore] = useState<Store>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) setStore(parseStore(raw, seed));
    setHydrated(true);
  }, [seed]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(store));
  }, [store, hydrated]);

  const api = useMemo<LibraryApi>(() => {
    function persistRemote(kind: "favorite" | "watch-later", id: string, add: boolean) {
      if (source !== "bridge") return;
      void fetch("/api/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, production_id: id, action: add ? "add" : "delete" }),
      });
    }
    return {
      ...store,
      inList: (id) => store.list.includes(id),
      inLater: (id) => store.later.includes(id),
      progressFor: (id) => store.progress[id] ?? 0,
      toggleList: (id) => {
        const has = store.list.includes(id);
        persistRemote("favorite", id, !has);
        setStore((current) => ({
          ...current,
          list: current.list.includes(id) ? current.list.filter((item) => item !== id) : [...current.list, id],
        }));
      },
      toggleLater: (id) => {
        const has = store.later.includes(id);
        persistRemote("watch-later", id, !has);
        setStore((current) => ({
          ...current,
          later: current.later.includes(id) ? current.later.filter((item) => item !== id) : [...current.later, id],
        }));
      },
      setProgress: (id, value) => {
        const next = Math.max(0, Math.min(100, Math.round(value)));
        setStore((current) => {
          if (current.progress[id] === next) return current;
          return { ...current, progress: { ...current.progress, [id]: next } };
        });
      },
    };
  }, [store, source]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useLibrary() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useLibrary must be used inside LibraryProvider");
  return value;
}

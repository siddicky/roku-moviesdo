import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const seedPath = path.join(root, "lib", "seed.ts");
const outDir = path.join(root, "public", "art");

const PALETTES = {
  dusk: { sky0: "#140818", sky1: "#6a2c3a", sky2: "#e7a15a", glow: "#ffd7a1", ink: "#12060e", mist: "#c9847a" },
  gold: { sky0: "#1a1208", sky1: "#8a5a22", sky2: "#f0c27a", glow: "#ffe1a8", ink: "#140e06", mist: "#e6b15a" },
  violet: { sky0: "#0e0a1c", sky1: "#3a2370", sky2: "#c084fc", glow: "#e9d5ff", ink: "#100818", mist: "#a78bfa" },
  noir: { sky0: "#07080c", sky1: "#1c2430", sky2: "#8d9aab", glow: "#d5dde6", ink: "#05060a", mist: "#6b7785" },
  arctic: { sky0: "#071018", sky1: "#123044", sky2: "#7fcdc6", glow: "#d7fff8", ink: "#041016", mist: "#8fd0ea" },
  rose: { sky0: "#1a0a12", sky1: "#6e2440", sky2: "#f0a3b5", glow: "#ffd0dc", ink: "#14060c", mist: "#e78aa0" },
  ember: { sky0: "#140804", sky1: "#7a2e0e", sky2: "#ff8a3d", glow: "#ffd0a1", ink: "#120600", mist: "#ffb07a" },
  steel: { sky0: "#0c1016", sky1: "#243044", sky2: "#9aa8b8", glow: "#e6eef6", ink: "#080c12", mist: "#7f8ea0" },
  moss: { sky0: "#07140e", sky1: "#1c3d2e", sky2: "#8fbf7a", glow: "#e4f5c8", ink: "#06110c", mist: "#6ea37a" },
};

function hash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseSeed(text) {
  const entries = [];
  let cur = null;
  for (const line of text.split("\n")) {
    const id = line.match(/^\s+id:\s*"([^"]+)"/);
    if (id) {
      if (cur?.id && cur.title && cur.scene && cur.palette) entries.push(cur);
      cur = { id: id[1] };
      continue;
    }
    if (!cur) continue;
    const field = line.match(/^\s+(title|scene|palette):\s*"([^"]+)"/);
    if (field && cur[field[1]] == null) cur[field[1]] = field[2];
    const genres = line.match(/^\s+genres:\s*\[([^\]]+)\]/);
    if (genres && !cur.genres) {
      cur.genres = [...genres[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    }
  }
  if (cur?.id && cur.title && cur.scene && cur.palette) entries.push(cur);
  return entries;
}

function sky() {
  return `<rect width="100%" height="100%" fill="url(#sky)"/>`;
}

function moon(w, h, rnd, pal, scale = 1) {
  const cx = w * (0.58 + rnd() * 0.26);
  const cy = h * (0.14 + rnd() * 0.1);
  const r = Math.min(w, h) * 0.075 * scale;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r * 2.4}" fill="${pal.glow}" opacity="0.16"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${pal.glow}"/>
    <circle cx="${cx - r * 0.25}" cy="${cy - r * 0.2}" r="${r * 0.18}" fill="#fff" opacity="0.35"/>`;
}

function mist(w, h, pal, y) {
  return `<rect x="0" y="${y}" width="${w}" height="${h * 0.22}" fill="${pal.mist}" opacity="0.18"/>`;
}

function stars(w, h, rnd, pal, n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.55;
    const r = rnd() * 1.6 + 0.4;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${pal.glow}" opacity="${(0.35 + rnd() * 0.6).toFixed(2)}"/>`;
  }
  return s;
}

const scenes = {
  harbor(w, h, rnd, pal) {
    const hz = h * 0.62;
    const masts = Array.from({ length: 9 }, (_, i) => {
      const x = w * (0.08 + i * 0.09 + rnd() * 0.02);
      const ht = h * (0.08 + rnd() * 0.12);
      return `<rect x="${x}" y="${hz - ht}" width="2" height="${ht}" fill="${pal.ink}" opacity="0.8"/>
        <rect x="${x - 10}" y="${hz - ht * 0.72}" width="22" height="1.5" fill="${pal.glow}" opacity="0.7"/>`;
    }).join("");
    const lights = Array.from({ length: 14 }, () => {
      const x = rnd() * w;
      const y = hz + 8 + rnd() * (h - hz) * 0.45;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${1 + rnd()}" fill="${pal.glow}" opacity="0.8"/>`;
    }).join("");
    return `${sky()}${stars(w, h, rnd, pal, 30)}${moon(w, h, rnd, pal, 1.1)}
      <path d="M0 ${hz - 20} C ${w * 0.3} ${hz - 50}, ${w * 0.7} ${hz + 10}, ${w} ${hz - 30} L ${w} ${h} L 0 ${h} Z" fill="${pal.ink}" opacity="0.55"/>
      <rect y="${hz}" width="${w}" height="${h - hz}" fill="${pal.ink}" opacity="0.78"/>
      ${masts}${lights}${mist(w, h, pal, hz - h * 0.08)}`;
  },
  lanterns(w, h, rnd, pal) {
    const ground = h * 0.78;
    const lamps = Array.from({ length: 7 }, (_, i) => {
      const x = w * (0.12 + i * 0.12);
      const y = h * (0.22 + (i % 2) * 0.08);
      const r = Math.min(w, h) * 0.035;
      return `<line x1="${x}" y1="0" x2="${x}" y2="${y}" stroke="${pal.ink}" stroke-width="2" opacity="0.7"/>
        <circle cx="${x}" cy="${y + r}" r="${r * 2.2}" fill="${pal.glow}" opacity="0.18"/>
        <rect x="${x - r}" y="${y}" width="${r * 2}" height="${r * 2.2}" rx="${r * 0.4}" fill="${pal.glow}"/>
        <rect x="${x - 2}" y="${y + r * 2.2}" width="4" height="${ground - y}" fill="${pal.ink}" opacity="0.45"/>`;
    }).join("");
    return `${sky()}${lamps}
      <path d="M0 ${ground} Q ${w * 0.5} ${ground - 30} ${w} ${ground} L ${w} ${h} L 0 ${h} Z" fill="${pal.ink}"/>
      ${mist(w, h, pal, ground - 40)}`;
  },
  orchard(w, h, rnd, pal) {
    const hz = h * 0.72;
    const rows = Array.from({ length: 6 }, (_, i) => {
      const y = h * (0.42 + i * 0.07);
      const scale = 0.55 + i * 0.12;
      let trees = "";
      const count = 5 + i;
      for (let t = 0; t < count; t++) {
        const x = (w / (count + 1)) * (t + 1) + Math.sin(i + t) * 8;
        const r = 18 * scale;
        trees += `<circle cx="${x}" cy="${y}" r="${r}" fill="${pal.ink}" opacity="${0.35 + i * 0.08}"/>
          <rect x="${x - 2}" y="${y}" width="3" height="${r * 0.9}" fill="${pal.ink}"/>`;
      }
      return trees;
    }).join("");
    return `${sky()}${moon(w, h, rnd, pal, 0.8)}${rows}
      <rect y="${hz}" width="${w}" height="${h - hz}" fill="${pal.ink}" opacity="0.35"/>`;
  },
  rain(w, h, rnd, pal) {
    const streaks = Array.from({ length: 80 }, () => {
      const x = rnd() * w;
      const y = rnd() * h;
      const len = 18 + rnd() * 36;
      return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 8).toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke="${pal.glow}" stroke-width="1" opacity="0.28"/>`;
    }).join("");
    const street = h * 0.72;
    return `${sky()}
      <rect x="${w * 0.62}" y="${h * 0.28}" width="${w * 0.18}" height="${h * 0.44}" fill="${pal.ink}"/>
      <rect x="${w * 0.68}" y="${h * 0.36}" width="${w * 0.07}" height="${h * 0.08}" fill="${pal.glow}" opacity="0.85"/>
      ${streaks}
      <rect y="${street}" width="${w}" height="${h - street}" fill="${pal.ink}"/>
      <rect y="${street}" width="${w}" height="8" fill="${pal.glow}" opacity="0.25"/>`;
  },
  ocean(w, h, rnd, pal) {
    const waves = [0.58, 0.68, 0.78, 0.88].map((p, i) => {
      const y = h * p;
      return `<path d="M0 ${y} Q ${w * 0.25} ${y - 24 - i * 6}, ${w * 0.5} ${y} T ${w} ${y}" fill="none" stroke="${i % 2 ? pal.glow : pal.mist}" stroke-width="${2 + i}" opacity="${0.35 + i * 0.1}"/>`;
    }).join("");
    return `${sky()}${stars(w, h, rnd, pal, 20)}${moon(w, h, rnd, pal, 1.3)}
      <rect y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="${pal.ink}" opacity="0.45"/>
      ${waves}`;
  },
  greenhouse(w, h, rnd, pal) {
    const panes = [];
    const cols = 8;
    const rows = 6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (w / cols) * c + 8;
        const y = (h / rows) * r + 8;
        const pw = w / cols - 14;
        const ph = h / rows - 14;
        panes.push(`<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${pal.glow}" opacity="${0.04 + rnd() * 0.08}" stroke="${pal.glow}" stroke-opacity="0.35"/>`);
      }
    }
    const plants = Array.from({ length: 6 }, (_, i) => {
      const x = w * (0.15 + i * 0.14);
      const y = h * 0.72;
      return `<ellipse cx="${x}" cy="${y}" rx="36" ry="70" fill="${pal.ink}" opacity="0.45"/>`;
    }).join("");
    return `${sky()}${panes.join("")}${plants}
      <rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${pal.ink}" opacity="0.55"/>`;
  },
  canyon(w, h, rnd, pal) {
    const ridges = [0.35, 0.48, 0.62, 0.78].map((p, i) => {
      const y = h * p;
      const lift = 40 + i * 20;
      return `<path d="M0 ${y} L ${w * 0.18} ${y - lift} L ${w * 0.4} ${y - lift * 0.3} L ${w * 0.62} ${y - lift * 0.9} L ${w * 0.82} ${y - lift * 0.4} L ${w} ${y - 10} L ${w} ${h} L 0 ${h} Z" fill="${pal.ink}" opacity="${0.28 + i * 0.16}"/>`;
    }).join("");
    return `${sky()}${moon(w, h, rnd, pal, 1.4)}
      <circle cx="${w * 0.5}" cy="${h * 0.95}" r="${w * 0.45}" fill="${pal.glow}" opacity="0.18"/>
      ${ridges}`;
  },
  train(w, h, rnd, pal) {
    const cars = Array.from({ length: 5 }, (_, i) => {
      const x = w * (0.08 + i * 0.18);
      const y = h * 0.58;
      const windows = Array.from({ length: 4 }, (__, k) => {
        return `<rect x="${x + 14 + k * 28}" y="${y + 16}" width="16" height="12" fill="${pal.glow}" opacity="${0.45 + rnd() * 0.5}"/>`;
      }).join("");
      return `<rect x="${x}" y="${y}" width="${w * 0.15}" height="${h * 0.16}" rx="6" fill="${pal.ink}"/>${windows}`;
    }).join("");
    return `${sky()}${stars(w, h, rnd, pal, 18)}${moon(w, h, rnd, pal, 0.7)}
      ${cars}
      <rect y="${h * 0.76}" width="${w}" height="6" fill="${pal.glow}" opacity="0.5"/>
      <rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${pal.ink}"/>`;
  },
  snow(w, h, rnd, pal) {
    const flakes = Array.from({ length: 60 }, () => {
      const x = rnd() * w;
      const y = rnd() * h;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + rnd() * 1.8).toFixed(2)}" fill="#fff" opacity="${(0.3 + rnd() * 0.5).toFixed(2)}"/>`;
    }).join("");
    const pines = Array.from({ length: 8 }, (_, i) => {
      const x = w * (0.08 + i * 0.12);
      const top = h * (0.42 + (i % 3) * 0.05);
      return `<polygon points="${x},${top} ${x - 34},${h * 0.8} ${x + 34},${h * 0.8}" fill="${pal.ink}" opacity="0.8"/>`;
    }).join("");
    return `${sky()}${moon(w, h, rnd, pal, 0.9)}${pines}${flakes}
      <rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${pal.glow}" opacity="0.18"/>`;
  },
  forest(w, h, rnd, pal) {
    const trunks = Array.from({ length: 14 }, (_, i) => {
      const x = (w / 14) * i + rnd() * 10;
      const width = 10 + rnd() * 22;
      const top = h * (0.18 + rnd() * 0.35);
      return `<rect x="${x}" y="${top}" width="${width}" height="${h - top}" fill="${pal.ink}" opacity="${0.45 + rnd() * 0.5}"/>`;
    }).join("");
    return `${sky()}
      <circle cx="${w * 0.7}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.16}" fill="${pal.glow}" opacity="0.35"/>
      ${trunks}${mist(w, h, pal, h * 0.62)}`;
  },
  desert(w, h, rnd, pal) {
    const dunes = [0.62, 0.74, 0.86].map((p, i) => {
      const y = h * p;
      return `<path d="M0 ${y + 40} C ${w * 0.25} ${y - 30}, ${w * 0.45} ${y + 20}, ${w * 0.7} ${y - 10} S ${w} ${y + 30}, ${w} ${y + 40} L ${w} ${h} L 0 ${h} Z" fill="${pal.ink}" opacity="${0.35 + i * 0.2}"/>`;
    }).join("");
    return `${sky()}
      <circle cx="${w * 0.72}" cy="${h * 0.58}" r="${Math.min(w, h) * 0.14}" fill="${pal.glow}"/>
      <circle cx="${w * 0.72}" cy="${h * 0.58}" r="${Math.min(w, h) * 0.22}" fill="${pal.glow}" opacity="0.18"/>
      ${dunes}`;
  },
  mountains(w, h, rnd, pal) {
    const peaks = [0.55, 0.42, 0.6, 0.48].map((ph, i) => {
      const x = w * (0.1 + i * 0.22);
      const y = h * ph;
      const half = w * 0.2;
      return `<polygon points="${x},${y} ${x - half},${h} ${x + half},${h}" fill="${pal.ink}" opacity="${0.35 + i * 0.12}"/>`;
    }).join("");
    return `${sky()}${stars(w, h, rnd, pal, 40)}${moon(w, h, rnd, pal, 0.8)}${peaks}
      <rect y="${h * 0.86}" width="${w}" height="${h * 0.14}" fill="${pal.glow}" opacity="0.12"/>`;
  },
  orbit(w, h, rnd, pal) {
    const cx = w * 0.48;
    const cy = h * 0.56;
    const r = Math.min(w, h) * 0.28;
    return `${sky()}${stars(w, h, rnd, pal, 70)}
      <ellipse cx="${cx}" cy="${cy}" rx="${r * 1.7}" ry="${r * 0.28}" fill="none" stroke="${pal.glow}" stroke-width="8" opacity="0.55" transform="rotate(-18 ${cx} ${cy})"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${pal.ink}"/>
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="${pal.sky1}" opacity="0.9"/>
      <circle cx="${cx - r * 0.2}" cy="${cy - r * 0.15}" r="${r * 0.22}" fill="${pal.glow}" opacity="0.18"/>
      <circle cx="${w * 0.82}" cy="${h * 0.22}" r="${Math.min(w, h) * 0.04}" fill="${pal.glow}"/>`;
  },
  archive(w, h, rnd, pal) {
    const shelves = Array.from({ length: 7 }, (_, i) => {
      const y = h * (0.12 + i * 0.11);
      const books = Array.from({ length: 28 }, (__, b) => {
        const x = 40 + b * ((w - 80) / 28);
        const bh = 18 + rnd() * 34;
        const hue = rnd() > 0.82 ? pal.glow : pal.ink;
        return `<rect x="${x}" y="${y + 48 - bh}" width="10" height="${bh}" fill="${hue}" opacity="${hue === pal.glow ? 0.9 : 0.7}"/>`;
      }).join("");
      return `<rect x="24" y="${y + 48}" width="${w - 48}" height="6" fill="${pal.mist}" opacity="0.5"/>${books}`;
    }).join("");
    return `${sky()}
      <polygon points="${w * 0.5},0 ${w * 0.32},${h} ${w * 0.68},${h}" fill="${pal.glow}" opacity="0.1"/>
      ${shelves}`;
  },
  city(w, h, rnd, pal) {
    const buildings = Array.from({ length: 16 }, (_, i) => {
      const bw = w / 16;
      const x = i * bw;
      const bh = h * (0.28 + rnd() * 0.48);
      const y = h * 0.86 - bh;
      let windows = "";
      for (let wy = y + 10; wy < h * 0.86 - 8; wy += 16) {
        for (let wx = x + 8; wx < x + bw - 8; wx += 14) {
          if (rnd() > 0.45) {
            windows += `<rect x="${wx}" y="${wy}" width="6" height="8" fill="${pal.glow}" opacity="${0.35 + rnd() * 0.6}"/>`;
          }
        }
      }
      return `<rect x="${x + 3}" y="${y}" width="${bw - 6}" height="${bh}" fill="${pal.ink}" opacity="0.86"/>${windows}`;
    }).join("");
    return `${sky()}${moon(w, h, rnd, pal, 0.6)}${buildings}`;
  },
  radio(w, h, rnd, pal) {
    const cx = w * 0.5;
    const base = h * 0.78;
    const arcs = [1, 2, 3, 4].map((i) => {
      const r = i * Math.min(w, h) * 0.08;
      return `<path d="M ${cx - r} ${base - 40} A ${r} ${r} 0 0 1 ${cx + r} ${base - 40}" fill="none" stroke="${pal.glow}" stroke-width="3" opacity="${0.3 + i * 0.1}"/>`;
    }).join("");
    return `${sky()}${stars(w, h, rnd, pal, 24)}${moon(w, h, rnd, pal, 0.5)}
      <rect x="${cx - 4}" y="${h * 0.28}" width="8" height="${base - h * 0.28}" fill="${pal.ink}"/>
      <circle cx="${cx}" cy="${h * 0.28}" r="10" fill="${pal.glow}"/>
      ${arcs}
      <rect y="${base}" width="${w}" height="${h - base}" fill="${pal.ink}"/>
      <path d="M0 ${base - 20} Q ${w * 0.5} ${base + 10} ${w} ${base - 30}" fill="none" stroke="${pal.mist}" stroke-width="2" opacity="0.5"/>`;
  },
  neon(w, h, rnd, pal) {
    const orbs = Array.from({ length: 6 }, () => {
      const x = rnd() * w;
      const y = h * (0.2 + rnd() * 0.45);
      const r = 30 + rnd() * 80;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${rnd() > 0.5 ? pal.glow : pal.mist}" opacity="0.22"/>`;
    }).join("");
    const grid = Array.from({ length: 8 }, (_, i) => {
      const y = h * (0.55 + i * 0.05);
      const spread = (i + 1) * 18;
      return `<path d="M ${w * 0.5} ${h * 0.52} L ${spread} ${h} M ${w * 0.5} ${h * 0.52} L ${w - spread} ${h}" stroke="${pal.glow}" stroke-width="1" opacity="0.25"/>
        <line x1="0" y1="${y}" x2="${w}" y2="${y + 20}" stroke="${pal.glow}" stroke-width="1" opacity="0.2"/>`;
    }).join("");
    return `${sky()}${orbs}${grid}
      <rect x="${w * 0.2}" y="${h * 0.3}" width="${w * 0.18}" height="${h * 0.08}" rx="8" fill="${pal.glow}" opacity="0.85"/>`;
  },
};

function wrapTitle(title) {
  const words = title.split(" ");
  const lines = [];
  let cur = "";
  const max = title.length > 22 ? 14 : 16;
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function posterType(entry) {
  const genres = (entry.genres || []).slice(0, 2).join("  ·  ").toUpperCase();
  const lines = wrapTitle(entry.title);
  const size = lines.length > 2 ? 42 : lines.some((l) => l.length > 14) ? 48 : 58;
  const blockH = 150;
  const y0 = 1200 - blockH;
  const text = lines
    .map((line, i) => {
      const y = y0 + 78 + i * (size + 6);
      return `<text x="48" y="${y}" fill="#f7f4ee" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="700" letter-spacing="-1">${escapeXml(line)}</text>`;
    })
    .join("");
  return `
    <rect x="0" y="${y0 - 10}" width="800" height="${1200 - y0 + 10}" fill="url(#scrim)"/>
    <text x="48" y="${y0 + 36}" fill="#f7f4ee" opacity="0.78" font-family="Helvetica, Arial, sans-serif" font-size="16" letter-spacing="3">${escapeXml(genres || "FEATURE")}</text>
    ${text}`;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render(entry, mode) {
  const pal = PALETTES[entry.palette] || PALETTES.dusk;
  const draw = scenes[entry.scene] || scenes.desert;
  const rnd = mulberry32(hash(`${entry.id}:${mode}`));
  const w = mode === "poster" ? 800 : 1600;
  const h = mode === "poster" ? 1200 : 900;
  const body = draw(w, h, rnd, pal);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <title>${escapeXml(entry.title)}</title>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${pal.sky0}"/>
      <stop offset="55%" stop-color="${pal.sky1}"/>
      <stop offset="100%" stop-color="${pal.sky2}"/>
    </linearGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0.28"/>
      <stop offset="42%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.72"/>
    </linearGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#070708" stop-opacity="0"/>
      <stop offset="100%" stop-color="#070708" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  ${body}
  <rect width="100%" height="100%" fill="url(#vignette)"/>
  ${mode === "poster" ? posterType(entry) : ""}
</svg>`;
}

const text = fs.readFileSync(seedPath, "utf8");
const entries = parseSeed(text);
if (entries.length < 10) {
  console.error(`expected titles in seed, parsed ${entries.length}`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
for (const entry of entries) {
  fs.writeFileSync(path.join(outDir, `${entry.id}-backdrop.svg`), render(entry, "backdrop"));
  fs.writeFileSync(path.join(outDir, `${entry.id}-poster.svg`), render(entry, "poster"));
}
console.log(`wrote ${entries.length * 2} artworks to ${outDir}`);

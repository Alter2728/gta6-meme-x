// make-meme.mjs — draws the GTA 6 meme for make.fun's gta6-meme-x-01 bounty.
// Pure Node.js stdlib (node:zlib, node:fs). No network, no clock, no random
// numbers: the same input always produces the same PNG bytes.
//
// Scene: a Vice City sunset over Leonida. Top caption jokes about the
// thirteen-year wait since GTA V; the bottom caption is the launch-day
// "sick day". make.fun's ghost (drawn here from shapes, never pasted from
// an image file) stands on the beach holding its magenta star coin, and
// "make.fun" runs big across the bottom band so it reads at 480x480.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- PNG out

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(rgba, width, height) {
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- canvas

const px = Buffer.alloc(W * H * 4); // RGBA, row-major

function setPixel(x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = 255;
}

function rgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function fillRect(x, y, w, h, color) {
  const [r, g, b] = color;
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPixel(xx, yy, r, g, b);
  }
}

function fillCircle(cx, cy, rad, color) {
  const [r, g, b] = color;
  const x0 = Math.max(0, Math.floor(cx - rad));
  const x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad));
  const y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rad * rad) setPixel(x, y, r, g, b);
    }
  }
}

// Even-odd scanline fill of a polygon given as [x, y] points.
function fillPolygon(points, color) {
  const [r, g, b] = color;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, Math.ceil(minY)); y <= Math.min(H - 1, Math.floor(maxY)); y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i]));
      const x1 = Math.min(W - 1, Math.floor(xs[i + 1]));
      for (let x = x0; x <= x1; x++) setPixel(x, y, r, g, b);
    }
  }
}

// Four-pointed sparkle (the shape of the ghost's eyes and the coin's star).
function star4Points(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2;
    const rad = i % 2 === 0 ? outer : inner;
    pts.push([cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)]);
  }
  return pts;
}

function fillStar4(cx, cy, outer, inner, color) {
  fillPolygon(star4Points(cx, cy, outer, inner), color);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(c1, c2, t) {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// ---------------------------------------------------------------- 5x7 font
// Glyphs are 7 rows of 5 cells ("#" = on). Only the characters the meme
// needs are defined; anything else renders as a blank.

const FONT = {
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "'": ["..#..", "..#..", "..#..", ".....", ".....", ".....", "....."],
  ",": [".....", ".....", ".....", ".....", "..#..", "..#..", ".#..."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  // Lowercase letters for "make.fun" (the name is written lowercase).
  a: [".....", ".....", ".####", "....#", ".####", "#...#", ".###."],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..##.", ".#...", ".#...", "####.", ".#...", ".#...", ".#..."],
  k: [".....", ".....", "#...#", "#..#.", "###..", "#.#..", "#..#."],
  m: [".....", ".....", "##.##", "#.#.#", "#.#.#", "#...#", "#...#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
};

function textWidth(str, scale) {
  return str.length * 6 * scale - scale;
}

// Draws one line of text centred on cx at top y, in fill colour with a
// thick outline colour drawn first at eight offsets.
function drawText(str, cx, y, scale, fill, outline) {
  const w = textWidth(str, scale);
  const x0 = Math.round(cx - w / 2);
  const ow = Math.max(2, Math.round(scale * 0.9));
  const offsets = [
    [-ow, 0], [ow, 0], [0, -ow], [0, ow],
    [-ow, -ow], [ow, -ow], [-ow, ow], [ow, ow],
  ];
  const drawPass = (color) => {
    for (let ci = 0; ci < str.length; ci++) {
      const glyph = FONT[str[ci]] || FONT[" "];
      const gx = x0 + ci * 6 * scale;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row][col] !== "#") continue;
          fillRect(gx + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
  };
  // Outline: shift the whole pass by each offset, in outline colour.
  for (const [dx, dy] of offsets) {
    // Temporarily shift by drawing with a translated origin: easiest is to
    // re-run the pass with an x/y shift via a wrapper.
    drawTextShifted(str, x0 + dx, y + dy, scale, outline);
  }
  drawPass(fill);
}

function drawTextShifted(str, x0, y, scale, color) {
  for (let ci = 0; ci < str.length; ci++) {
    const glyph = FONT[str[ci]] || FONT[" "];
    const gx = x0 + ci * 6 * scale;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== "#") continue;
        fillRect(gx + col * scale, y + row * scale, scale, scale, color);
      }
    }
  }
}

// ---------------------------------------------------------------- scene

const WHITE = rgb("#ffffff");
const BLACK = rgb("#12061f");
const MAGENTA = rgb("#ff2e9e");
const SUN_YELLOW = rgb("#fff3b0");
const CAPTION_YELLOW = rgb("#ffe45e");

// Vice City sunset sky: deep purple up top, magenta mid, orange at the sea.
const SKY_STOPS = [
  [0, rgb("#1a0933")],
  [240, rgb("#5e1660")],
  [420, rgb("#d62478")],
  [640, rgb("#ff8c42")],
];

function skyColor(y) {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [y1, c1] = SKY_STOPS[i];
    const [y2, c2] = SKY_STOPS[i + 1];
    if (y >= y1 && y <= y2) return mixColor(c1, c2, (y - y1) / (y2 - y1));
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

function drawSky() {
  for (let y = 0; y < 640; y++) fillRect(0, y, W, 1, skyColor(y));
}

function drawSun() {
  const cx = 290;
  const cy = 470;
  const r = 130;
  fillCircle(cx, cy, r, SUN_YELLOW);
  // Retro slats across the sun's lower half, in the sky's own colours.
  for (let dy = 18; dy < r; dy += 24) {
    const y = cy + dy;
    const barH = 6 + (dy / r) * 12;
    const hc = Math.sqrt(r * r - dy * dy);
    fillRect(cx - hc, y, hc * 2, barH, skyColor(y));
  }
}

function drawStars() {
  const spots = [
    [70, 250, 7], [950, 270, 8], [60, 430, 6], [950, 450, 7],
    [720, 290, 6], [330, 270, 6], [880, 90, 7], [120, 120, 6],
  ];
  for (const [x, y, s] of spots) fillStar4(x, y, s, 2, WHITE);
}

function drawSea() {
  for (let y = 640; y < 800; y++) {
    const t = (y - 640) / 160;
    fillRect(0, y, W, 1, mixColor(rgb("#2e1854"), rgb("#180c30"), t));
  }
  // Sunlight glittering on the water under the sun.
  const widths = [70, 110, 60, 130, 80, 120, 70, 100];
  for (let i = 0; i < widths.length; i++) {
    const y = 652 + i * 18;
    const w = widths[i];
    fillRect(290 - w / 2, y, w, 5, rgb("#ff9a5c"));
  }
  // A few calm streaks further out.
  fillRect(620, 690, 180, 4, rgb("#7a4a9e"));
  fillRect(700, 740, 220, 4, rgb("#7a4a9e"));
  fillRect(60, 720, 150, 4, rgb("#7a4a9e"));
}

function drawSand() {
  fillRect(0, 800, W, 224, rgb("#2a1238"));
  fillRect(0, 800, W, 14, rgb("#5a2a52")); // wet band at the waterline
}

// A palm silhouette: curved trunk plus drooping fronds, drawn as tapering
// chains of circles so the outline stays smooth.
function drawPalm(bx, by, tx, ty, lean, size) {
  const midX = (bx + tx) / 2 + lean;
  const midY = (by + ty) / 2;
  for (let t = 0; t <= 1.001; t += 0.04) {
    const x = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * midX + t * t * tx;
    const y = (1 - t) * (1 - t) * by + 2 * (1 - t) * t * midY + t * t * ty;
    fillCircle(x, y, lerp(13, 7, t) * size, BLACK);
  }
  const fronds = [
    [-170, 118], [-140, 132], [-108, 138], [-76, 132], [-44, 122], [-14, 108], [14, 92],
  ];
  for (const [deg, len] of fronds) {
    const a = (deg * Math.PI) / 180;
    const tipX = tx + Math.cos(a) * len * size;
    const tipY = ty + Math.sin(a) * len * size - 26 * size; // droop
    const ctrlX = tx + Math.cos(a) * len * 0.5 * size;
    const ctrlY = ty + Math.sin(a) * len * 0.5 * size - 34 * size;
    for (let t = 0; t <= 1.001; t += 0.05) {
      const x = (1 - t) * (1 - t) * tx + 2 * (1 - t) * t * ctrlX + t * t * tipX;
      const y = (1 - t) * (1 - t) * ty + 2 * (1 - t) * t * ctrlY + t * t * tipY;
      fillCircle(x, y, lerp(9, 2, t) * size, BLACK);
    }
  }
}

// make.fun's ghost, drawn from shapes: dome head, straight sides, a wavy
// hem, two black four-pointed sparkle eyes, a small round hand holding a
// magenta coin with a white star.
function ghostPoints(cx, top, w, h, expand) {
  const w2 = w + 2 * expand;
  const h2 = h + 2 * expand;
  const top2 = top - expand;
  const r = w2 / 2;
  const domeCy = top2 + r;
  const bottom = top2 + h2;
  const pts = [];
  for (let deg = 180; deg <= 360; deg += 4) {
    const a = (deg * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), domeCy + r * Math.sin(a)]);
  }
  const rb = r / 3;
  const hemBase = bottom - rb;
  // Right side drops to the hem base, then three rounded feet point down.
  pts.push([cx + r, hemBase]);
  for (let i = 0; i < 3; i++) {
    const bx = cx + r - rb - i * 2 * rb;
    for (let deg = 0; deg <= 180; deg += 6) {
      const a = (deg * Math.PI) / 180;
      pts.push([bx + rb * Math.cos(a), hemBase + rb * Math.sin(a)]);
    }
  }
  return pts;
}

function drawGhost(cx, top, w, h) {
  // Thick black outline first, slightly enlarged, then the white body.
  fillPolygon(ghostPoints(cx, top, w, h, 11), BLACK);
  fillPolygon(ghostPoints(cx, top, w, h, 0), WHITE);
  // Sparkle eyes.
  const eyeY = top + 150;
  fillStar4(cx - 52, eyeY, 30, 9, BLACK);
  fillStar4(cx + 52, eyeY, 30, 9, BLACK);
  // Little round hand on the ghost's right, holding the coin.
  fillCircle(cx + 122, top + 262, 30, BLACK);
  fillCircle(cx + 122, top + 262, 24, WHITE);
  // Magenta coin with a white star, held up beside the hand.
  fillCircle(cx + 192, top + 250, 54, BLACK);
  fillCircle(cx + 192, top + 250, 47, MAGENTA);
  fillStar4(cx + 192, top + 250, 30, 9, WHITE);
}

// ---------------------------------------------------------------- compose

drawSky();
drawStars();
drawSun();
drawSea();
drawSand();
drawPalm(110, 812, 196, 492, 60, 1.0); // tall palm, left, leaning right
drawPalm(938, 812, 872, 566, -40, 0.8); // shorter palm, right

// The joke: thirteen years since GTA V, and launch day is a "sick day".
drawText("WAITED 13 YEARS", 512, 42, 10, WHITE, BLACK);
drawText("FOR GTA 6", 512, 126, 10, CAPTION_YELLOW, BLACK);

drawGhost(590, 360, 260, 370);

drawText("BOSS, I'M 'SICK'", 512, 812, 8, WHITE, BLACK);
drawText("ON LAUNCH DAY", 512, 884, 8, WHITE, BLACK);

// make.fun, big across the bottom so it reads even at 480x480.
fillRect(0, 950, W, 74, MAGENTA);
drawText("make.fun", 512, 962, 7, WHITE, rgb("#a3126b"));

const out = process.argv[2] || "meme.png";
writeFileSync(out, encodePng(px, W, H));

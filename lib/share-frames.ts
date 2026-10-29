import { Marcellus } from "next/font/google";
import { type LogoTone, logoBadge } from "./brochure";
import { mobileDigits } from "./catalog";

/**
 * Framed pictures of one photo for WhatsApp, Instagram and Status, drawn on a canvas in the browser so they cost
 * nothing on the server. The photo is always drawn whole at its own 4:5 shape: frames go around it, never over it.
 * Browser only: these use document and canvas.
 */

const marcellus = Marcellus({ weight: "400", subsets: ["latin"] });
/** The brochure and frame display face. */
export const display = marcellus.style.fontFamily;

export interface FrameText {
  /** Design name, e.g. "Rani Haar". */
  title: string;
  /** e.g. "22K · approx. 42.6 g". */
  detail: string;
  code: string;
  shopName: string;
  phone: string;
  /** Drawn in place of the shop name where there's room for only one of them. */
  logo?: { img: HTMLImageElement; tone: LogoTone } | null;
}

export interface Palette {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  line: string;
}

type Draw = (c: Canvas, img: HTMLImageElement, t: FrameText, p: Palette) => void;

interface Frame {
  id: string;
  label: string;
  /** Where it fits best, shown under the label. */
  use: string;
  w: number;
  h: number;
  palette: Palette;
  draw: Draw;
}

/** Drawing helpers bound to one canvas. */
class Canvas {
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly sans: string,
  ) {}

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  outline(x: number, y: number, w: number, h: number, color: string, width: number, dash: number[] = []) {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /** The photo scaled to fill the box; our photos are 4:5, so a 4:5 box shows all of it. */
  photo(img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale, sh = h / scale;
    this.ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }

  /** Writes one line, shortened with "…" to fit `max` px. Returns the width drawn. */
  text(s: string, x: number, y: number, o: { size: number; color: string; serif?: boolean; weight?: number; align?: CanvasTextAlign; max?: number; spacing?: number }) {
    if (!s) return 0;
    const { ctx } = this;
    ctx.save();
    ctx.font = `${o.weight ?? 400} ${o.size}px ${o.serif ? display : this.sans}`;
    ctx.fillStyle = o.color;
    ctx.textAlign = o.align ?? "left";
    ctx.textBaseline = "alphabetic";
    if (o.spacing) ctx.letterSpacing = `${o.spacing}px`;
    let line = s;
    if (o.max) {
      while (line.length > 1 && ctx.measureText(line).width > o.max) line = line.slice(0, -1);
      if (line !== s) line = `${line.trimEnd()}…`;
    }
    ctx.fillText(line, x, y);
    const width = ctx.measureText(line).width;
    ctx.restore();
    return width;
  }

  /**
   * The logo fitted into `h` px tall and at most `maxW` wide, on a rounded badge when it would vanish into `bg`.
   * `x` is its left edge, centre or right edge, as `align` says.
   */
  logo(logo: NonNullable<FrameText["logo"]>, x: number, y: number, h: number, maxW: number, bg: string, align: "left" | "center" | "right" = "left") {
    const { ctx } = this;
    const badge = logoBadge(logo.tone, bg);
    const pad = badge ? Math.round(h * 0.14) : 0;
    let ih = h - pad * 2;
    let iw = (ih * logo.img.naturalWidth) / logo.img.naturalHeight;
    if (iw > maxW - pad * 2) {
      iw = maxW - pad * 2;
      ih = (iw * logo.img.naturalHeight) / logo.img.naturalWidth;
    }
    const w = iw + pad * 2, bh = ih + pad * 2;
    const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    const top = y + (h - bh) / 2;
    if (badge) {
      ctx.fillStyle = badge;
      ctx.beginPath();
      ctx.roundRect(left, top, w, bh, Math.round(h * 0.12));
      ctx.fill();
    }
    ctx.drawImage(logo.img, left + pad, top + pad, iw, ih);
  }

  diamond(cx: number, cy: number, r: number, color: string) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  }
}

const shopTitle = (t: FrameText) => t.shopName || "Your shop name";
const contact = (t: FrameText) => (t.phone ? `${mobileDigits(t.phone) ? "WhatsApp" : "Call"} ${t.phone}` : "");

const BLACK_GOLD: Palette = { bg: "#15130F", ink: "#F3EEE4", accent: "#D9C08A", muted: "#BDB3A1", line: "#3A342B" };
const EMERALD: Palette = { bg: "#0F2A24", ink: "#F1EDE2", accent: "#E2C27A", muted: "#B9C4BC", line: "#2C4A42" };
const IVORY: Palette = { bg: "#F6F2EA", ink: "#1C1A17", accent: "#7A5C1E", muted: "#5E574C", line: "#DCD6CB" };
const PAPER: Palette = { bg: "#FBFAF7", ink: "#1C1A17", accent: "#8A6A2A", muted: "#5E574C", line: "#DDD6C9" };
const KUMKUM: Palette = { bg: "#3A1A0E", ink: "#F6EBDD", accent: "#E8B04B", muted: "#D9C3A8", line: "#5C3220" };

export const FRAMES: Frame[] = [
  {
    id: "post",
    label: "Instagram post",
    use: "Feed and WhatsApp, 4:5",
    w: 1080,
    h: 1350,
    palette: BLACK_GOLD,
    draw: (c, img, t, p) => {
      c.photo(img, 72, 60, 936, 1170);
      c.outline(58, 46, 964, 1198, p.accent, 2);
      if (t.title) {
        c.text(t.title, 72, 1310, { size: 40, color: p.accent, serif: true, max: 520 });
        if (t.logo) c.logo(t.logo, 1008, 1260, 68, 400, p.bg, "right");
        else c.text(shopTitle(t), 1008, 1308, { size: 30, color: p.ink, serif: true, align: "right", max: 400 });
      } else if (t.logo) {
        c.logo(t.logo, 540, 1260, 68, 900, p.bg, "center");
      } else {
        c.text(shopTitle(t), 540, 1308, { size: 36, color: p.accent, serif: true, align: "center", max: 900 });
      }
    },
  },
  {
    id: "story",
    label: "Status / Story",
    use: "WhatsApp Status, Reels, 9:16",
    w: 1080,
    h: 1920,
    palette: EMERALD,
    draw: (c, img, t, p) => {
      if (t.logo) c.logo(t.logo, 540, 70, 130, 700, p.bg, "center");
      else c.text(shopTitle(t), 540, 170, { size: 56, color: p.ink, serif: true, align: "center", max: 960 });
      c.rect(500, 222, 80, 3, p.accent);
      c.photo(img, 60, 280, 960, 1200);
      c.text(t.title, 540, 1610, { size: 64, color: p.accent, serif: true, align: "center", max: 960 });
      c.text(t.detail, 540, 1672, { size: 34, color: p.ink, align: "center", max: 960 });
      c.text(contact(t), 540, 1830, { size: 32, color: p.muted, align: "center", max: 960 });
    },
  },
  {
    id: "square",
    label: "Square",
    use: "Profile grid, catalogues, 1:1",
    w: 1080,
    h: 1080,
    palette: IVORY,
    draw: (c, img, t, p) => {
      c.photo(img, 180, 56, 720, 900);
      if (t.title) {
        c.text(t.title, 180, 1026, { size: 32, color: p.ink, serif: true, max: 400 });
        if (t.logo) c.logo(t.logo, 900, 980, 64, 300, p.bg, "right");
        else c.text(shopTitle(t), 900, 1024, { size: 24, color: p.muted, weight: 600, align: "right", max: 300, spacing: 2 });
      } else if (t.logo) {
        c.logo(t.logo, 540, 980, 64, 720, p.bg, "center");
      } else {
        c.text(shopTitle(t), 540, 1026, { size: 34, color: p.ink, serif: true, align: "center", max: 720 });
      }
    },
  },
  {
    id: "postcard",
    label: "Postcard",
    use: "Greetings and invites, landscape",
    w: 1800,
    h: 1200,
    palette: PAPER,
    draw: (c, img, t, p) => {
      c.outline(24, 24, 1752, 1152, p.line, 2);
      c.photo(img, 80, 80, 832, 1040);
      c.rect(992, 140, 2, 920, p.line);
      // A stamp in the corner, with the shop's first letter.
      c.outline(1564, 80, 156, 186, p.accent, 3, [10, 8]);
      c.outline(1578, 94, 128, 158, p.accent, 1);
      if (t.logo) c.logo(t.logo, 1642, 104, 138, 116, p.bg, "center");
      else c.text(shopTitle(t).charAt(0).toUpperCase(), 1642, 202, { size: 84, color: p.accent, serif: true, align: "center" });
      c.text("GREETINGS FROM", 1060, 380, { size: 22, color: p.muted, weight: 600, spacing: 5 });
      c.text(shopTitle(t), 1060, 462, { size: 64, color: p.ink, serif: true, max: 660 });
      c.rect(1060, 500, 80, 3, p.accent);
      c.text(t.title, 1060, 640, { size: 50, color: p.ink, serif: true, max: 660 });
      c.text(t.detail, 1060, 694, { size: 30, color: p.muted, max: 660 });
      for (const y of [840, 920, 1000]) c.rect(1060, y, 660, 2, p.line);
      c.text(contact(t), 1060, 1070, { size: 28, color: p.muted, max: 660 });
    },
  },
  {
    id: "festive",
    label: "Festive border",
    use: "Diwali, weddings, offers, 4:5",
    w: 1080,
    h: 1350,
    palette: KUMKUM,
    draw: (c, img, t, p) => {
      c.outline(28, 28, 1024, 1294, p.accent, 4);
      c.outline(46, 46, 988, 1258, p.accent, 1.5);
      for (const [x, y] of [[46, 46], [1034, 46], [46, 1304], [1034, 1304]]) c.diamond(x, y, 16, p.accent);
      for (const [x, y] of [[540, 46], [540, 1304], [46, 675], [1034, 675]]) c.diamond(x, y, 8, p.accent);
      c.photo(img, 120, 100, 840, 1050);
      c.outline(110, 90, 860, 1070, p.accent, 1.5);
      c.text(t.title || shopTitle(t), 540, 1236, { size: 46, color: p.accent, serif: true, align: "center", max: 860 });
      if (t.title && t.logo) c.logo(t.logo, 540, 1254, 54, 500, p.bg, "center");
      else if (t.title) c.text(shopTitle(t).toUpperCase(), 540, 1284, { size: 24, color: p.ink, weight: 600, align: "center", max: 860, spacing: 4 });
    },
  },
  {
    id: "card",
    label: "Details card",
    use: "Sending prices and weights, tall",
    w: 1080,
    h: 1600,
    palette: BLACK_GOLD,
    draw: (c, img, t, p) => {
      c.rect(0, 0, 1080, 1350, p.line);
      c.photo(img, 0, 0, 1080, 1350);
      const code = c.text(t.code, 1024, 1432, { size: 30, color: p.muted, weight: 600, align: "right" });
      c.text(t.title, 56, 1434, { size: 52, color: p.accent, serif: true, max: 968 - (code ? code + 24 : 0) });
      c.text(t.detail, 56, 1484, { size: 30, color: p.ink, max: 968 });
      c.rect(56, 1518, 968, 2, p.line);
      if (t.logo) c.logo(t.logo, 56, 1532, 52, 560, p.bg);
      else c.text(shopTitle(t), 56, 1570, { size: 34, color: p.ink, serif: true, max: 560 });
      c.text(contact(t), 1024, 1568, { size: 26, color: p.muted, align: "right", max: 400 });
    },
  },
];

export type FrameId = (typeof FRAMES)[number]["id"];

async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/** Full-size photo, which the server only sends once it has been paid for. */
export const loadPhoto = (creationId: string) => loadImage(`/api/renders/${creationId}?full=1`);

/** The shop logo for frames, or null when there is none or it won't load (frames then show the shop name). */
export async function loadLogo(url: string | null, tone: LogoTone | ""): Promise<FrameText["logo"]> {
  if (!url || !tone) return null;
  return loadImage(url).then((img) => ({ img, tone }), () => null);
}

/** Draws a frame at full size. `palette` overrides the frame's own colours (the brochure passes its style). */
export async function renderFrame(id: string, img: HTMLImageElement, text: FrameText, palette?: Palette): Promise<HTMLCanvasElement> {
  const frame = FRAMES.find((f) => f.id === id) ?? FRAMES[0];
  const sans = getComputedStyle(document.body).fontFamily;
  await Promise.all([document.fonts.load(`40px ${display}`), document.fonts.load(`600 30px ${sans}`), document.fonts.load(`30px ${sans}`)]);
  const canvas = document.createElement("canvas");
  canvas.width = frame.w;
  canvas.height = frame.h;
  const p = palette ?? frame.palette;
  const c = new Canvas(canvas.getContext("2d")!, sans);
  c.rect(0, 0, frame.w, frame.h, p.bg);
  frame.draw(c, img, text, p);
  return canvas;
}

export async function toFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the picture."))), "image/jpeg", 0.92));
  const slug = name.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "jewellery";
  return new File([blob], `${slug}.jpg`, { type: "image/jpeg" });
}

/** Opens the phone's share sheet (WhatsApp, Instagram…) where it can take files; downloads them otherwise. */
export async function shareOrDownload(files: File[], title: string) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, title });
    } catch (err) {
      if ((err as Error).name !== "AbortError") throw err;
    }
    return;
  }
  files.forEach((file, i) =>
    setTimeout(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }, i * 400),
  );
}

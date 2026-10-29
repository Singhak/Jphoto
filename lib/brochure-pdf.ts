import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { type PDFFont, type PDFImage, type PDFPage, PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { type Brochure, type BrochureItem, PER_GRID_PAGE, specLine, TEMPLATES } from "./brochure";
import { mobileDigits } from "./catalog";
import { readPrintJpeg } from "./renders";
import { storage } from "./storage";

/**
 * Brochure PDFs, made on the server so they look the same from every phone and stay small enough for WhatsApp
 * (print JPEGs instead of the full PNGs: about 5–8 MB for 24 photos). Mirrors components/Brochure.tsx, which is the
 * on-screen preview: change both together.
 *
 * Load: about 1–2 s of CPU and under 150 MB for a 24-photo brochure, one at a time. Made PDFs are kept, keyed by
 * their content, so downloading the same brochure again is only a file read.
 */

export interface PdfShop {
  shopName: string;
  phone: string;
  address: string;
  city: string;
  gstin: string;
  hours: string;
}

/** Bump when the layout below changes, so kept PDFs are made again. */
const LAYOUT_VERSION = 1;

const A4 = { w: 595.28, h: 841.89 };
const mm = (v: number) => (v * 72) / 25.4;
/** px sizes from the HTML preview, in points. */
const px = (v: number) => v * 0.75;
const PAD_X = 15;
const PAD_Y = 14;
const CONTENT = 210 - PAD_X * 2;

const color = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);

interface Fonts {
  display: PDFFont;
  sans: PDFFont;
  bold: PDFFont;
}

let fontBytes: Promise<Buffer[]> | null = null;
const loadFontBytes = () =>
  (fontBytes ??= Promise.all(["Marcellus-Regular.ttf", "Inter-Regular.ttf", "Inter-SemiBold.ttf"].map((f) => readFile(path.join(process.cwd(), "lib", "fonts", f)))));

/** One page, drawn in millimetres from the top-left like the HTML. `y` is the text baseline. */
class Sheet {
  constructor(
    readonly page: PDFPage,
    readonly fonts: Fonts,
  ) {}

  rect(x: number, y: number, w: number, h: number, fill: string) {
    this.page.drawRectangle({ x: mm(x), y: A4.h - mm(y + h), width: mm(w), height: mm(h), color: color(fill) });
  }

  /** The photo whole inside the box, centred on the box colour. Ours are 4:5, so a 4:5 box is filled exactly. */
  image(img: PDFImage, x: number, y: number, w: number, h: number, bg: string) {
    this.rect(x, y, w, h, bg);
    const scale = Math.min(mm(w) / img.width, mm(h) / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    this.page.drawImage(img, { x: mm(x) + (mm(w) - dw) / 2, y: A4.h - mm(y + h) + (mm(h) - dh) / 2, width: dw, height: dh });
  }

  /** One line, shortened with "…" to fit `max` mm. Returns its width in mm. */
  text(s: string, x: number, y: number, o: { size: number; color: string; font?: keyof Fonts; align?: "left" | "right" | "center"; max?: number }) {
    if (!s) return 0;
    const font = this.fonts[o.font ?? "sans"];
    let line = s;
    if (o.max) {
      const max = mm(o.max);
      while (line.length > 1 && font.widthOfTextAtSize(line, o.size) > max) line = line.slice(0, -1);
      if (line !== s) line = `${line.trimEnd()}…`;
    }
    const w = font.widthOfTextAtSize(line, o.size);
    const left = o.align === "right" ? mm(x) - w : o.align === "center" ? mm(x) - w / 2 : mm(x);
    this.page.drawText(line, { x: left, y: A4.h - mm(y), size: o.size, font, color: color(o.color) });
    return (w * 25.4) / 72;
  }

  /** Splits text into lines that fit `max` mm, at most `lines` of them (the last one shortened). */
  wrap(s: string, size: number, max: number, lines: number, font: keyof Fonts = "sans") {
    const f = this.fonts[font];
    const out: string[] = [];
    for (const para of s.split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && f.widthOfTextAtSize(next, size) > mm(max)) {
          out.push(line);
          line = word;
        } else line = next;
      }
      out.push(line);
    }
    if (out.length > lines) {
      const kept = out.slice(0, lines);
      kept[lines - 1] = `${kept[lines - 1]} ${out.slice(lines).join(" ")}`;
      return kept;
    }
    return out;
  }
}

const TRUST = "Every photo shows the actual piece; only the setting around it is styled.";
const shopTitle = (shop: PdfShop) => shop.shopName || "Your shop name";
const waLink = (phone: string) => {
  const digits = mobileDigits(phone);
  return digits ? `https://wa.me/91${digits}` : null;
};

async function build(userId: string, b: Brochure, shop: PdfShop): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [display, sans, bold] = await loadFontBytes();
  const fonts: Fonts = {
    display: await doc.embedFont(display, { subset: true }),
    // Inter is embedded whole: pdf-lib's subsetting drops most of its letters.
    sans: await doc.embedFont(sans),
    bold: await doc.embedFont(bold),
  };
  doc.setTitle(b.title || b.collection);
  doc.setAuthor(shopTitle(shop));
  doc.setCreator(shopTitle(shop));

  // One photo at a time keeps memory flat; each JPEG is embedded once even if it shows on two pages.
  const images = new Map<string, PDFImage>();
  for (const item of b.items) images.set(item.creationId, await doc.embedJpg(await readPrintJpeg(userId, item.creationId)));

  const t = TEMPLATES[b.template];
  const title = b.title || b.collection;
  const sheet = (bg: string) => {
    const s = new Sheet(doc.addPage([A4.w, A4.h]), fonts);
    s.rect(0, 0, 210, 297, bg);
    return s;
  };
  const featured = b.items.filter((i) => i.featured);
  const rest = b.items.filter((i) => !i.featured);
  let number = 1;

  // Cover.
  {
    const p = t.cover;
    const s = sheet(p.bg);
    s.text(shopTitle(shop), PAD_X, PAD_Y + 6, { size: px(22), color: p.ink, font: "display", max: 120 });
    s.text(shop.city.toUpperCase(), 210 - PAD_X, PAD_Y + 5.5, { size: px(11), color: p.muted, align: "right", max: 55 });
    const hero = featured[0] ?? b.items[0];
    if (hero) s.image(images.get(hero.creationId)!, (210 - 128) / 2, 28, 128, 160, p.photo);
    let y = 196;
    s.rect(PAD_X, y, 14, 0.6, p.accent);
    const lines = s.wrap(title, px(54), CONTENT, 2, "display");
    y += 4;
    for (const line of lines) {
      y += 14;
      s.text(line, PAD_X, y, { size: px(54), color: p.accent, font: "display", max: CONTENT });
    }
    if (b.subtitle) s.text(b.subtitle, PAD_X, y + 9, { size: px(17), color: p.ink, max: CONTENT });
    s.rect(PAD_X, 297 - PAD_Y - 11, CONTENT, 0.25, p.line);
    const golds = [...new Set(b.items.map((i) => i.purity).filter((v) => v.endsWith("K")))];
    s.text((golds.length ? `${golds.join(" & ")} gold` : "Fine jewellery").toUpperCase(), PAD_X, 297 - PAD_Y - 3, { size: px(11), color: p.muted });
    const n = b.items.length;
    s.text(`${n} DESIGN${n === 1 ? "" : "S"}`, 210 - PAD_X, 297 - PAD_Y - 3, { size: px(11), color: p.muted, align: "right" });
  }

  const head = (s: Sheet) => {
    const p = t.inside;
    s.text(shopTitle(shop) + " · " + String(++number).padStart(2, "0"), 210 - PAD_X, PAD_Y + 8, { size: px(13), color: p.muted, font: "display", align: "right", max: 70 });
    s.text(title, PAD_X, PAD_Y + 8, { size: px(24), color: p.ink, font: "display", max: CONTENT - 75 });
    s.rect(PAD_X, PAD_Y + 11, CONTENT, 0.3, p.accent);
  };
  const foot = (s: Sheet) => {
    const p = t.inside;
    s.text(TRUST, PAD_X, 297 - PAD_Y, { size: px(10), color: p.muted, max: CONTENT - 30 });
    s.text("Price on request", 210 - PAD_X, 297 - PAD_Y, { size: px(10), color: p.muted, align: "right" });
  };

  // A page of its own for each featured piece.
  for (const item of featured) {
    const p = t.inside;
    const s = sheet(p.bg);
    head(s);
    s.image(images.get(item.creationId)!, (210 - 142.4) / 2, 31, 142.4, 178, p.photo);
    const top = 217;
    const colW = (CONTENT - 10) / 2;
    s.rect(PAD_X, top, 12, 0.6, p.accent);
    const nameLines = s.wrap(item.name, px(34), colW, 2, "display");
    let y = top + 3;
    for (const line of nameLines) {
      y += 11;
      s.text(line, PAD_X, y, { size: px(34), color: p.ink, font: "display", max: colW });
    }
    y += 3;
    for (const line of s.wrap(item.note, px(13), colW, 5)) {
      y += 5.5;
      s.text(line, PAD_X, y, { size: px(13), color: p.muted, max: colW });
    }
    const rows = detailRows(item);
    const rx = PAD_X + colW + 10;
    rows.forEach(([k, v], i) => {
      const ry = top + 6 + i * 9;
      s.text(k, rx, ry, { size: px(13), color: p.muted });
      s.text(v, rx + colW, ry, { size: px(13), color: p.ink, font: "bold", align: "right", max: colW - 30 });
      s.rect(rx, ry + 3, colW, 0.25, p.line);
    });
    foot(s);
  }

  // The rest in a grid, 3 across and 2 down.
  for (let i = 0; i < rest.length; i += PER_GRID_PAGE) {
    const p = t.inside;
    const s = sheet(p.bg);
    head(s);
    const colW = (CONTENT - 12) / 3;
    rest.slice(i, i + PER_GRID_PAGE).forEach((item, j) => {
      const x = PAD_X + (j % 3) * (colW + 6);
      const y = 32 + Math.floor(j / 3) * 98;
      s.image(images.get(item.creationId)!, x, y, colW, colW * 1.25, p.photo);
      const codeW = s.text(item.code, x + colW, y + colW * 1.25 + 6, { size: px(10), color: p.muted, font: "bold", align: "right", max: 22 });
      s.text(item.name, x, y + colW * 1.25 + 6, { size: px(15), color: p.ink, font: "display", max: colW - (codeW ? codeW + 2 : 0) });
      s.text(specLine(item), x, y + colW * 1.25 + 11.5, { size: px(10.5), color: p.muted, max: colW });
    });
    foot(s);
  }

  // Back cover.
  {
    const p = t.cover;
    const s = sheet(p.bg);
    const link = waLink(shop.phone);
    s.rect(PAD_X, PAD_Y + 10, 14, 0.6, p.accent);
    s.text("Visit us", PAD_X, PAD_Y + 27, { size: px(52), color: p.accent, font: "display" });
    s.text(`See every design in person${link ? ", or ask us on WhatsApp" : ""}.`, PAD_X, PAD_Y + 37, { size: px(16), color: p.ink, max: CONTENT });
    let y = PAD_Y + 58;
    const block = (label: string, value: string) => {
      if (!value) return;
      s.text(label.toUpperCase(), PAD_X, y, { size: px(11), color: p.muted });
      for (const line of s.wrap(value, px(15), 110, 5)) {
        y += 6.5;
        s.text(line, PAD_X, y, { size: px(15), color: p.ink, max: 110 });
      }
      y += 11;
    };
    block("Showroom", [shopTitle(shop), shop.address, shop.city].filter(Boolean).join("\n"));
    block(link ? "Call / WhatsApp" : "Call", shop.phone);
    block("Hours", shop.hours);
    if (link) {
      // Dark squares on white, which phone cameras read whatever the page colour.
      const qr = QRCode.create(link, { errorCorrectionLevel: "M" }).modules;
      const size = 48, x0 = 210 - PAD_X - size, y0 = PAD_Y + 56;
      const cell = size / (qr.size + 2);
      s.rect(x0, y0, size, size, "#FFFFFF");
      for (let r = 0; r < qr.size; r++) for (let c = 0; c < qr.size; c++) if (qr.get(r, c)) s.rect(x0 + (c + 1) * cell, y0 + (r + 1) * cell, cell + 0.02, cell + 0.02, "#15130F");
      s.text("Scan to chat with us", x0 + size / 2, y0 + size + 6, { size: px(12), color: p.muted, align: "center" });
    }
    const fine = [shop.gstin && `GSTIN ${shop.gstin}`, "Weights are approximate. Final price as per the day’s gold rate, making charges and GST.", TRUST].filter(Boolean) as string[];
    let fy = 297 - PAD_Y - fine.length * 5;
    s.rect(PAD_X, fy - 7, CONTENT, 0.25, p.line);
    for (const line of fine) {
      s.text(line, PAD_X, fy, { size: px(11), color: p.muted, max: CONTENT });
      fy += 5;
    }
  }

  return doc.save();
}

function detailRows(item: BrochureItem): [string, string][] {
  const rows: [string, string][] = [
    ["Design code", item.code],
    ["Purity", item.purity],
    ["Approx. weight", item.weight && `${item.weight} g`],
  ];
  return rows.filter(([, v]) => v);
}

// One PDF at a time: a burst of requests waits its turn instead of using up memory.
let queue: Promise<unknown> = Promise.resolve();

/** The brochure as a PDF, from storage if this exact brochure was made before. */
export async function brochurePdf(userId: string, b: Brochure, shop: PdfShop): Promise<Buffer> {
  const hash = createHash("sha256").update(JSON.stringify({ v: LAYOUT_VERSION, b, shop })).digest("hex").slice(0, 32);
  const key = `users/${userId}/brochures/${hash}.pdf`;
  try {
    return await storage.get(key);
  } catch {
    const job = queue.then(async () => {
      const pdf = Buffer.from(await build(userId, b, shop));
      await storage.put(key, pdf, "application/pdf");
      return pdf;
    });
    queue = job.catch(() => {});
    return job;
  }
}

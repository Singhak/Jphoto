"use client";

import { Marcellus } from "next/font/google";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { type Brochure, type BrochureItem, PER_GRID_PAGE, specLine, TEMPLATES } from "@/lib/brochure";
import { mobileDigits } from "@/lib/catalog";

/**
 * The printed brochure: A4 pages laid out in millimetres, so "Save as PDF" from the browser gives the same pages.
 * Photos are the full-size downloads, shown at their own 4:5 shape so no part of a piece is ever cropped off.
 */

const marcellus = Marcellus({ weight: "400", subsets: ["latin"] });
const display = marcellus.style.fontFamily;

export interface Shop {
  shopName: string;
  phone: string;
  address: string;
  city: string;
  gstin: string;
  hours: string;
}

const photoSrc = (id: string) => `/api/renders/${id}?full=1`;
const shopTitle = (shop: Shop) => shop.shopName || "Your shop name";
const waLink = (phone: string) => {
  const digits = mobileDigits(phone);
  return digits ? `https://wa.me/91${digits}` : null;
};

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export function BrochurePages({ brochure, shop }: { brochure: Brochure; shop: Shop }) {
  const t = TEMPLATES[brochure.template];
  const featured = brochure.items.filter((i) => i.featured);
  const grid = chunk(brochure.items.filter((i) => !i.featured), PER_GRID_PAGE);
  const hero = featured[0] ?? brochure.items[0];
  const golds = [...new Set(brochure.items.map((i) => i.purity).filter((p) => p.endsWith("K")))];
  let page = 1;

  return (
    <>
      <Page bg={t.cover.bg} ink={t.cover.ink}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: display }} className="text-[22px] tracking-wide">{shopTitle(shop)}</span>
          {shop.city && <span style={{ color: t.cover.muted }} className="text-[11px] tracking-[0.14em] uppercase">{shop.city}</span>}
        </div>
        <div className="mt-[8mm] flex flex-1 justify-center">
          {hero && <Photo id={hero.creationId} bg={t.cover.photo} className="h-[160mm]" />}
        </div>
        <div className="mt-[8mm] space-y-2.5">
          <div style={{ background: t.cover.accent }} className="h-0.5 w-14" />
          <h1 style={{ fontFamily: display, color: t.cover.accent }} className="text-[54px] leading-[1.05]">{brochure.title || brochure.collection}</h1>
          {brochure.subtitle && <p style={{ color: t.cover.ink }} className="text-[17px] opacity-90">{brochure.subtitle}</p>}
        </div>
        <div style={{ borderColor: t.cover.line, color: t.cover.muted }} className="mt-[8mm] flex justify-between border-t pt-4 text-[11px] tracking-[0.1em] uppercase">
          <span>{golds.length ? `${golds.join(" & ")} gold` : "Fine jewellery"}</span>
          <span>{brochure.items.length} design{brochure.items.length === 1 ? "" : "s"}</span>
        </div>
      </Page>

      {featured.map((item) => (
        <FeaturePage key={item.creationId} item={item} brochure={brochure} shop={shop} number={++page} />
      ))}

      {grid.map((items, i) => (
        <Page key={i} bg={t.inside.bg} ink={t.inside.ink}>
          <PageHead brochure={brochure} shop={shop} number={++page} />
          <div className="mt-[7mm] grid grid-cols-3 gap-x-[6mm] gap-y-[8mm]">
            {items.map((item) => (
              <div key={item.creationId} className="space-y-1.5">
                <Photo id={item.creationId} bg={t.inside.photo} className="w-full" />
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ fontFamily: display }} className="truncate text-[15px]">{item.name}</span>
                  {item.code && <span style={{ color: t.inside.muted }} className="shrink-0 text-[10px] font-semibold">{item.code}</span>}
                </div>
                {specLine(item) && <p style={{ color: t.inside.muted }} className="text-[10.5px]">{specLine(item)}</p>}
              </div>
            ))}
          </div>
          <PageFoot brochure={brochure} />
        </Page>
      ))}

      <BackPage brochure={brochure} shop={shop} />
    </>
  );
}

function FeaturePage({ item, brochure, shop, number }: { item: BrochureItem; brochure: Brochure; shop: Shop; number: number }) {
  const t = TEMPLATES[brochure.template].inside;
  const rows = [
    ["Design code", item.code],
    ["Purity", item.purity],
    ["Approx. weight", item.weight && `${item.weight.replace(/\s*g$/i, "")} g`],
  ].filter(([, v]) => v);
  return (
    <Page bg={t.bg} ink={t.ink}>
      <PageHead brochure={brochure} shop={shop} number={number} />
      <div className="mt-[6mm] flex justify-center">
        <Photo id={item.creationId} bg={t.photo} className="h-[178mm]" />
      </div>
      <div className="mt-[8mm] flex gap-[10mm]">
        <div className="flex-1 space-y-2.5">
          <div style={{ background: t.accent }} className="h-0.5 w-12" />
          <h2 style={{ fontFamily: display }} className="text-[34px] leading-tight">{item.name}</h2>
          {item.note && <p style={{ color: t.muted }} className="text-[13px] leading-relaxed">{item.note}</p>}
        </div>
        {rows.length > 0 && (
          <dl className="flex-1 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} style={{ borderColor: t.line }} className="flex justify-between border-b py-2">
                <dt style={{ color: t.muted }}>{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <PageFoot brochure={brochure} />
    </Page>
  );
}

function BackPage({ brochure, shop }: { brochure: Brochure; shop: Shop }) {
  const t = TEMPLATES[brochure.template].cover;
  const link = waLink(shop.phone);
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!link) return setQr("");
    // Dark modules on a light square: phone cameras read that reliably, whatever the page colour.
    QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#15130F", light: "#FFFFFF" } }).then(setQr, () => setQr(""));
  }, [link]);

  const block = (label: string, value: string) =>
    value && (
      <div className="space-y-1">
        <p style={{ color: t.muted }} className="text-[11px] tracking-[0.12em] uppercase">{label}</p>
        <p className="text-[15px] leading-relaxed whitespace-pre-line">{value}</p>
      </div>
    );

  return (
    <Page bg={t.bg} ink={t.ink}>
      <div className="mt-[10mm] space-y-3">
        <div style={{ background: t.accent }} className="h-0.5 w-14" />
        <h2 style={{ fontFamily: display, color: t.accent }} className="text-[52px]">Visit us</h2>
        <p className="text-[16px] opacity-90">See every design in person{link ? ", or ask us on WhatsApp" : ""}.</p>
      </div>
      <div className="mt-[14mm] flex items-start gap-[12mm]">
        <div className="flex-1 space-y-6">
          {block("Showroom", [shopTitle(shop), shop.address, shop.city].filter(Boolean).join("\n"))}
          {block(link ? "Call / WhatsApp" : "Call", shop.phone)}
          {block("Hours", shop.hours)}
        </div>
        {qr && (
          <div className="flex flex-col items-center gap-2">
            <div className="size-[48mm] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
            <p style={{ color: t.muted }} className="text-[12px]">Scan to chat with us</p>
          </div>
        )}
      </div>
      <div style={{ borderColor: t.line, color: t.muted }} className="mt-auto space-y-1.5 border-t pt-4 text-[11px] leading-relaxed">
        {shop.gstin && <p>GSTIN {shop.gstin}</p>}
        <p>Weights are approximate. Final price as per the day’s gold rate, making charges and GST.</p>
        <p>Every photo shows the actual piece; only the setting around it is styled.</p>
      </div>
    </Page>
  );
}

function Page({ bg, ink, children }: { bg: string; ink: string; children: React.ReactNode }) {
  return (
    <section
      style={{ background: bg, color: ink }}
      className="brochure-page flex h-[297mm] w-[210mm] shrink-0 flex-col overflow-hidden px-[15mm] py-[14mm] font-sans shadow-xl print:shadow-none"
    >
      {children}
    </section>
  );
}

function PageHead({ brochure, shop, number }: { brochure: Brochure; shop: Shop; number: number }) {
  const t = TEMPLATES[brochure.template].inside;
  return (
    <div style={{ borderColor: t.accent }} className="flex items-end justify-between border-b pb-3">
      <span style={{ fontFamily: display }} className="text-[24px]">{brochure.title || brochure.collection}</span>
      <span style={{ fontFamily: display, color: t.muted }} className="text-[13px]">{shopTitle(shop)} · {String(number).padStart(2, "0")}</span>
    </div>
  );
}

function PageFoot({ brochure }: { brochure: Brochure }) {
  const t = TEMPLATES[brochure.template].inside;
  return (
    <div style={{ color: t.muted }} className="mt-auto flex justify-between pt-4 text-[10px]">
      <span>Every photo shows the actual piece; only the setting around it is styled.</span>
      <span>Price on request</span>
    </div>
  );
}

function Photo({ id, bg, className }: { id: string; bg: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoSrc(id)} alt="" style={{ background: bg }} className={`aspect-[4/5] object-cover ${className}`} />;
}

/**
 * One 1080×1600 picture per piece for WhatsApp chats and Status: the full 4:5 photo with the details under it.
 * Drawn on a canvas in the browser, so it costs nothing on the server.
 */
export async function makeCard(item: BrochureItem, brochure: Brochure, shop: Shop): Promise<File> {
  const t = TEMPLATES[brochure.template].cover;
  const W = 1080, PHOTO = 1350, H = 1600, PAD = 56;
  const sans = getComputedStyle(document.body).fontFamily;
  await Promise.all([document.fonts.load(`56px ${display}`), document.fonts.load(`600 30px ${sans}`)]);

  const img = new Image();
  img.src = photoSrc(item.creationId);
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, PHOTO);

  const fit = (text: string, max: number) => {
    let s = text;
    while (s.length > 1 && ctx.measureText(s).width > max) s = s.slice(0, -1);
    return s === text ? s : `${s.trimEnd()}…`;
  };
  ctx.textBaseline = "alphabetic";

  ctx.font = `600 30px ${sans}`;
  const codeWidth = item.code ? ctx.measureText(item.code).width + 24 : 0;
  ctx.fillStyle = t.muted;
  ctx.textAlign = "right";
  if (item.code) ctx.fillText(item.code, W - PAD, PHOTO + 82);

  ctx.textAlign = "left";
  ctx.font = `52px ${display}`;
  ctx.fillStyle = t.accent;
  ctx.fillText(fit(item.name, W - PAD * 2 - codeWidth), PAD, PHOTO + 84);

  ctx.font = `30px ${sans}`;
  ctx.fillStyle = t.ink;
  const spec = specLine(item);
  if (spec) ctx.fillText(fit(spec, W - PAD * 2), PAD, PHOTO + 134);

  ctx.fillStyle = t.line;
  ctx.fillRect(PAD, H - 82, W - PAD * 2, 2);
  ctx.font = `34px ${display}`;
  ctx.fillStyle = t.ink;
  ctx.fillText(fit(shopTitle(shop), 560), PAD, H - 30);
  if (shop.phone) {
    ctx.font = `26px ${sans}`;
    ctx.fillStyle = t.muted;
    ctx.textAlign = "right";
    ctx.fillText(fit(`${waLink(shop.phone) ? "WhatsApp" : "Call"} ${shop.phone}`, 400), W - PAD, H - 32);
  }

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the picture."))), "image/jpeg", 0.92));
  const slug = (item.code || item.name || "piece").replace(/[^\w-]+/g, "-").toLowerCase();
  return new File([blob], `${slug}.jpg`, { type: "image/jpeg" });
}

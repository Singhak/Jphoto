import Link from "next/link";
import { Icon, PieceIcon } from "@/components/icons";
import { Showcase } from "@/components/Showcase";
import { hasShowcase } from "@/lib/showcase";
import { BRAND, whatsappLink } from "@/lib/brand";
import { inr, MODEL_LOOKS_ON, STYLE_LOOKS, TOP_UPS, WELCOME_CREDITS } from "@/lib/catalog";
import { STYLES } from "@/lib/pipeline/presets";

const LOOKS = STYLES.filter((s) => MODEL_LOOKS_ON || s.kind === "product");

const PROMISES = [
  {
    icon: Icon.shield,
    title: "Your piece is never redrawn",
    body: "We cut the jewellery out of your photo and build only the background around it. The piece in the final photo is the one from your camera: every stone, every link.",
  },
  {
    icon: Icon.check,
    title: "Checked before you see it",
    body: "Every photo is compared with yours, pixel by pixel, inside the piece. If anything moved or changed, the photo is thrown away and never shown.",
  },
  {
    icon: Icon.wallet,
    title: "Pay only for what you download",
    body: "Previews and redos are free. If a downloaded photo still looks wrong, flag it and you get the photo back.",
  },
];

const STEPS = [
  ["Drop in your photos", "The whole tray at once, straight from your phone. Lying on a cloth, on a stand or held in your fingers is fine."],
  ["Pick looks", "White for marketplaces, marble, velvet, silk, festive. One choice covers the whole batch."],
  ["Keep the best", "Pick favourites from the contact sheet and download them together, full size."],
];

const QUESTIONS = [
  ["What photo do I need?", "A clear phone photo of one piece, filling most of the frame, in daylight or soft light. A plain cloth, a stand or your fingers holding it are all fine. Not worn on a hand or neck. We check every photo for free and tell you if it needs retaking."],
  ["Will the design change?", "No. The piece in your catalogue photo is made from the pixels of your own photo, and each photo is checked against yours before you see it. Only the background is new."],
  ["What if a photo looks wrong?", "Previews are free, so skip it or make it again. If you already downloaded it, flag it in the app: we check it and return the photo to your balance if the piece differs."],
  ["Are my designs private?", "Yes. Your photos stay in your account, are never shown to other users, and are never used to train AI. Unreleased pieces are safe to upload."],
  ["How do I pay?", `Buy photos in packs by UPI, card or netbanking. Prices include all taxes and photos never expire. Every account starts with ${WELCOME_CREDITS} free photos.`],
  ["Can I talk to someone in Hindi?", "Haan. Message us on WhatsApp in Hindi or English."],
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-light">
            <Icon.shield className="size-4" /> Checked against your photo, every time
          </p>
          <h1 className="mt-4 font-head text-4xl leading-[1.05] font-bold tracking-tight md:text-6xl">
            Catalogue photos where your jewellery stays exactly yours.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-dim">
            Drop in phone photos. {BRAND.name} builds a studio background around each piece, keeps the piece itself untouched, and proves it before you pay.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/studio" className="btn-light px-6 py-3 text-base">
              Start free · {WELCOME_CREDITS} photos
            </Link>
            <Link href="#prices" className="btn-quiet px-5 py-3 text-base">
              See prices
            </Link>
          </div>
          <p className="mt-3 text-sm text-dim">Sign in with Google. No card needed.</p>
        </div>
        {hasShowcase ? (
          <Showcase />
        ) : (
          <div className="panel grid grid-cols-3 gap-2 p-4">
            {LOOKS.slice(0, 6).map((s, i) => (
              <div key={s.id} className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg" style={{ background: STYLE_LOOKS[s.id]?.swatch }}>
                <PieceIcon piece={(["ring", "necklace", "earring", "bangle", "pendant", "necklace-set"] as const)[i % 6]} className={`size-1/2 ${STYLE_LOOKS[s.id]?.dark ? "text-white/60" : "text-black/30"}`} />
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* The promise */}
      <section className="border-y border-line bg-panel/50">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <h2 className="max-w-2xl font-head text-3xl font-bold tracking-tight md:text-4xl">Most AI photo tools redraw your piece. A link goes missing, a band gets wider, and nobody tells you.</h2>
          <p className="mt-3 max-w-2xl text-dim">A customer who orders from that photo gets something different. {BRAND.name} is built so that can&apos;t happen quietly.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROMISES.map(({ icon: I, title, body }) => (
              <div key={title} className="panel p-6">
                <I className="size-6 text-light" />
                <h3 className="mt-4 font-head text-xl font-bold">{title}</h3>
                <p className="mt-2 text-dim">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <h2 className="font-head text-3xl font-bold tracking-tight md:text-4xl">A whole tray in one go</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="font-head text-4xl leading-none font-bold text-light">{i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-dim">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {LOOKS.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-lg border border-line bg-panel">
              <div className="aspect-[4/5]" style={{ background: STYLE_LOOKS[s.id]?.swatch }} />
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-dim">{STYLE_LOOKS[s.id]?.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Prices */}
      <section id="prices" className="scroll-mt-16 border-y border-line bg-panel/50">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <h2 className="font-head text-3xl font-bold tracking-tight md:text-4xl">Pay per photo you keep</h2>
          <p className="mt-3 max-w-2xl text-dim">
            No subscription. Buy a pack when you need it; photos never expire. Previews, redos and photos that fail our checks are always free. Prices include all taxes.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {TOP_UPS.map((t, i) => (
              <div key={t.photos} className={`panel p-5 ${i === TOP_UPS.length - 1 ? "border-light/60" : ""}`}>
                <p className="text-sm text-dim">{t.photos} photos</p>
                <p className="mt-1 font-head text-3xl font-bold tabular-nums">{inr(t.photos * t.perPhoto)}</p>
                <p className="mt-1 text-sm text-light">{inr(t.perPhoto)} a photo</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-dim">Every new account gets {WELCOME_CREDITS} photos free to try.</p>
        </div>
      </section>

      {/* Questions */}
      <section id="questions" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14 md:px-6">
        <h2 className="font-head text-3xl font-bold tracking-tight md:text-4xl">Questions</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {QUESTIONS.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <Icon.plus className="size-4 shrink-0 text-dim transition group-open:rotate-45" />
              </summary>
              <p className="mt-2 text-dim">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href="/studio" className="btn-light px-6 py-3 text-base">
            Try it with {WELCOME_CREDITS} free photos
          </Link>
          <a href={whatsappLink("Hi, I have a question about Jphoto")} target="_blank" rel="noreferrer" className="btn-quiet px-5 py-3 text-base">
            <Icon.whatsapp className="size-4" /> Ask on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}

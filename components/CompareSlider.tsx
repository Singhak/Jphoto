"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Before/after with a draggable divider. Drag or tap anywhere on the photo; vertical swipes still scroll the page.
 * With `hint`, the line sweeps across once when it first scrolls into view, so people see they can move it.
 */
export function CompareSlider({
  before,
  after,
  beforeLabel = "Your photo",
  afterLabel = "Catalogue",
  hint = false,
  className = "aspect-[4/5]",
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  hint?: boolean;
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const touched = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!hint || !el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || touched.current) return;
        seen.disconnect();
        // 50 → 80 → 20 → 50, eased, over about two seconds.
        const stops = [50, 80, 20, 50];
        const leg = 700;
        const start = performance.now() + 400;
        const step = (now: number) => {
          if (touched.current) return;
          const t = Math.max(0, now - start);
          const i = Math.min(Math.floor(t / leg), stops.length - 2);
          const k = Math.min(1, (t - i * leg) / leg);
          const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          setPos(stops[i] + (stops[i + 1] - stops[i]) * ease);
          if (t < leg * (stops.length - 1)) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    seen.observe(el);
    return () => {
      seen.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [hint]);

  const moveTo = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={box}
      className={`relative w-full cursor-ew-resize touch-pan-y overflow-hidden rounded-lg bg-raised select-none ${className}`}
      onPointerDown={(e) => {
        touched.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) moveTo(e.clientX);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={after} alt={afterLabel} draggable={false} className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before} alt={beforeLabel} draggable={false} className="size-full object-cover" />
      </div>

      {/* Labels fade as the line covers them. */}
      <span className="absolute bottom-3 left-3 rounded-md bg-black/65 px-2.5 py-1 text-[11px] font-semibold tracking-widest text-white uppercase transition-opacity" style={{ opacity: pos < 25 ? 0 : 1 }}>
        {beforeLabel}
      </span>
      <span className="absolute right-3 bottom-3 rounded-md bg-light px-2.5 py-1 text-[11px] font-semibold tracking-widest text-light-ink uppercase transition-opacity" style={{ opacity: pos > 75 ? 0 : 1 }}>
        {afterLabel}
      </span>

      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]" style={{ left: `${pos}%` }} />
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Compare ${beforeLabel.toLowerCase()} with ${afterLabel.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={(e) => {
          const step = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
          if (step === undefined) return;
          e.preventDefault();
          touched.current = true;
          setPos((p) => Math.min(100, Math.max(0, p + step)));
        }}
        className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/45 text-white shadow-lg backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-light"
        style={{ left: `${pos}%` }}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
        </svg>
      </div>
    </div>
  );
}

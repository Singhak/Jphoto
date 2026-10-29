import type { PieceType } from "@/lib/pipeline/presets";

type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Icon = {
  logo: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={1.8}><path d="M7 4h10l4 5-9 11L3 9z" /><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" /></svg>
  ),
  aperture: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="12" r="9" /><path d="M14.3 3.3 8.6 13M21 12h-11.3M17.7 18.7 12 9M9.7 20.7l5.7-9.7M3 12h11.3M6.3 5.3 12 15" /></svg>
  ),
  folder: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
  ),
  wallet: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="17" height="11" rx="2" /><circle cx="16.5" cy="13.5" r="1.2" /></svg>
  ),
  gear: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  sun: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  ),
  moon: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
  ),
  help: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></svg>
  ),
  plus: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
  ),
  flag: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
  ),
  check: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
  ),
  x: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  back: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M15 5 8 12l7 7" /></svg>
  ),
  arrow: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  upload: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
  ),
  download: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></svg>
  ),
  shield: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  refresh: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} {...base}><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" /></svg>
  ),
  whatsapp: ({ className }: P) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2m0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2m4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2s.2-1.1.1-1.2-.2-.2-.5-.3" />
    </svg>
  ),
};

/** Simple line drawings for each piece type, drawn on a 48×48 grid. */
const PIECE_PATHS: Record<PieceType, React.ReactNode> = {
  necklace: (
    <>
      <path d="M10 8c0 14 6 22 14 22s14-8 14-22" />
      <path d="M13 20c2.5 6 6.5 9.5 11 9.5s8.5-3.5 11-9.5" strokeDasharray="1 3.2" strokeWidth={2.4} />
      <path d="M24 30v4" /><path d="m21 37 3-3 3 3-3 4z" />
    </>
  ),
  "necklace-set": (
    <>
      <path d="M14 8c0 12 4.5 19 10 19s10-7 10-19" />
      <path d="M16.5 18c2 5 4.5 8 7.5 8s5.5-3 7.5-8" strokeDasharray="1 3.2" strokeWidth={2.4} />
      <path d="M24 27v3" /><path d="m21.5 32.5 2.5-2.5 2.5 2.5-2.5 3.5z" />
      <path d="M8 12v4" /><path d="m5.5 19 2.5-3 2.5 3-2.5 4z" />
      <path d="M40 12v4" /><path d="m37.5 19 2.5-3 2.5 3-2.5 4z" />
    </>
  ),
  chain: (
    <>
      <path d="M10 8c0 14 6 24 14 24s14-10 14-24" strokeDasharray="3 2" strokeWidth={2.4} />
    </>
  ),
  earring: (
    <>
      <path d="M17 7a3 3 0 1 1 3 3v4" /><path d="M14 22a6 6 0 0 1 12 0z" /><path d="M14 22c0 6 2.5 9 6 9s6-3 6-9" strokeDasharray="1 3" />
      <circle cx="20" cy="35" r="2" /><circle cx="15" cy="32" r="1.4" /><circle cx="25" cy="32" r="1.4" />
      <path d="M33 13v3" /><circle cx="33" cy="20" r="4" /><path d="M33 24v4" /><circle cx="33" cy="30" r="2" />
    </>
  ),
  ring: (
    <>
      <circle cx="24" cy="29" r="11" /><circle cx="24" cy="29" r="8" />
      <path d="m19 13 5-5 5 5-5 5z" /><path d="M19 13h10" />
    </>
  ),
  bangle: (
    <>
      <ellipse cx="20" cy="24" rx="12" ry="14" /><ellipse cx="20" cy="24" rx="9" ry="11" />
      <ellipse cx="28" cy="24" rx="12" ry="14" />
    </>
  ),
  kada: (
    <>
      <ellipse cx="24" cy="24" rx="15" ry="13" /><ellipse cx="24" cy="24" rx="10" ry="8.5" />
      <path d="M9.5 21h29M9.5 27h29" strokeDasharray="1 3" />
    </>
  ),
  bracelet: (
    <>
      <ellipse cx="24" cy="24" rx="15" ry="11" strokeDasharray="0.1 5.8" strokeWidth={4.5} />
      <ellipse cx="24" cy="24" rx="15" ry="11" />
    </>
  ),
  pendant: (
    <>
      <path d="M12 7l12 18 12-18" />
      <path d="M24 25v2" /><path d="M24 27c5 0 8 4 8 8 0 4-3.5 7-8 7s-8-3-8-7c0-4 3-8 8-8z" /><circle cx="24" cy="35" r="2.5" />
    </>
  ),
  "maang-tikka": (
    <>
      <path d="M24 5c-1 5 1 10 0 18" strokeDasharray="2 2" /><circle cx="24" cy="5" r="1.6" />
      <circle cx="24" cy="31" r="8" /><circle cx="24" cy="31" r="3" />
      <path d="M18 38l-1 3M24 39v3M30 38l1 3" />
    </>
  ),
  "nose-pin": (
    <>
      <circle cx="24" cy="24" r="12" /><path d="M24 36v6" />
      <path d="m24 16 2.5 5.5 5.5 2.5-5.5 2.5L24 32l-2.5-5.5L16 24l5.5-2.5z" />
    </>
  ),
  payal: (
    <>
      <path d="M6 18c6 4 12 6 18 6s12-2 18-6" />
      <path d="M6 22c6 4 12 6 18 6s12-2 18-6" />
      {[10, 17, 24, 31, 38].map((x, i) => (
        <g key={x}>
          <path d={`M${x} ${[25, 28, 29, 28, 25][i]}v3`} />
          <circle cx={x} cy={[30, 33, 34, 33, 30][i]} r="2" />
        </g>
      ))}
    </>
  ),
};

export function PieceIcon({ piece, className }: { piece: PieceType; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base} strokeWidth={1.5}>
      {PIECE_PATHS[piece]}
    </svg>
  );
}

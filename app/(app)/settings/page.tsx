"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { emailLink } from "@/lib/brand";
import { useStore } from "@/lib/store";
import { type Theme, useTheme } from "@/lib/theme";

const THEMES: { id: Theme; label: string }[] = [
  { id: "system", label: "Same as phone" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export default function SettingsPage() {
  const { email, shopName, phone, address, city, gstin, hours, update, signOut, ready, logoUrl, uploadLogo, removeLogo } = useStore();
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [shop, setShop] = useState({ address: "", city: "", gstin: "", hours: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!ready) return;
    setName(shopName);
    setMobile(phone);
    setShop({ address, city, gstin, hours });
  }, [ready, shopName, phone, address, city, gstin, hours]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-head text-3xl font-bold tracking-tight">Settings</h1>

      <form
        className="panel space-y-4 p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await update({
              shopName: name.trim(),
              phone: mobile.trim(),
              address: shop.address.trim(),
              city: shop.city.trim(),
              gstin: shop.gstin.trim().toUpperCase(),
              hours: shop.hours.trim(),
            });
            setSaved(true);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
        onChange={() => setSaved(false)}
      >
        <label className="block">
          <span className="mb-1 block text-sm">Shop name</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma Jewellers" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm">Mobile number</span>
          <input className="field" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98765 43210" />
          <span className="mt-1 block text-xs text-dim">For order receipts and support, and printed on your brochures. We never share it otherwise.</span>
        </label>
        <div className="space-y-4 border-t border-line pt-4">
          <p className="text-sm text-dim">Shop details for your brochures. Leave any of them blank to keep them off.</p>
          <label className="block">
            <span className="mb-1 block text-sm">Shop address</span>
            <textarea className="field" rows={2} value={shop.address} onChange={(e) => setShop({ ...shop, address: e.target.value })} placeholder="Shop no., street, area" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm">City and PIN</span>
              <input className="field" value={shop.city} onChange={(e) => setShop({ ...shop, city: e.target.value })} placeholder="Jaipur 302001" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm">GSTIN</span>
              <input className="field uppercase" value={shop.gstin} onChange={(e) => setShop({ ...shop, gstin: e.target.value })} placeholder="08ABCDE1234F1Z5" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm">Opening hours</span>
            <input className="field" value={shop.hours} onChange={(e) => setShop({ ...shop, hours: e.target.value })} placeholder="Mon–Sat, 10:30am – 8:30pm" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-light">Save</button>
          {saved && <span className="flex items-center gap-1 text-sm text-ok"><Icon.check className="size-4" /> Saved</span>}
          {error && <span className="text-sm text-bad">{error}</span>}
        </div>
      </form>

      <div className="panel p-5">
        <p className="text-sm font-semibold">Shop logo</p>
        <p className="mt-1 text-sm text-dim">Printed on your brochures and share pictures. A PNG with a see-through background looks best.</p>
        {logoUrl && (
          // Shown on both a dark and a light ground, the way it will appear on brochures.
          <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-line">
            {["#15130F", "#FAFAF8"].map((bg) => (
              <div key={bg} style={{ background: bg }} className="flex h-24 items-center justify-center p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Your shop logo" className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <label className={`btn-quiet cursor-pointer ${logoBusy ? "pointer-events-none opacity-40" : ""}`}>
            <Icon.upload className="size-4" /> {logoBusy ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setLogoBusy(true);
                setLogoError("");
                try {
                  await uploadLogo(file);
                } catch (err) {
                  setLogoError((err as Error).message);
                } finally {
                  setLogoBusy(false);
                }
              }}
            />
          </label>
          {logoUrl && (
            <button onClick={() => removeLogo().catch((err) => setLogoError((err as Error).message))} className="py-2 text-sm text-dim hover:text-text">
              Remove
            </button>
          )}
        </div>
        {logoError && <p className="mt-2 text-sm text-bad">{logoError}</p>}
      </div>

      <div className="panel p-5">
        <p className="text-sm font-semibold">Appearance</p>
        <div role="radiogroup" aria-label="Appearance" className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-line bg-raised p-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={theme === t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-md px-2 py-2 text-sm transition-colors ${theme === t.id ? "bg-panel font-semibold text-text shadow-sm" : "text-dim hover:text-text"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel flex items-center gap-4 p-5">
        <Icon.help className="size-6 shrink-0 text-dim" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Stuck on something?</p>
          <p className="text-sm text-dim">Email us with a screenshot.</p>
        </div>
        <a href={emailLink()} className="btn-quiet">Email</a>
      </div>

      <div className="panel p-5">
        <p className="text-sm font-semibold">Your account</p>
        <p className="mt-1 text-sm text-dim">Signed in with Google{email ? ` as ${email}` : ""}. Your photos are kept in your account, so you can download them again from any phone.</p>
        <p className="mt-1 text-sm text-dim">Used only to make your catalogue photos. Never used to train AI, never shown to anyone else.</p>
        <button onClick={() => signOut()} className="mt-1 py-2 text-sm text-bad hover:underline">
          Sign out
        </button>
      </div>
    </div>
  );
}

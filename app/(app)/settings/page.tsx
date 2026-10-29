"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { whatsappLink } from "@/lib/brand";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const { shopName, phone, update, reset, ready } = useStore();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setName(shopName);
    setMobile(phone);
  }, [ready, shopName, phone]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-head text-3xl font-bold tracking-tight">Settings</h1>

      <form
        className="panel space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          update({ shopName: name.trim(), phone: mobile.trim() });
          setSaved(true);
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
          <span className="mt-1 block text-xs text-dim">For order receipts and support. We never share it.</span>
        </label>
        <div className="flex items-center gap-3">
          <button className="btn-light">Save</button>
          {saved && <span className="flex items-center gap-1 text-sm text-ok"><Icon.check className="size-4" /> Saved</span>}
        </div>
      </form>

      <div className="panel flex items-center gap-4 p-5">
        <Icon.help className="size-6 shrink-0 text-dim" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Stuck on something?</p>
          <p className="text-sm text-dim">Message us on WhatsApp with a screenshot.</p>
        </div>
        <a href={whatsappLink()} target="_blank" rel="noreferrer" className="btn-quiet">Message</a>
      </div>

      <div className="panel p-5">
        <p className="text-sm font-semibold">Your photos</p>
        <p className="mt-1 text-sm text-dim">Used only to make your catalogue photos. Never used to train AI, never shown to anyone else.</p>
        <button
          onClick={() => {
            if (confirm("Clear everything saved on this device?")) reset();
          }}
          className="mt-3 text-sm text-bad hover:underline"
        >
          Clear data on this device
        </button>
      </div>
    </div>
  );
}

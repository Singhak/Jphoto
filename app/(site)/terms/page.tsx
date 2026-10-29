import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/Legal";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Terms · ${BRAND.name}` };

export default function TermsPage() {
  const { legal } = BRAND;
  return (
    <LegalPage title="Terms of use" intro={`These terms are an agreement between you and ${legal.entity} ("we") for using ${BRAND.name}. By signing in, you accept them.`}>
      <Section title="The service">
        <p>{BRAND.name} turns phone photos of jewellery into catalogue photos. We cut the piece out of your photo, create a background or scene around it, place the original piece back on top, and check the result against your photo before showing it to you.</p>
        <p>The checks cover the piece itself. Backgrounds, props and scenes are generated and will differ from photo to photo.</p>
      </Section>

      <Section title="Your account">
        <p>You sign in with Google and are responsible for activity on your account. You must be 18 or older.</p>
      </Section>

      <Section title="Photos and payment">
        <ul>
          <li>One photo from your balance pays for downloading one full-size catalogue photo. Downloading the same photo again is free.</li>
          <li>Previews, redos and photos that fail our checks are free, within fair-use limits that stop automated or excessive use. The app tells you if you reach a limit.</li>
          <li>
            Purchased photos do not expire while your account is open. They cannot be transferred or exchanged for cash, except as set out in our{" "}
            <Link href="/refunds" className="underline">refund policy</Link>.
          </li>
          <li>Prices are in Indian rupees and include all taxes. Payments are processed by Cashfree Payments.</li>
        </ul>
      </Section>

      <Section title="Your photos and rights">
        <p>You confirm that you own, or have permission to use, the photos you upload and the jewellery in them. You keep all rights to your photos. You own the catalogue photos you download and may use them commercially, on marketplaces, social media, print and anywhere else, without crediting us.</p>
        <p>
          You give us permission to process your photos only to provide the service to you. We do not use them for anything else; see our{" "}
          <Link href="/privacy" className="underline">privacy policy</Link>.
        </p>
      </Section>

      <Section title="If a photo is wrong">
        <p>If a downloaded photo shows your piece differently from your original photo, flag it in the app. We review it and return the photo to your balance if the piece differs.</p>
      </Section>

      <Section title="What you may not do">
        <ul>
          <li>Upload photos you have no right to use, or anything illegal, offensive or showing real people without their consent.</li>
          <li>Use {BRAND.name} to mislead buyers, for example by showing a piece you do not sell.</li>
          <li>Try to get around payments or limits, overload the service, or copy it by automated means.</li>
        </ul>
        <p>We may suspend accounts that break these rules. Unused purchased photos are refunded unless the account was used for fraud.</p>
      </Section>

      <Section title="Liability">
        <p>We provide {BRAND.name} with reasonable care but cannot promise it will always be available or error-free. As far as the law allows, our total liability to you is limited to the amount you paid us in the 3 months before the claim. We are not liable for indirect losses such as lost sales.</p>
      </Section>

      <Section title="Changes and ending">
        <p>We may update these terms and will tell you before important changes apply. You can stop using {BRAND.name} and ask us to close your account at any time.</p>
      </Section>

      <Section title="Law">
        <p>These terms are governed by the laws of India. Disputes go to the courts of {legal.jurisdiction}. Questions: {legal.email}.</p>
      </Section>
    </LegalPage>
  );
}

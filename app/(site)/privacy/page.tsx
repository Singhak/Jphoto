import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/Legal";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Privacy · ${BRAND.name}` };

export default function PrivacyPage() {
  const { legal } = BRAND;
  return (
    <LegalPage
      title="Privacy policy"
      intro={`${BRAND.name} is run by ${legal.entity}. This page explains what we collect when you use ${BRAND.name}, why, and what you can ask us to do with it. In short: your photos are used only to make your catalogue photos, are never shown to anyone else, and are never used to train AI.`}
    >
      <Section title="What we collect">
        <ul>
          <li><strong>Your Google account details</strong> when you sign in: name, email address and profile picture.</li>
          <li><strong>Shop details you add</strong>: shop name and mobile number.</li>
          <li><strong>Photos you upload</strong>, the cut-out of each piece, and the catalogue photos we make from them.</li>
          <li><strong>Payment records</strong>: which pack you bought, the amount and the order status. Your card, UPI or bank details go straight to Cashfree; we never see or store them.</li>
          <li><strong>Usage records</strong>: how many photos were checked, previewed and downloaded, so we can bill correctly and apply fair-use limits.</li>
        </ul>
      </Section>

      <Section title="Why we use it">
        <ul>
          <li>To make your catalogue photos and keep them in your account.</li>
          <li>To take payments, keep your photo balance and send receipts.</li>
          <li>To answer support questions and review photos you flag.</li>
          <li>To meet legal duties, such as keeping tax records.</li>
        </ul>
        <p>We do not sell your data, show your photos to other users, use them in our marketing without your written permission, or use them to train AI models.</p>
      </Section>

      <Section title="Who else handles your data">
        <p>Some steps run on services we pay for. Each receives only what that step needs and may not use it for anything else:</p>
        <ul>
          <li><strong>Google</strong>: sign-in, and Gemini models that check photos and make some scenes.</li>
          <li><strong>fal.ai</strong>: cutting the piece out of the photo and generating backgrounds.</li>
          <li><strong>Cashfree Payments</strong>: processing payments.</li>
          <li><strong>Our hosting and storage providers</strong>: running the app and storing files.</li>
        </ul>
        <p>We use these services on paid terms under which they do not train their models on our customers&apos; data.</p>
      </Section>

      <Section title="How long we keep it">
        <p>Your photos and account stay while your account is open. Ask us to delete your account and we delete your photos and profile within 30 days. Payment records are kept for 8 years because Indian tax law requires it.</p>
      </Section>

      <Section title="Security">
        <p>Files are stored privately under your account and are only sent to you after you sign in. Connections to {BRAND.name} use HTTPS.</p>
      </Section>

      <Section title="Your rights">
        <p>Under the Digital Personal Data Protection Act, 2023, you can ask to see the data we hold about you, correct it, or delete it, and you can withdraw consent by closing your account. Email {legal.email} and we will reply within 30 days.</p>
      </Section>

      <Section title="Cookies">
        <p>We use one cookie to keep you signed in, and your browser remembers your light or dark theme. We do not use advertising or tracking cookies.</p>
      </Section>

      <Section title="Grievance officer">
        <p>{legal.grievanceOfficer}, {legal.entity}, {legal.address}. Email: {legal.email}. We acknowledge complaints within 24 hours and resolve them within 15 days.</p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy in a way that matters, we will tell you by email or in the app before the change applies.</p>
      </Section>
    </LegalPage>
  );
}

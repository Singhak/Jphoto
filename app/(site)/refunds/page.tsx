import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/Legal";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Refunds · ${BRAND.name}` };

export default function RefundsPage() {
  const { legal } = BRAND;
  return (
    <LegalPage title="Refund and cancellation policy" intro="You pay only for photos you download, so most problems never cost you anything. When something does go wrong, here is what happens.">
      <Section title="Never charged">
        <ul>
          <li>Previews and redos.</li>
          <li>Photos that fail our checks. They are never shown to you.</li>
          <li>Downloading a photo you already paid for.</li>
        </ul>
      </Section>

      <Section title="A downloaded photo that's wrong">
        <p>If the piece in a downloaded photo differs from your original photo, flag it in the app. We review it, usually within one working day, and return the photo to your balance if the piece differs.</p>
      </Section>

      <Section title="Unused photos">
        <p>You can ask for a refund of unused photos from a top-up within 30 days of buying it. We refund each unused photo at the per-photo price you paid. Free welcome photos are not refundable.</p>
      </Section>

      <Section title="Failed or double payments">
        <p>If money left your account but no photos were added, the bank or UPI app normally reverses it automatically within 5–7 working days. If it doesn&apos;t, or if you were charged twice, contact us with the date and amount and we will sort it out.</p>
      </Section>

      <Section title="How refunds are paid">
        <p>Approved refunds go back to the original payment method through Cashfree within 5–7 working days.</p>
      </Section>

      <Section title="Cancellation">
        <p>There is no subscription to cancel. You buy photos when you need them, and you can close your account at any time.</p>
      </Section>

      <Section title="Ask for a refund">
        <p>Email {legal.email} with the email you sign in with and the order date.</p>
      </Section>
    </LegalPage>
  );
}

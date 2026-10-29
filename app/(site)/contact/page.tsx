import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/Legal";
import { BRAND, emailLink } from "@/lib/brand";

export const metadata: Metadata = { title: `Contact · ${BRAND.name}` };

export default function ContactPage() {
  const { legal } = BRAND;
  return (
    <LegalPage title="Contact us" intro="Questions about your photos, payments or your account: we answer in Hindi or English.">
      <Section title="Email">
        <p>
          <a href={emailLink()} className="text-light underline">
            {legal.email}
          </a>
          . We reply within one working day.
        </p>
      </Section>
      <Section title="Business">
        <p>
          {BRAND.name} is a product of {legal.entity}, {legal.jurisdiction}.
        </p>
      </Section>
      <Section title="Grievance officer">
        <p>{legal.grievanceOfficer}, at the email above.</p>
      </Section>
    </LegalPage>
  );
}

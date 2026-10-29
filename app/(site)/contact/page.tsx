import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/Legal";
import { BRAND, whatsappLink } from "@/lib/brand";

export const metadata: Metadata = { title: `Contact · ${BRAND.name}` };

export default function ContactPage() {
  const { legal } = BRAND;
  return (
    <LegalPage title="Contact us" intro="Questions about your photos, payments or your account: we answer in Hindi or English.">
      <Section title="WhatsApp">
        <p>
          The fastest way to reach us:{" "}
          <a href={whatsappLink()} target="_blank" rel="noreferrer" className="text-light underline">
            +{BRAND.whatsapp}
          </a>
          , Monday to Saturday, 10am to 7pm.
        </p>
      </Section>
      <Section title="Email">
        <p>{legal.email}. We reply within one working day.</p>
      </Section>
      <Section title="Business">
        <p>
          {legal.entity}
          <br />
          {legal.address}
        </p>
      </Section>
      <Section title="Grievance officer">
        <p>{legal.grievanceOfficer}, at the email and address above.</p>
      </Section>
    </LegalPage>
  );
}

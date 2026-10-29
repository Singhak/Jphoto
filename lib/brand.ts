export const BRAND = {
  name: "Jphoto",
  tagline: "Jewellery photo studio",
  /** Support number for WhatsApp help, in international format without "+". TODO before launch: the real number. */
  whatsapp: "919999999999",
  /**
   * Shown on the legal and contact pages. Cashfree checks these match your KYC before approving the account.
   * TODO before launch: replace every bracketed value.
   */
  legal: {
    entity: "[Business legal name]",
    address: "[Registered business address, city, state, PIN]",
    email: "[support email]",
    /** Grievance officer under the IT Rules 2021; can be the owner. */
    grievanceOfficer: "[Name of grievance officer]",
    /** State whose courts handle disputes in the terms. */
    jurisdiction: "[City, State]",
    updated: "29 October 2026",
  },
};

export const whatsappLink = (text = "Hi, I need help with my jewellery photos") =>
  `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;

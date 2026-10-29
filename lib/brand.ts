export const BRAND = {
  name: "Jphoto",
  tagline: "Jewellery photo studio",
  /**
   * Shown on the legal and contact pages. Cashfree checks these match your KYC before approving the account.
   */
  legal: {
    entity: "Infynetic",
    /** Support and grievance email. */
    email: "contact@infynetic.com",
    /** Grievance officer under the IT Rules 2021; can be the owner. */
    grievanceOfficer: "Anil Kumar",
    /** City whose courts handle disputes in the terms. */
    jurisdiction: "Delhi",
    updated: "29 October 2026",
  },
};

export const emailLink = (subject = "Help with my jewellery photos") => `mailto:${BRAND.legal.email}?subject=${encodeURIComponent(subject)}`;

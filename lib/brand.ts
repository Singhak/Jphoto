export const BRAND = {
  name: "Jphoto",
  tagline: "Jewellery photo studio",
  /** Support number for WhatsApp help, in international format without "+". */
  whatsapp: "919999999999",
};

export const whatsappLink = (text = "Hi, I need help with my jewellery photos") =>
  `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;

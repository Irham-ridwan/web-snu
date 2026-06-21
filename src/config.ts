export const SITE = {
  name: "Sekala Niskala Universe",
  shortName: "SNU",
  title: "SEKALA NISKALA UNIVERSE — Dibatas nyata dan tak kasat",
  description:
    "Di sinilah kita berkumpul, dalam ekosistem dimana batas antara yang nyata dan yang tak terlihat menjadi kabur. Sejatinya SEKALA-NISKALA, adalah dua sisi kehidupan yang saling berjalin, membentuk tarian yang indah nan misterius, keduanya berdampingan dan saling melengkapi dengan kesadaran.",
  url: "https://snu.pages.dev",
  locale: "id-ID",
  defaultAuthor: "Komunitas SNU",
} as const

export const NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Artikel", href: "/artikel" },
  { label: "Events", href: "/events" },
  { label: "Tentang", href: "/tentang" },
  { label: "Kontributor", href: "/kontributor" },
] as const

// Taksonomi yang dikurasi untuk label & deskripsi yang manusiawi.
export const TAG_META: Record<string, { label: string; description: string }> = {
  "wpm-saga": {
    label: "WPM [SAGA]",
    description: "Kisah-kisah fiksi fantasi gaib dan mistis.",
  },
  spiritual: {
    label: "Spiritual",
    description: "Renungan, pemikiran, dan laku kesadaran batin.",
  },
  misteri: {
    label: "Misteri",
    description: "Penelusuran kisah supernatural dan dunia tak kasat mata.",
  },
  snu: {
    label: "SNU",
    description: "Catatan dan rumor dari semesta Sekala Niskala Universe.",
  },
}

export const SERI_META: Record<string, { label: string; description: string }> = {
  "wpm-saga": {
    label: "WPM [SAGA]",
    description: "Kisah fiksi fantasi mistis tentang Sakti, Bayu, dan perjalanan dimensi transisi.",
  },
}

// URL RSS Feed Quora (bisa diisi dengan link RSS yang dibuat dari generator gratis seperti rss.app)
export const QUORA_RSS_FEED_URL = "https://politepaul.com/fd/mdwa5gNFMeXk.xml" // Ganti dengan RSS URL asli Anda


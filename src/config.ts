import siteSettings from "./content/settings/site.json"

export const SITE = {
  name: siteSettings.name,
  shortName: siteSettings.shortName,
  title: siteSettings.title,
  description: siteSettings.description,
  url: siteSettings.url,
  locale: "id-ID",
  defaultAuthor: "Komunitas SNU",
} as const

export const NAV_LINKS = [
  { label: "Beranda", href: "/" },
  { label: "Artikel", href: "/artikel" },
  { label: "Events", href: "/events" },
  ...(siteSettings.enableGallery ? [{ label: "Galeri", href: "/galeri" }] : []),
  { label: "Tentang", href: "/tentang" },
  { label: "Kontributor", href: "/kontributor" },
]

// Taksonomi yang dikurasi untuk label & deskripsi yang manusiawi.
const baseTags: Record<string, { label: string; description: string; colorClass?: string }> = {
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

const baseSeri: Record<string, { label: string; description: string }> = {
  "wpm-saga": {
    label: "WPM [SAGA]",
    description: "Kisah fiksi fantasi mistis tentang Sakti, Bayu, dan perjalanan dimensi transisi.",
  },
}

export const TAG_META = { ...baseTags }
if (siteSettings.enableDynamicTags) {
  const dynamicTagsFiles = import.meta.glob<{ default: { name: string; label: string; description?: string; colorClass?: string } }>(
    "/src/content/tags/*.json",
    { eager: true }
  )
  Object.values(dynamicTagsFiles).forEach(file => {
    const data = file.default
    if (data && data.name) {
      TAG_META[data.name] = {
        label: data.label,
        description: data.description || "",
        colorClass: data.colorClass,
      }
    }
  })
}

export const SERI_META = { ...baseSeri }
if (siteSettings.enableDynamicSeri) {
  const dynamicSeriFiles = import.meta.glob<{ default: { name: string; label: string; description?: string } }>(
    "/src/content/seri/*.json",
    { eager: true }
  )
  Object.values(dynamicSeriFiles).forEach(file => {
    const data = file.default
    if (data && data.name) {
      SERI_META[data.name] = {
        label: data.label,
        description: data.description || "",
      }
    }
  })
}

export const QUORA_URL = siteSettings.quoraUrl
export const QUORA_RSS_FEED_URL = siteSettings.rssUrl
export const ANNOUNCEMENT = {
  active: siteSettings.announcementActive,
  text: siteSettings.announcementText,
  link: siteSettings.announcementLink,
}


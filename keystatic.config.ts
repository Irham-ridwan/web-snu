import { config, collection, singleton, fields } from "@keystatic/core"

export default config({
  storage: {
    kind: process.env.NODE_ENV === "production" ? "github" : "local",
    repo: {
      owner: "PaKu211",
      name: "web-snu",
    },
  },
  collections: {
    artikel: collection({
      label: "Artikel",
      path: "src/content/artikel/*",
      format: { contentField: "content" },
      slugField: "slug",
      schema: {
        title: fields.text({ label: "Judul", validation: { isRequired: true } }),
        slug: fields.slug({ name: { label: "Slug" } }),
        description: fields.text({ label: "Deskripsi", validation: { isRequired: true } }),
        author: fields.text({ label: "Penulis", validation: { isRequired: true } }),
        publishDate: fields.date({ label: "Tanggal Terbit", validation: { isRequired: true } }),
        updatedDate: fields.date({ label: "Tanggal Diperbarui (Opsional)" }),
        cover: fields.image({
          label: "Gambar Sampul (Cover)",
          directory: "public/images/artikel",
          publicPath: "/images/artikel/",
        }),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          itemLabel: (props) => props.value || "Tag baru",
        }),
        seri: fields.select({
          label: "Seri",
          options: [
            { label: "Tidak Ada", value: "" },
            { label: "WPM [SAGA]", value: "wpm-saga" },
            { label: "Malam Mingguan (malming)", value: "malming" },
            { label: "Seri Outbound (outbound)", value: "outbound" },
            { label: "Arktalk (arktalk)", value: "arktalk" },
          ],
          defaultValue: "",
        }),
        featured: fields.checkbox({ label: "Disematkan (Featured)", defaultValue: false }),
        draft: fields.checkbox({ label: "Draf", defaultValue: false }),
        sourceUrl: fields.url({ label: "Source URL (Quora/Lainnya)" }),
        content: fields.mdx({
          label: "Konten",
          formatting: {
            inlineMarks: {
              bold: true,
              italic: true,
              underline: true,
              strikethrough: true,
              code: true,
              superscript: true,
              subscript: true,
            },
            listTypes: {
              ordered: true,
              unordered: true,
            },
            headingLevels: [1, 2, 3, 4, 5, 6],
            blockTypes: {
              blockquote: true,
              code: true,
            },
            alignment: {
              center: true,
              end: true,
            },
            softBreaks: true,
          },
          dividers: true,
          links: true,
          tables: true,
          images: {
            directory: "public/images/artikel",
            publicPath: "/images/artikel/",
          },
        }),
      },
    }),
    events: collection({
      label: "Events",
      path: "src/content/events/*",
      format: { contentField: "content" },
      slugField: "slug",
      schema: {
        title: fields.text({ label: "Judul Event", validation: { isRequired: true } }),
        slug: fields.slug({ name: { label: "Slug" } }),
        description: fields.text({ label: "Deskripsi Singkat", validation: { isRequired: true } }),
        startDate: fields.date({ label: "Tanggal Mulai", validation: { isRequired: true } }),
        endDate: fields.date({ label: "Tanggal Selesai" }),
        location: fields.text({ label: "Lokasi", defaultValue: "Online" }),
        cover: fields.image({
          label: "Gambar Sampul (Cover)",
          directory: "public/images/events",
          publicPath: "/images/events/",
        }),
        draft: fields.checkbox({ label: "Draf", defaultValue: false }),
        content: fields.markdoc({
          label: "Detail Event",
          extension: "md",
          formatting: {
            inlineMarks: {
              bold: true,
              italic: true,
              underline: true,
              strikethrough: true,
              code: true,
              superscript: true,
              subscript: true,
            },
            listTypes: {
              ordered: true,
              unordered: true,
            },
            headingLevels: [1, 2, 3, 4, 5, 6],
            blockTypes: {
              blockquote: true,
              code: true,
            },
            alignment: {
              center: true,
              end: true,
            },
            softBreaks: true,
          },
          dividers: true,
          links: true,
          tables: true,
          images: {
            directory: "public/images/events",
            publicPath: "/images/events/",
          },
        }),
      },
    }),
    kontributor: collection({
      label: "Kontributor",
      path: "src/content/kontributor/*",
      format: { contentField: "content" },
      slugField: "slug",
      schema: {
        name: fields.text({ label: "Nama Lengkap", validation: { isRequired: true } }),
        slug: fields.slug({ name: { label: "Slug" } }),
        role: fields.text({ label: "Peran / Bidang" }),
        bio: fields.text({ label: "Biografi Singkat", multiline: true, validation: { isRequired: true } }),
        avatar: fields.image({
          label: "Foto Profil",
          directory: "public/images/kontributor",
          publicPath: "/images/kontributor/",
        }),
        order: fields.number({ label: "Urutan Tampilan", defaultValue: 99 }),
        socials: fields.array(
          fields.object({
            label: fields.text({ label: "Nama Platform (e.g. Instagram)" }),
            url: fields.url({ label: "URL Profil" }),
          }),
          {
            label: "Media Sosial",
            itemLabel: (props) => `${props.fields.label.value || "Platform"}: ${props.fields.url.value || ""}`,
          }
        ),
        content: fields.markdoc({
          label: "Informasi Tambahan (Opsional)",
          extension: "md",
          formatting: true,
          dividers: true,
          links: true,
        }),
      },
    }),
    tags: collection({
      label: "Tags",
      path: "src/content/tags/*",
      format: { data: "json" },
      slugField: "name",
      schema: {
        name: fields.text({ label: "ID Tag (Lowercase, e.g. spiritual)", validation: { isRequired: true } }),
        label: fields.text({ label: "Label Tampilan Tag (e.g. Spiritual)", validation: { isRequired: true } }),
        description: fields.text({ label: "Deskripsi Singkat" }),
        colorClass: fields.select({
          label: "Aksen Warna Tag",
          options: [
            { label: "Cokelat (Niskala)", value: "niskala" },
            { label: "Hijau (Sekala)", value: "sekala" },
            { label: "Hijau Gelap (Outbound)", value: "outbound" },
            { label: "Emas (English)", value: "english" },
            { label: "Netral (Grey)", value: "neutral" }
          ],
          defaultValue: "neutral"
        })
      }
    }),
    seri: collection({
      label: "Seri",
      path: "src/content/seri/*",
      format: { data: "json" },
      slugField: "name",
      schema: {
        name: fields.text({ label: "ID Seri (Lowercase, e.g. wpm-saga)", validation: { isRequired: true } }),
        label: fields.text({ label: "Label Tampilan Seri", validation: { isRequired: true } }),
        description: fields.text({ label: "Deskripsi Seri" }),
      }
    }),
    gallery: collection({
      label: "Galeri Dokumentasi",
      path: "src/content/gallery/*",
      format: { data: "json" },
      slugField: "slug",
      schema: {
        title: fields.text({ label: "Judul Kegiatan", validation: { isRequired: true } }),
        slug: fields.slug({ name: { label: "Slug URL" } }),
        description: fields.text({ label: "Deskripsi Singkat", validation: { isRequired: true } }),
        date: fields.date({ label: "Tanggal Kegiatan", validation: { isRequired: true } }),
        images: fields.array(
          fields.object({
            image: fields.image({
              label: "Foto",
              directory: "public/images/gallery",
              publicPath: "/images/gallery/",
            }),
            caption: fields.text({ label: "Keterangan Foto" })
          }),
          {
            label: "Koleksi Foto",
            itemLabel: (props) => props.fields.caption.value || "Foto"
          }
        ),
        draft: fields.checkbox({ label: "Draf (Sembunyikan)", defaultValue: false }),
      }
    }),
    pages: collection({
      label: "Halaman Kustom",
      path: "src/content/pages/*",
      format: { contentField: "content" },
      slugField: "slug",
      schema: {
        title: fields.text({ label: "Judul Halaman", validation: { isRequired: true } }),
        slug: fields.slug({ name: { label: "Slug URL (e.g. donasi)" } }),
        description: fields.text({ label: "Deskripsi Singkat (SEO)", validation: { isRequired: true } }),
        draft: fields.checkbox({ label: "Draf (Sembunyikan)", defaultValue: false }),
        content: fields.mdx({
          label: "Konten Halaman",
          formatting: true,
          links: true,
          dividers: true,
          images: {
            directory: "public/images/pages",
            publicPath: "/images/pages/",
          }
        })
      }
    }),
  },
  singletons: {
    settings: singleton({
      label: "Pengaturan Situs",
      path: "src/content/settings/site",
      format: { data: "json" },
      schema: {
        name: fields.text({ label: "Nama Website", validation: { isRequired: true } }),
        shortName: fields.text({ label: "Singkatan Nama", validation: { isRequired: true } }),
        title: fields.text({ label: "Judul SEO", validation: { isRequired: true } }),
        description: fields.text({
          label: "Deskripsi SEO / Footer",
          multiline: true,
          validation: { isRequired: true },
        }),
        url: fields.text({ label: "URL Website", validation: { isRequired: true } }),
        quoraUrl: fields.text({ label: "URL Quora Space", validation: { isRequired: true } }),
        rssUrl: fields.text({ label: "URL RSS Feed Quora (Untuk Scraper)", validation: { isRequired: true } }),
        announcementActive: fields.checkbox({ label: "Aktifkan Banner Pengumuman Berjalan (Ticker Banner)", defaultValue: false }),
        announcementText: fields.text({ label: "Teks Pengumuman", defaultValue: "" }),
        announcementLink: fields.text({ label: "Link Pengumuman (Opsional)", defaultValue: "" }),
        enableDynamicTags: fields.checkbox({ label: "Aktifkan Pengelolaan Tag Dinamis (On/Off)", defaultValue: false }),
        enableDynamicSeri: fields.checkbox({ label: "Aktifkan Pengelolaan Seri Dinamis (On/Off)", defaultValue: false }),
        enableGallery: fields.checkbox({ label: "Aktifkan Fitur Galeri Dokumentasi (On/Off)", defaultValue: false }),
        enableCustomPages: fields.checkbox({ label: "Aktifkan Fitur Halaman Statis Kustom (On/Off)", defaultValue: false }),
      },
    }),
  },
})

import { config, collection, fields } from "@keystatic/core"

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
  },
})

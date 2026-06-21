import rss from "@astrojs/rss"
import { getCollection } from "astro:content"
import { SITE } from "@/config"
import { sortArtikel } from "@/lib/utils"

export async function GET(context: any) {
  const allArticles = sortArtikel(await getCollection("artikel"))

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site || SITE.url,
    items: allArticles.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      description: post.data.description,
      link: `/artikel/${post.id}`,
    })),
    customData: `<language>id-ID</language>`,
  })
}

import type { APIRoute } from "astro"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Define directories relative to project root
const BASE_DIR = process.cwd()
const ARTICLES_DIR = path.join(BASE_DIR, "src/content/artikel")
const PUBLIC_IMAGES_DIR = path.join(BASE_DIR, "public/images/artikel")
const COOKIE_PATH = path.join(BASE_DIR, "scripts/quora_cookies.json")

// Helper to slugify title
function slugify(text: string) {
  const s = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
  return s.slice(0, 80).replace(/-+$/, "")
}

// Simple Markdown to plain text cleaner for description
function cleanDescriptionMarkdown(md: string) {
  if (!md) return ""
  const text = md
    .replace(/[#*_\-[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.slice(0, 150) + (text.length > 150 ? "..." : "")
}

// Helper to download image
async function downloadImage(url: string, destPath: string) {
  try {
    const res = await fetch(url)
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      fs.writeFileSync(destPath, buffer)
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

export const POST: APIRoute = async ({ request }) => {
  // Check if we are running in an environment that can run Puppeteer (local Node.js environment)
  const isCloudflare = typeof globalThis.WebSocket === "undefined" || (globalThis as any).caches !== undefined;
  
  // A simple heuristic: Cloudflare Workers do not have access to 'child_process' or native binary execution
  if (isCloudflare) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Pengimpor otomatis hanya didukung saat dijalankan di lingkungan lokal (dev server) karena membutuhkan library Puppeteer untuk melewati proteksi Cloudflare Quora.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const body = await request.json()
    const { url } = body

    if (!url || !url.startsWith("http")) {
      return new Response(
        JSON.stringify({ success: false, error: "URL tidak valid. Masukkan URL postingan Quora yang benar." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    console.log(`[API Import] Memulai impor untuk: ${url}`)

    // Dynamically import puppeteer-extra inside the API route to prevent import errors in environments where it is not used
    const puppeteer = (await import("puppeteer-extra")).default
    const StealthPlugin = (await import("puppeteer-extra-plugin-stealth")).default
    puppeteer.use(StealthPlugin())

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    // Load cookies
    if (fs.existsSync(COOKIE_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"))
      await page.setCookie(...cookies)
      console.log("[API Import] Cookie sesi berhasil dimuat.")
    } else {
      console.log("[API Import] Peringatan: quora_cookies.json tidak ditemukan. Mengimpor sebagai tamu.")
    }

    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 })
      await page.waitForSelector(".qu-userSelect--text, article", { timeout: 15000 })

      let rawTitle = await page.title()
      let title = rawTitle
        .replace(/ - Sekala Niskala Universe \(SNU\) - Quora$/i, "")
        .replace(/ - Sekala Niskala Universe - Quora$/i, "")
        .replace(/ - Sekala Niskala Universe \(SNU\)$/i, "")
        .replace(/ - Sekala Niskala Universe$/i, "")
        .replace(/ - Quora$/i, "")
        .replace(/ - Waroeng Podjok Mangkoes - Quora$/i, "")
        .replace(/ - Waroeng Podjok Mangkoes$/i, "")
        .trim()

      // Scrape data
      const postData = await page.evaluate(() => {
        const contentEl = document.querySelector(".qu-userSelect--text") || 
                          document.querySelector(".q-text.qu-userSelect--text") ||
                          document.querySelector("article") ||
                          document.querySelector(".q-box.qu-userSelect--text")
        
        if (!contentEl) return null

        function wrapMarkdown(text: string, wrapper: string) {
          const trimmed = text.trim()
          if (!trimmed) return text
          const leading = text.match(/^\s*/)?.[0] || ""
          const trailing = text.match(/\s*$/)?.[0] || ""
          if (trimmed.startsWith(wrapper) && trimmed.endsWith(wrapper)) {
            return text
          }
          return `${leading}${wrapper}${trimmed}${wrapper}${trailing}`
        }

        function toMarkdown(node: Node): string {
          if (node.nodeType === 3) {
            return node.textContent || ""
          }
          if (node.nodeType !== 1) {
            return ""
          }

          const el = node as HTMLElement
          const tagName = el.tagName.toLowerCase()
          
          if (tagName === "style" || tagName === "script") {
            return ""
          }

          let childrenMarkdown = ""
          for (const child of el.childNodes) {
            childrenMarkdown += toMarkdown(child)
          }

          switch (tagName) {
            case "p":
              if (!childrenMarkdown.trim()) return ""
              return "\n\n" + childrenMarkdown.trim() + "\n\n"
            case "span":
              const weight = el.style.fontWeight || ""
              const style = el.style.fontStyle || ""
              let text = childrenMarkdown
              if (weight === "bold" || weight === "700") {
                text = wrapMarkdown(text, "**")
              }
              if (style === "italic") {
                text = wrapMarkdown(text, "*")
              }
              return text
            case "b":
            case "strong":
              return wrapMarkdown(childrenMarkdown, "**")
            case "i":
            case "em":
              return wrapMarkdown(childrenMarkdown, "*")
            case "h1":
              return "\n\n# " + childrenMarkdown.trim() + "\n\n"
            case "h2":
              return "\n\n## " + childrenMarkdown.trim() + "\n\n"
            case "h3":
              return "\n\n### " + childrenMarkdown.trim() + "\n\n"
            case "blockquote":
              return "\n\n> " + childrenMarkdown.trim().split("\n").map(line => line.trim()).join("\n> ") + "\n\n"
            case "ul":
            case "ol":
              return "\n\n" + childrenMarkdown.trim() + "\n\n"
            case "li":
              return "\n- " + childrenMarkdown.trim()
            case "a":
              const href = el.getAttribute("href") || ""
              if (href) {
                return ` [${childrenMarkdown.trim() || href}](${href}) `
              }
              return childrenMarkdown
            case "img":
              const src = el.getAttribute("src") || ""
              const alt = el.getAttribute("alt") || ""
              if (src) {
                return `\n\n![${alt || "image"}](${src})\n\n`
              }
              return ""
            case "br":
              return "\n"
            case "div":
              if (el.classList.contains("QTextBlockQuote___StyledAbsolute-sc-21084cfb-0")) {
                return ""
              }
              return childrenMarkdown
            default:
              return childrenMarkdown
          }
        }

        const markdown = toMarkdown(contentEl)
          .replace(/\r\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim()

        const dateEl = document.querySelector(".q-text.qu-color--gray_light")
        const dateStr = dateEl ? dateEl.textContent?.trim() || "" : ""

        return { markdown, dateStr }
      })

      if (!postData || !postData.markdown) {
        throw new Error("Gagal mengekstrak konten postingan Quora atau konten kosong.")
      }

      // Title fallback
      if (!title) {
        const text = postData.markdown.replace(/[#*_\-[\]()!]/g, " ").replace(/\s+/g, " ").trim()
        title = text.slice(0, 50) + (text.length > 50 ? "..." : "")
      }

      const slug = slugify(title)
      const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`)

      // Ensure output directory exists
      if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true })
      if (!fs.existsSync(PUBLIC_IMAGES_DIR)) fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true })

      // Publish date parsing
      let formattedDate = new Date().toISOString().split("T")[0]
      if (postData.dateStr) {
        try {
          const cleanDateStr = postData.dateStr.replace(/Updated|Posted/i, "").trim()
          const d = new Date(cleanDateStr)
          if (!isNaN(d.getTime())) {
            formattedDate = d.toISOString().split("T")[0]
          }
        } catch (e) {}
      }

      // Download Cover Image
      let coverPath = ""
      const imgUrl = await page.evaluate(() => {
        const firstImg = document.querySelector(".qu-userSelect--text img") as HTMLImageElement
        return firstImg ? firstImg.src : ""
      })

      if (imgUrl && imgUrl.startsWith("http")) {
        const urlWithoutQuery = imgUrl.split("?")[0].split("#")[0]
        const ext = urlWithoutQuery.split(".").pop() || "jpg"
        const shortSlug = slug.slice(0, 50).replace(/-+$/, "")
        const imgName = `cover-${shortSlug}.${ext}`
        const destImgPath = path.join(PUBLIC_IMAGES_DIR, imgName)

        console.log(`[API Import] Mengunduh cover: ${imgUrl}`)
        const success = await downloadImage(imgUrl, destImgPath)
        if (success) {
          coverPath = `../../../public/images/artikel/${imgName}`
        }
      }

      // Download Inline Images
      const imgRegex = /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g
      let match
      let finalMarkdown = postData.markdown
      let inlineImgIndex = 1

      // Reset regex state
      imgRegex.lastIndex = 0

      while ((match = imgRegex.exec(postData.markdown)) !== null) {
        const alt = match[1]
        const fullUrl = match[2]

        const cleanUrl = fullUrl.split("?")[0].split("#")[0]
        let imgExt = cleanUrl.split(".").pop() || "jpg"
        if (imgExt.toLowerCase() === "jpeg") imgExt = "jpg"
        imgExt = imgExt.split(/[?#]/)[0]

        const shortSlug = slug.slice(0, 50).replace(/-+$/, "")
        const imgName = `content-${shortSlug}-${inlineImgIndex}.${imgExt}`
        const destImgPath = path.join(PUBLIC_IMAGES_DIR, imgName)
        const relativePath = `/images/artikel/${imgName}`

        console.log(`[API Import] Mengunduh gambar inline: ${cleanUrl}`)
        const success = await downloadImage(cleanUrl, destImgPath)
        if (success) {
          finalMarkdown = finalMarkdown.replace(match[0], `![${alt}](${relativePath})`)
          inlineImgIndex++
        }
      }

      const descriptionText = cleanDescriptionMarkdown(finalMarkdown)

      // Sanitize raw MDX-breaking elements
      const cleanMarkdown = finalMarkdown
        .replace(/୨>0<୧/g, "୨&gt;0&lt;୧")
        .replace(/<--/g, "&lt;--")
        .replace(/-->/g, "--&gt;")
        .replace(/></g, "&gt;&lt;")

      const mdxContent = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${descriptionText.replace(/"/g, '\\"')}"
publishDate: "${formattedDate}"
author: "lovelie-light"
tags: ["quora-sync"]
sourceUrl: "${url}"
${coverPath ? `cover: "${coverPath}"` : ""}
---

${cleanMarkdown}
`

      fs.writeFileSync(filePath, mdxContent, "utf8")
      console.log(`[API Import] Sukses membuat file artikel: ${filePath}`)
      await browser.close()

      return new Response(
        JSON.stringify({ success: true, slug, title }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )

    } catch (innerErr: any) {
      await browser.close()
      throw innerErr
    }

  } catch (err: any) {
    console.error(`[API Import] Gagal melakukan impor: ${err.message}`)
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Gagal mengimpor artikel dari Quora." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

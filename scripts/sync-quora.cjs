const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Simple slugify helper
function slugify(text) {
  const s = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return s.slice(0, 80).replace(/-+$/, '');
}

// Simple HTML to plain text cleaner for description
function cleanDescription(html) {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 150) + (text.length > 150 ? '...' : '');
}

// MDX requires all void elements like <img>, <br>, <hr> to be self-closed
function makeMdxSafe(html) {
  if (!html) return '';
  return html
    // Remove existing self-closing slashes temporarily to prevent duplicate slashes, then add them back cleanly
    .replace(/<img([^>]*)\/>/g, '<img$1>')
    .replace(/<img([^>]*)>/g, '<img$1 />')
    
    .replace(/<br([^>]*)\/>/g, '<br$1>')
    .replace(/<br([^>]*)>/g, '<br$1 />')
    
    .replace(/<hr([^>]*)\/>/g, '<hr$1>')
    .replace(/<hr([^>]*)>/g, '<hr$1 />')
    
    // Remove any HTML comments
    .replace(/<!--[\s\S]*?-->/g, '');
}

// Simple Markdown to plain text cleaner for description
function cleanDescriptionMarkdown(md) {
  if (!md) return '';
  const text = md
    .replace(/[#*_\-[\]()!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 150) + (text.length > 150 ? '...' : '');
}

// Helper to download an image using the native Node fetch API
async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(destPath, buffer);
      return true;
    }
    console.error(`Gagal mengunduh gambar dari ${url}, HTTP status: ${res.status}`);
    return false;
  } catch (err) {
    console.error(`Gagal mengunduh gambar ${url}: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Memulai browser virtual untuk menyinkronkan Quora Space...');
  
  const apiKey = process.env.ZYTE_API_KEY;
  const args = ['--no-sandbox', '--disable-setuid-sandbox'];
  
  if (apiKey) {
    console.log('Menggunakan Zyte Smart Proxy Manager untuk bypass Cloudflare...');
    args.push('--proxy-server=http://spm.zyte.com:8010');
  } else {
    console.log('PENTING: ZYTE_API_KEY tidak terdeteksi. Berjalan dalam mode standar (rentan terblokir Cloudflare di server/Codespace).');
  }

  // Launch Puppeteer browser in headless mode
  const browser = await puppeteer.launch({
    headless: 'new',
    args: args
  });

  try {
    const page = await browser.newPage();
    if (apiKey) {
      await page.authenticate({
        username: apiKey,
        password: ''
      });
    }
    
    // Set custom user agent to look like a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Load saved cookies if they exist to bypass login wall and load older posts
    const cookiePath = path.join(__dirname, 'quora_cookies.json');
    if (fs.existsSync(cookiePath)) {
      console.log('Memuat cookies sesi dari scripts/quora_cookies.json...');
      const cookiesString = fs.readFileSync(cookiePath, 'utf8');
      const cookies = JSON.parse(cookiesString);
      await page.setCookie(...cookies);
      console.log('Cookies sesi berhasil diterapkan ke browser.');
    } else {
      console.log('PENTING: scripts/quora_cookies.json tidak ditemukan. Sinkronisasi berjalan tanpa sesi login.');
    }
    
    const spaces = [
      { url: 'https://sekalaniskalauniverse.quora.com/', base: 'sekalaniskalauniverse.quora.com/' },
      { url: 'https://waroengpodjokmangkoes.quora.com/', base: 'waroengpodjokmangkoes.quora.com/' }
    ];
    
    let allUniqueUrls = [];
    
    for (const space of spaces) {
      console.log(`\n===============================================`);
      console.log(`Membuka halaman Quora Space: ${space.url}...`);
      try {
        await page.goto(space.url, { waitUntil: 'networkidle2', timeout: 35000 });
      } catch (e) {
        console.log('Menunggu halaman selesai dimuat...');
      }
      
      // Wait an extra 5 seconds to ensure client-side React feed renders
      await new Promise(resolve => setTimeout(resolve, 5000));

      const pageTitle = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(`Halaman dimuat dengan judul: "${pageTitle}" (Panjang Teks: ${bodyText.length})`);
      
      if (bodyText.includes('Cloudflare') || pageTitle.includes('Cloudflare') || pageTitle.includes('Attention Required')) {
        console.log('PERINGATAN: Diduga terblokir oleh proteksi Cloudflare.');
      }

      // Gulir halaman untuk memuat postingan lama (Infinite Scroll)
      console.log(`Menggulir (scrolling) halaman ${space.url} untuk memuat seluruh tulisan lama...`);
      let previousUrlCount = 0;
      let noNewUrlsCount = 0;
      let uniqueUrls = [];
      
      // Kita lakukan scroll maksimal 150 kali untuk memuat seluruh postingan historis
      for (let i = 0; i < 150; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 2);
        });
        // Beri jeda agar Quora memuat konten baru via Virtual DOM
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUrls = await page.evaluate((baseDomain) => {
          const links = Array.from(document.querySelectorAll('a'));
          return links
            .map(a => a.href)
            .filter(href => {
              if (!href) return false;
              const cleanUrl = href.split('?')[0];
              return cleanUrl.includes(baseDomain) && 
                     !cleanUrl.includes('/about') && 
                     !cleanUrl.includes('/followers') &&
                     !cleanUrl.includes('/submissions') &&
                     !cleanUrl.includes('/log') &&
                     !cleanUrl.includes('/comment/') &&
                     cleanUrl !== 'https://' + baseDomain &&
                     cleanUrl !== 'http://' + baseDomain &&
                     cleanUrl !== 'https://' + baseDomain + '/' &&
                     cleanUrl !== 'http://' + baseDomain + '/';
            })
            .map(href => href.split('?')[0]);
        }, space.base);
        
        uniqueUrls = [...new Set(currentUrls)];
        console.log(`Guliran #${i + 1}: Menemukan ${uniqueUrls.length} artikel unik.`);
        
        if (uniqueUrls.length === previousUrlCount) {
          noNewUrlsCount++;
          // Jika dalam 10 kali scroll berturut-turut jumlah URL tidak bertambah, berarti sudah mencapai ujung halaman secara mutlak
          if (noNewUrlsCount >= 10) {
            console.log('Jumlah postingan tidak bertambah lagi setelah 10 kali scroll. Menghentikan scrolling.');
            break;
          }
        } else {
          noNewUrlsCount = 0;
        }
        previousUrlCount = uniqueUrls.length;
      }
      
      allUniqueUrls.push(...uniqueUrls);
    }
    
    const uniqueUrls = [...new Set(allUniqueUrls)];
    console.log(`\n===============================================`);
    console.log(`Total seluruh artikel unik dari semua Space yang disinkronisasikan: ${uniqueUrls.length}`);
    console.log(`===============================================\n`);

    const articlesDir = path.join(__dirname, '../src/content/artikel');
    const publicImagesDir = path.join(__dirname, '../public/images/artikel');

    if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
    if (!fs.existsSync(publicImagesDir)) fs.mkdirSync(publicImagesDir, { recursive: true });

    let newCount = 0;

    for (const postUrl of uniqueUrls) {
      console.log(`\n-----------------------------------------------`);
      console.log(`Memproses artikel: ${postUrl}...`);
      
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!success && attempts < maxAttempts) {
        attempts++;
        if (attempts > 1) {
          console.log(`[Percobaan #${attempts}] Mencoba ulang ${postUrl}...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const newPage = await browser.newPage();
        if (apiKey) {
          await newPage.authenticate({
            username: apiKey,
            password: ''
          });
        }
        await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        if (fs.existsSync(cookiePath)) {
          const cookiesString = fs.readFileSync(cookiePath, 'utf8');
          const cookies = JSON.parse(cookiesString);
          await newPage.setCookie(...cookies);
        }
        
        try {
          await newPage.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await newPage.waitForSelector('.qu-userSelect--text, article', { timeout: 20000 });
        
        // Retrieve and clean document title for reliable, non-obfuscated post title
        let rawTitle = await newPage.title();
        let title = rawTitle
          .replace(/ - Sekala Niskala Universe \(SNU\) - Quora$/i, '')
          .replace(/ - Sekala Niskala Universe - Quora$/i, '')
          .replace(/ - Sekala Niskala Universe \(SNU\)$/i, '')
          .replace(/ - Sekala Niskala Universe$/i, '')
          .replace(/ - Quora$/i, '')
          .trim();

        const postData = await newPage.evaluate(() => {
          const contentEl = document.querySelector('.qu-userSelect--text') || 
                            document.querySelector('.q-text.qu-userSelect--text') ||
                            document.querySelector('article') ||
                            document.querySelector('.q-box.qu-userSelect--text');
          
          if (!contentEl) return null;

          function wrapMarkdown(text, wrapper) {
            const trimmed = text.trim();
            if (!trimmed) return text;
            const leading = text.match(/^\s*/)[0];
            const trailing = text.match(/\s*$/)[0];
            if (trimmed.startsWith(wrapper) && trimmed.endsWith(wrapper)) {
              return text;
            }
            return `${leading}${wrapper}${trimmed}${wrapper}${trailing}`;
          }

          function toMarkdown(node) {
            if (node.nodeType === 3) { // Text node
              return node.textContent;
            }
            if (node.nodeType !== 1) { // Element node
              return '';
            }

            const tagName = node.tagName.toLowerCase();
            
            if (tagName === 'style' || tagName === 'script') {
              return '';
            }

            let childrenMarkdown = '';
            for (const child of node.childNodes) {
              childrenMarkdown += toMarkdown(child);
            }

            switch (tagName) {
              case 'p':
                if (!childrenMarkdown.trim()) return '';
                return '\n\n' + childrenMarkdown.trim() + '\n\n';
              case 'span':
                const weight = node.style.fontWeight || '';
                const style = node.style.fontStyle || '';
                let text = childrenMarkdown;
                if (weight === 'bold' || weight === '700') {
                  text = wrapMarkdown(text, '**');
                }
                if (style === 'italic') {
                  text = wrapMarkdown(text, '*');
                }
                return text;
              case 'b':
              case 'strong':
                return wrapMarkdown(childrenMarkdown, '**');
              case 'i':
              case 'em':
                return wrapMarkdown(childrenMarkdown, '*');
              case 'u':
                return childrenMarkdown;
              case 'h1':
                return '\n\n# ' + childrenMarkdown.trim() + '\n\n';
              case 'h2':
                return '\n\n## ' + childrenMarkdown.trim() + '\n\n';
              case 'h3':
                return '\n\n### ' + childrenMarkdown.trim() + '\n\n';
              case 'h4':
              case 'h5':
              case 'h6':
                return '\n\n#### ' + childrenMarkdown.trim() + '\n\n';
              case 'blockquote':
                return '\n\n> ' + childrenMarkdown.trim().split('\n').map(line => line.trim()).join('\n> ') + '\n\n';
              case 'ul':
                return '\n\n' + childrenMarkdown.trim() + '\n\n';
              case 'ol':
                return '\n\n' + childrenMarkdown.trim() + '\n\n';
              case 'li':
                return '\n- ' + childrenMarkdown.trim();
              case 'a':
                const href = node.getAttribute('href') || '';
                if (href) {
                  return ` [${childrenMarkdown.trim() || href}](${href}) `;
                }
                return childrenMarkdown;
              case 'img':
                const src = node.getAttribute('src') || '';
                const alt = node.getAttribute('alt') || '';
                if (src) {
                  return `\n\n![${alt || 'image'}](${src})\n\n`;
                }
                return '';
              case 'br':
                return '\n';
              case 'div':
                if (node.classList.contains('QTextBlockQuote___StyledAbsolute-sc-21084cfb-0')) {
                  return '';
                }
                return childrenMarkdown;
              default:
                return childrenMarkdown;
            }
          }

          let markdown = toMarkdown(contentEl);
          
          // Post-processing cleanup for spacing
          markdown = markdown
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          const dateEl = document.querySelector('.q-text.qu-color--gray_light');
          const dateStr = dateEl ? dateEl.textContent.trim() : '';

          return { markdown, dateStr };
        });

        if (!postData || !postData.markdown) {
          throw new Error("Gagal mengekstrak konten atau markdown kosong.");
        }

        // Fallback title if empty
        if (!title) {
          const text = postData.markdown.replace(/[#*_\-[\]()!]/g, ' ').replace(/\s+/g, ' ').trim();
          title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
        }

        const slug = slugify(title);
        const filePath = path.join(articlesDir, `${slug}.mdx`);

        // Check if article already exists and whether it is a truncated one
        let exists = fs.existsSync(filePath);
        let isTruncated = false;
        if (exists) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          if (fileContent.includes('PolitePaul') || fileContent.length < 1500) {
            isTruncated = true;
          }
        }

        if (exists && !isTruncated) {
          console.log(`[Terlewati] Artikel sudah ada dan lengkap: ${title}`);
          success = true;
          break;
        }

        if (isTruncated) {
          console.log(`[Pembaruan] Menimpa artikel terpotong (PolitePaul) dengan teks lengkap: ${title}`);
        }

        // Format Date (default to today if parsing fails)
        let formattedDate = new Date().toISOString().split('T')[0];
        if (postData.dateStr) {
          try {
            const cleanDateStr = postData.dateStr.replace(/Updated|Posted/i, '').trim();
            const d = new Date(cleanDateStr);
            if (!isNaN(d.getTime())) {
              formattedDate = d.toISOString().split('T')[0];
            }
          } catch (e) {}
        }

        // Handle cover image
        let coverPath = '';
        const imgUrl = await newPage.evaluate(() => {
          const firstImg = document.querySelector('.qu-userSelect--text img');
          return firstImg ? firstImg.src : '';
        });

        if (imgUrl && imgUrl.startsWith('http')) {
          let imgExt = 'jpg';
          const urlWithoutQuery = imgUrl.split('?')[0].split('#')[0];
          const lastSlashIndex = urlWithoutQuery.lastIndexOf('/');
          const lastPart = urlWithoutQuery.substring(lastSlashIndex + 1);
          if (lastPart.includes('.')) {
            const parts = lastPart.split('.');
            imgExt = parts[parts.length - 1];
          }

          const shortSlug = slug.slice(0, 50).replace(/-+$/, '');
          const imgName = `cover-${shortSlug}.${imgExt}`;
          const destImgPath = path.join(publicImagesDir, imgName);

          try {
            console.log(`Mengunduh gambar sampul: ${imgUrl}...`);
            const res = await fetch(imgUrl);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              fs.writeFileSync(destImgPath, buffer);
              coverPath = `../../../public/images/artikel/${imgName}`;
            } else {
              console.error(`Gagal mengunduh gambar, HTTP status: ${res.status}`);
            }
          } catch (err) {
            console.error(`Gagal mengunduh gambar sampul: ${err.message}`);
          }
        }

        const descriptionText = cleanDescriptionMarkdown(postData.markdown);

        // Download all inline images from markdown
        const imgRegex = /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g;
        let match;
        let finalMarkdown = postData.markdown;
        let inlineImgIndex = 1;

        // Reset regex state
        imgRegex.lastIndex = 0;

        while ((match = imgRegex.exec(postData.markdown)) !== null) {
          const alt = match[1];
          const fullUrl = match[2];

          // Clean URL from query parameters and hash
          const cleanUrl = fullUrl.split('?')[0].split('#')[0];
          let imgExt = 'jpg';
          const lastSlashIndex = cleanUrl.lastIndexOf('/');
          const lastPart = cleanUrl.substring(lastSlashIndex + 1);
          if (lastPart.includes('.')) {
            const parts = lastPart.split('.');
            imgExt = parts[parts.length - 1];
            if (imgExt.toLowerCase() === 'jpeg') imgExt = 'jpg';
            imgExt = imgExt.split(/[?#]/)[0];
          }

          const shortSlug = slug.slice(0, 50).replace(/-+$/, '');
          const imgName = `content-${shortSlug}-${inlineImgIndex}.${imgExt}`;
          const destImgPath = path.join(publicImagesDir, imgName);
          const relativePath = `/images/artikel/${imgName}`;

          console.log(`Mengunduh gambar konten: ${cleanUrl}...`);
          const success = await downloadImage(cleanUrl, destImgPath);
          if (success) {
            finalMarkdown = finalMarkdown.replace(match[0], `![${alt}](${relativePath})`);
            inlineImgIndex++;
          }
        }

        const cleanMarkdown = finalMarkdown
          .replace(/୨>0<୧/g, '୨&gt;0&lt;୧')
          .replace(/<--/g, '&lt;--')
          .replace(/-->/g, '--&gt;')
          .replace(/></g, '&gt;&lt;');
        const mdxContent = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${descriptionText.replace(/"/g, '\\"')}"
publishDate: "${formattedDate}"
author: "lovelie-light"
tags: ["quora-sync"]
sourceUrl: "${postUrl}"
${coverPath ? `cover: "${coverPath}"` : ''}
---

${cleanMarkdown}
`;

        fs.writeFileSync(filePath, mdxContent, 'utf8');
        console.log(`[Sukses] Sinkronisasi artikel lengkap: ${title}`);
        newCount++;
        success = true;

      } catch (err) {
        console.error(`Gagal memproses artikel ${postUrl} (Percobaan ${attempts}/${maxAttempts}): ${err.message}`);
        if (attempts >= maxAttempts) {
          console.error(`[GAGAL PERMANEN] Melewati artikel ${postUrl} setelah ${maxAttempts} percobaan.`);
        }
      } finally {
        await newPage.close();
      }
    }
  }

    console.log(`\n===============================================`);
    console.log(`Sinkronisasi selesai! Berhasil menambahkan/memperbarui ${newCount} artikel baru dengan teks lengkap.`);

  } catch (err) {
    console.error(`Gagal melakukan sinkronisasi: ${err.message}`);
  } finally {
    await browser.close();
  }
}

run();

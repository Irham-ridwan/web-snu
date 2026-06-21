const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to find the feed URL from config.ts
function getFeedUrl() {
  try {
    const configPath = path.join(__dirname, '../src/config.ts');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/export const QUORA_RSS_FEED_URL = ["']([^"']+)["']/);
      if (match) return match[1];
    }
  } catch (e) {
    console.error('Gagal membaca config.ts:', e);
  }
  return null;
}

// Simple slugify helper
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

// Simple HTML tag removal for description
function cleanDescription(html) {
  return html
    .replace(/<[^>]*>/g, '') // strip tags
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150) + '...';
}

// Download image helper
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode}`));
        return;
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Fetch RSS XML
function fetchFeed(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const feedUrl = getFeedUrl();
  if (!feedUrl || feedUrl.includes('example.xml')) {
    console.error('Error: Silakan atur URL RSS Feed Quora asli di src/config.ts terlebih dahulu.');
    process.exit(1);
  }

  console.log(`Mengambil feed dari: ${feedUrl}...`);
  try {
    const xml = await fetchFeed(feedUrl);
    
    // Parse items using regex (very robust for standard RSS)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let newArticlesCount = 0;

    const articlesDir = path.join(__dirname, '../src/content/artikel');
    if (!fs.existsSync(articlesDir)) {
      fs.mkdirSync(articlesDir, { recursive: true });
    }

    const publicImagesDir = path.join(__dirname, '../public/images/artikel');
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
    }

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      
      let title = (itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || 
                   itemContent.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
      title = title.trim();

      let link = (itemContent.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
      link = link.trim();

      let pubDate = (itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
      
      let content = (itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) ||
                     itemContent.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/) ||
                     itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
                     itemContent.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
      content = content.trim();

      if (!title || !content) continue;

      // Extract pubDate and format to YYYY-MM-DD
      let formattedDate = new Date().toISOString().split('T')[0];
      if (pubDate) {
        try {
          const d = new Date(pubDate);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toISOString().split('T')[0];
          }
        } catch (e) {}
      }

      const slug = slugify(title);
      const filePath = path.join(articlesDir, `${slug}.mdx`);

      if (fs.existsSync(filePath)) {
        console.log(`[Terlewati] Artikel sudah ada: ${title}`);
        continue;
      }

      // Try to extract the first image in description/content to use as cover
      let coverPath = '';
      const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
      if (imgMatch) {
        const imgUrl = imgMatch[1];
        const imgExt = imgUrl.split('.').pop().split(/[?#]/)[0] || 'jpg';
        const imgName = `cover-${slug}.${imgExt}`;
        const destImgPath = path.join(publicImagesDir, imgName);
        
        try {
          console.log(`Mengunduh gambar sampul: ${imgUrl}...`);
          await downloadImage(imgUrl, destImgPath);
          coverPath = `../../../public/images/artikel/${imgName}`;
        } catch (e) {
          console.error(`Gagal mengunduh gambar sampul: ${e.message}`);
        }
      }

      const descriptionText = cleanDescription(content);
      
      const fileContent = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${descriptionText.replace(/"/g, '\\"')}"
publishDate: "${formattedDate}"
author: "lovelie-light"
tags: ["quora-sync"]
sourceUrl: "${link}"
${coverPath ? `cover: "${coverPath}"` : ''}
---

${content}
`;

      fs.writeFileSync(filePath, fileContent, 'utf8');
      console.log(`[Baru] Sinkronisasi artikel: ${title} -> ${slug}.mdx`);
      newArticlesCount++;
    }

    console.log(`\nSinkronisasi selesai! Berhasil menyinkronkan ${newArticlesCount} artikel baru.`);
  } catch (err) {
    console.error('Gagal mengambil atau memproses feed:', err);
  }
}

run();

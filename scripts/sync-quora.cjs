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

// MDX requires all void elements like <img>, <br>, <hr> to be self-closed
function makeMdxSafe(html) {
  if (!html) return '';
  return html
    .replace(/<img([^>]*)\/>/g, '<img$1>')
    .replace(/<img([^>]*)>/g, '<img$1 />')
    
    .replace(/<br([^>]*)\/>/g, '<br$1>')
    .replace(/<br([^>]*)>/g, '<br$1 />')
    
    .replace(/<hr([^>]*)\/>/g, '<hr$1>')
    .replace(/<hr([^>]*)>/g, '<hr$1 />')
    
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

// Robust helper to parse Quora date string into YYYY-MM-DD
function parseQuoraDate(dateStr, baseDate = new Date()) {
  if (!dateStr) return baseDate.toISOString().split('T')[0];
  
  let clean = dateStr.replace(/Updated|Posted|Diperbarui|Ditulis/gi, '').trim().toLowerCase();
  if (!clean) return baseDate.toISOString().split('T')[0];
  
  const d = new Date(baseDate);

  // Match relative formats like "9bln", "1thn", "3minggu", "4hari", "5jam", "10mnt", "9mo", "1y", "3w", "4d", "5h", "10m"
  const relativeMatch = clean.match(/^(\d+)\s*(thn|y|year|years|bln|mo|month|months|minggu|wk|w|week|weeks|hari|d|day|days|jam|h|hour|hours|mnt|m|min|minute|minutes|detik|s|sec|second|seconds)?(?:\s*lalu|\s*ago)?$/i);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2] ? relativeMatch[2].toLowerCase() : '';
    
    if (unit.startsWith('thn') || unit === 'y' || unit.startsWith('year')) {
      d.setFullYear(d.getFullYear() - value);
    } else if (unit.startsWith('bln') || unit === 'mo' || unit.startsWith('month')) {
      d.setMonth(d.getMonth() - value);
    } else if (unit.startsWith('minggu') || unit === 'w' || unit === 'wk' || unit.startsWith('week')) {
      d.setDate(d.getDate() - (value * 7));
    } else if (unit.startsWith('hari') || unit === 'd' || unit.startsWith('day')) {
      d.setDate(d.getDate() - value);
    } else if (unit.startsWith('jam') || unit === 'h' || unit.startsWith('hour')) {
      d.setHours(d.getHours() - value);
    } else if (unit.startsWith('mnt') || unit === 'm' || unit.startsWith('min') || unit.startsWith('minute')) {
      d.setMinutes(d.getMinutes() - value);
    } else if (unit.startsWith('detik') || unit === 's' || unit.startsWith('sec') || unit.startsWith('second')) {
      d.setSeconds(d.getSeconds() - value);
    }
    return d.toISOString().split('T')[0];
  }

  // Handle day names like "Sab", "Jum", "Sat", "Fri" (relative to current week)
  const daysMap = {
    min: 0, minggu: 0, sun: 0, sunday: 0,
    sen: 1, senin: 1, mon: 1, monday: 1,
    sel: 2, selasa: 2, tue: 2, tuesday: 2,
    rab: 3, rabu: 3, wed: 3, wednesday: 3,
    kam: 4, kamis: 4, thu: 4, thursday: 4,
    jum: 5, jumat: 5, fri: 5, friday: 5,
    sab: 6, sabtu: 6, sat: 6, saturday: 6
  };
  if (daysMap[clean] !== undefined) {
    const targetDay = daysMap[clean];
    const currentDay = d.getDay();
    let diff = currentDay - targetDay;
    if (diff <= 0) {
      diff += 7;
    }
    d.setDate(d.getDate() - diff);
    return d.toISOString().split('T')[0];
  }

  const monthMap = {
    jan: 0, janari: 0, january: 0,
    feb: 1, peb: 1, februari: 1, february: 1,
    mar: 2, maret: 2, march: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5, june: 5,
    jul: 6, juli: 6, july: 6,
    agt: 7, aug: 7, agustus: 7, august: 7,
    sep: 8, september: 8,
    okt: 9, oct: 9, oktober: 9, october: 9,
    nov: 10, november: 10,
    des: 11, dec: 11, desember: 11, december: 11
  };

  const tokens = clean.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) {
    let day = null;
    let month = null;
    let year = baseDate.getFullYear();

    const token0Lower = tokens[0].toLowerCase();
    const token1Lower = tokens[1].toLowerCase();

    if (monthMap[token0Lower] !== undefined) {
      month = monthMap[token0Lower];
      day = parseInt(tokens[1], 10);
    } else if (monthMap[token1Lower] !== undefined) {
      month = monthMap[token1Lower];
      day = parseInt(tokens[0], 10);
    }

    if (month !== null && !isNaN(day)) {
      if (tokens[2]) {
        const parsedYear = parseInt(tokens[2], 10);
        if (!isNaN(parsedYear) && parsedYear > 2000) {
          year = parsedYear;
        }
      } else {
        const testDate = new Date(year, month, day);
        if (testDate > baseDate) {
          year -= 1;
        }
      }
      const finalDate = new Date(year, month, day);
      if (!isNaN(finalDate.getTime())) {
        return finalDate.toISOString().split('T')[0];
      }
    }
  }

  try {
    const standardDate = new Date(clean);
    if (!isNaN(standardDate.getTime())) {
      return standardDate.toISOString().split('T')[0];
    }
  } catch (e) {}

  return baseDate.toISOString().split('T')[0];
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
  console.log('Memulai browser virtual untuk menyinkronkan Quora Space (Mode Hibrid)...');
  
  const apiKey = process.env.ZYTE_API_KEY;
  const args = ['--no-sandbox', '--disable-setuid-sandbox'];
  
  if (apiKey) {
    console.log('Menggunakan Zyte Smart Proxy Manager untuk bypass Cloudflare...');
    args.push('--proxy-server=http://spm.zyte.com:8010');
  } else {
    console.log('PENTING: ZYTE_API_KEY tidak terdeteksi. Berjalan dalam mode standar (rentan terblokir Cloudflare di server/Codespace).');
  }

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
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Load saved cookies
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
    const urlToDateMap = {};
    
    for (const space of spaces) {
      console.log(`\n===============================================`);
      console.log(`Membuka halaman Quora Space: ${space.url}...`);
      try {
        await page.goto(space.url, { waitUntil: 'networkidle2', timeout: 35000 });
      } catch (e) {
        console.log('Menunggu halaman selesai dimuat...');
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));

      const pageTitle = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log(`Halaman dimuat dengan judul: "${pageTitle}" (Panjang Teks: ${bodyText.length})`);
      
      if (bodyText.includes('Cloudflare') || pageTitle.includes('Cloudflare') || pageTitle.includes('Attention Required')) {
        console.log('PERINGATAN: Diduga terblokir oleh proteksi Cloudflare.');
      }

      // Scroll halaman lebih dalam (160 kali scroll) untuk memuat sebanyak mungkin feed historis
      console.log(`Menggulir (scrolling) halaman ${space.url} untuk memetakan penanggalan feed...`);
      let previousUrlCount = 0;
      let noNewUrlsCount = 0;
      let uniqueUrls = [];
      
      for (let i = 0; i < 160; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight * 2);
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Singkirkan popup modal Quora login yang sesekali muncul
        await page.evaluate(() => {
          const overlays = document.querySelectorAll('.qu-bg--black_alpha_60, .qu-zIndex--modal, [class*="Modal"], [class*="Overlay"]');
          overlays.forEach(el => el.remove());
          document.body.style.overflow = 'auto';
        });

        const feedEntries = await page.evaluate((baseDomain) => {
          const anchors = Array.from(document.querySelectorAll('a'));
          const results = [];
          
          anchors.forEach(a => {
            const href = a.href || '';
            if (!href) return;
            const cleanUrl = href.split('?')[0];
            
            if (cleanUrl.includes(baseDomain) && 
                !cleanUrl.includes('/about') && 
                !cleanUrl.includes('/followers') &&
                !cleanUrl.includes('/submissions') &&
                !cleanUrl.includes('/log') &&
                !cleanUrl.includes('/comment/') &&
                cleanUrl !== 'https://' + baseDomain &&
                cleanUrl !== 'http://' + baseDomain &&
                cleanUrl !== 'https://' + baseDomain + '/' &&
                cleanUrl !== 'http://' + baseDomain + '/') {
              
              // Cari dateStr
              let dateStr = '';
              let parent = a.parentElement;
              for (let dDepth = 0; dDepth < 8; dDepth++) {
                if (!parent) break;
                const tsEl = parent.querySelector('.post_timestamp');
                if (tsEl) {
                  dateStr = tsEl.textContent.trim();
                  break;
                }
                parent = parent.parentElement;
              }
              
              if (!dateStr && a.parentElement) {
                const grayTexts = Array.from(a.parentElement.querySelectorAll('.qu-color--gray, .qu-color--gray_light, span, a'));
                for (const el of grayTexts) {
                  const text = el.textContent.trim();
                  if (text.includes('Diperbarui') || text.includes('Ditulis') || text.includes('Updated') || text.includes('Posted') || /^\d+(bln|thn|jam|mnt|mo|y|w|d|h)/.test(text)) {
                    dateStr = text;
                    break;
                  }
                }
              }
              
              results.push({ url: cleanUrl, dateStr });
            }
          });
          
          return results;
        }, space.base);
        
        feedEntries.forEach(item => {
          if (item.dateStr) {
            urlToDateMap[item.url] = item.dateStr;
          }
        });
        
        const currentUrls = feedEntries.map(item => item.url);
        uniqueUrls = [...new Set(currentUrls)];
        
        if (i % 20 === 0 || i === 159) {
          console.log(`Guliran #${i + 1}: Terdeteksi ${uniqueUrls.length} artikel unik di DOM.`);
        }
        
        if (uniqueUrls.length === previousUrlCount && uniqueUrls.length > 50) {
          noNewUrlsCount++;
          if (noNewUrlsCount >= 15) {
            console.log('Jumlah postingan tidak bertambah setelah 15 kali scroll. Selesai scrolling untuk Space ini.');
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
    console.log(`Total seluruh artikel unik yang ditemukan di feed: ${uniqueUrls.length}`);
    console.log(`Total entri dalam peta tanggal (urlToDateMap): ${Object.keys(urlToDateMap).length}`);
    console.log(`===============================================\n`);

    const articlesDir = path.join(__dirname, '../src/content/artikel');
    const publicImagesDir = path.join(__dirname, '../public/images/artikel');

    if (!fs.existsSync(articlesDir)) fs.mkdirSync(articlesDir, { recursive: true });
    if (!fs.existsSync(publicImagesDir)) fs.mkdirSync(publicImagesDir, { recursive: true });

    // FASE 1: PERBAIKAN LOKAL SECARA INSTAN (HYBRID)
    console.log('--- FASE 1: Menjalankan Perbaikan Tanggal Lokal Instan ---');
    const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.mdx'));
    let localFixCount = 0;
    const fallbackUrls = [];

    files.forEach(file => {
      const filePath = path.join(articlesDir, file);
      let fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Ambil sourceUrl and publishDate dari frontmatter
      const sourceUrlMatch = fileContent.match(/sourceUrl:\s*"([^"]+)"/);
      const dateMatch = fileContent.match(/publishDate:\s*"([^"]+)"/);
      
      if (sourceUrlMatch && dateMatch) {
        const sourceUrl = sourceUrlMatch[1];
        const currentDate = dateMatch[1];
        
        // Kita perbaiki HANYA jika tanggal saat ini bermasalah (Juni 2026)
        if (currentDate.startsWith('2026-06')) {
          const feedDateStr = urlToDateMap[sourceUrl];
          if (feedDateStr) {
            const newDate = parseQuoraDate(feedDateStr);
            if (newDate && newDate !== currentDate) {
              const updatedContent = fileContent.replace(/(publishDate:\s*")([^"]+)(")/, `$1${newDate}$3`);
              fs.writeFileSync(filePath, updatedContent, 'utf8');
              console.log(`[Lokal Fix] Berhasil memperbaiki tanggal ${file}: ${currentDate} -> ${newDate} (dari: "${feedDateStr}")`);
              localFixCount++;
              return;
            }
          }
          // Jika tanggal salah tetapi tidak ditemukan di feed map, masukkan ke antrean scraping individu
          fallbackUrls.push(sourceUrl);
        }
      }
    });

    console.log(`\nFase 1 Selesai! Berhasil memperbaiki ${localFixCount} artikel secara instan di lokal.`);
    console.log(`Terdapat ${fallbackUrls.length} artikel dengan tanggal salah yang perlu diambil secara individual via fallback.\n`);

    // Tambahkan juga semua URL feed yang BELUM memiliki file MDX sama sekali ke antrean
    const newArticles = uniqueUrls.filter(url => {
      // Periksa apakah ada file MDX dengan sourceUrl ini
      const isExist = files.some(file => {
        const fileContent = fs.readFileSync(path.join(articlesDir, file), 'utf8');
        return fileContent.includes(`sourceUrl: "${url}"`);
      });
      return !isExist;
    });

    console.log(`Menemukan ${newArticles.length} artikel baru di feed yang belum pernah diimpor.`);
    
    // Gabungkan antrean scraping: fallback + artikel baru
    const crawlQueue = [...new Set([...fallbackUrls, ...newArticles])];
    console.log(`Total antrean scraping individu (baru + fallback): ${crawlQueue.length}`);
    console.log(`===============================================\n`);

    let newCount = 0;
    let queueIdx = 0;

    for (const postUrl of crawlQueue) {
      queueIdx++;
      console.log(`\n[Queue ${queueIdx}/${crawlQueue.length}] Memproses artikel secara mendalam: ${postUrl}...`);
      
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
              if (node.nodeType === 3) return node.textContent;
              if (node.nodeType !== 1) return '';

              const tagName = node.tagName.toLowerCase();
              if (tagName === 'style' || tagName === 'script') return '';

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
                  if (weight === 'bold' || weight === '700') text = wrapMarkdown(text, '**');
                  if (style === 'italic') text = wrapMarkdown(text, '*');
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
                  if (href) return ` [${childrenMarkdown.trim() || href}](${href}) `;
                  return childrenMarkdown;
                case 'img':
                  const src = node.getAttribute('src') || '';
                  const alt = node.getAttribute('alt') || '';
                  if (src) return `\n\n![${alt || 'image'}](${src})\n\n`;
                  return '';
                case 'br':
                  return '\n';
                case 'div':
                  if (node.classList.contains('QTextBlockQuote___StyledAbsolute-sc-21084cfb-0')) return '';
                  return childrenMarkdown;
                default:
                  return childrenMarkdown;
              }
            }

            let markdown = toMarkdown(contentEl);
            markdown = markdown.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

            const dateEl = document.querySelector('.post_timestamp');
            let dateStr = '';
            if (dateEl) {
              dateStr = dateEl.textContent.trim();
            } else {
              const currentPath = window.location.pathname;
              const fallbackAnchor = Array.from(document.querySelectorAll('a')).find(a => {
                const href = a.getAttribute('href') || '';
                return href.includes(currentPath);
              });
              if (fallbackAnchor) {
                dateStr = fallbackAnchor.textContent.trim();
              } else {
                const grayLight = document.querySelector('.q-text.qu-color--gray_light');
                if (grayLight) dateStr = grayLight.textContent.trim();
              }
            }

            return { markdown, dateStr };
          });

          if (postData && !postData.dateStr && urlToDateMap[postUrl]) {
            postData.dateStr = urlToDateMap[postUrl];
            console.log(`Menggunakan tanggal dari feed map untuk ${postUrl}: ${postData.dateStr}`);
          }

          if (!postData || !postData.markdown) {
            throw new Error("Gagal mengekstrak konten atau markdown kosong.");
          }

          if (!title) {
            const text = postData.markdown.replace(/[#*_\-[\]()!]/g, ' ').replace(/\s+/g, ' ').trim();
            title = text.slice(0, 50) + (text.length > 50 ? '...' : '');
          }

          const slug = slugify(title);
          const filePath = path.join(articlesDir, `${slug}.mdx`);

          const formattedDate = parseQuoraDate(postData.dateStr);

          // Handle cover image
          let coverPath = '';
          let existingCoverPath = '';
          
          if (fs.existsSync(filePath)) {
            const existingMdx = fs.readFileSync(filePath, 'utf8');
            const covMatch = existingMdx.match(/cover:\s*"([^"]+)"/);
            if (covMatch) {
              existingCoverPath = covMatch[1];
              coverPath = existingCoverPath;
            }
          }

          if (!coverPath) {
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
                }
              } catch (err) {
                console.error(`Gagal mengunduh gambar sampul: ${err.message}`);
              }
            }
          }

          const descriptionText = cleanDescriptionMarkdown(postData.markdown);

          let finalMarkdown = postData.markdown;
          if (!fs.existsSync(filePath)) {
            const imgRegex = /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g;
            let match;
            let inlineImgIndex = 1;
            imgRegex.lastIndex = 0;

            while ((match = imgRegex.exec(postData.markdown)) !== null) {
              const alt = match[1];
              const fullUrl = match[2];
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
          console.log(`[Sukses] Sinkronisasi mendalam artikel: ${title} -> Tanggal: ${formattedDate}`);
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
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`\n===============================================`);
    console.log(`Sinkronisasi Hibrid Selesai!`);
    console.log(`- Perbaikan lokal instan: ${localFixCount} artikel.`);
    console.log(`- Sinkronisasi mendalam baru/fallback: ${newCount} artikel.`);
    console.log(`===============================================\n`);

  } catch (err) {
    console.error(`Gagal melakukan sinkronisasi: ${err.message}`);
  } finally {
    await browser.close();
  }
}

run();

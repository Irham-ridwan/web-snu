import asyncio
import json
import os
import re
import urllib.request
import urllib.parse
import datetime
from bs4 import BeautifulSoup
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig

# Define directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(BASE_DIR, 'src/content/artikel')
PUBLIC_IMAGES_DIR = os.path.join(BASE_DIR, 'public/images/artikel')

# Ensure directories exist
os.makedirs(ARTICLES_DIR, exist_ok=True)
os.makedirs(PUBLIC_IMAGES_DIR, exist_ok=True)

# Helper to download images
def download_image(url, dest_path):
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            with open(dest_path, 'wb') as out_file:
                out_file.write(response.read())
        return True
    except Exception as e:
        print(f"Gagal mengunduh gambar {url}: {e}")
        return False

# Clean description for frontmatter
def clean_description(markdown_text):
    if not markdown_text:
        return ""
    text = re.sub(r'[#*_\-\[\]()!>]', ' ', markdown_text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:150] + ('...' if len(text) > 150 else '')

# Slugify title
def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'[^\w\-]', '', text)
    text = re.sub(r'\-+', '-', text)
    return text.strip('-')[:80].rstrip('-')

# Parse date strings from Quora
def parse_date(date_str):
    today = datetime.date.today()
    if not date_str:
        return today.isoformat()
    
    clean = re.sub(r'Updated|Posted|Diperbarui|Ditulis', '', date_str, flags=re.I).strip().lower()
    if not clean:
        return today.isoformat()
        
    # Match relative formats like "9bln", "1thn", "3minggu", "4hari", "5jam", "10mnt", "9mo", "1y", "3w", "4d", "5h", "10m"
    relative_match = re.match(r'^(\d+)\s*(thn|y|year|years|bln|mo|month|months|minggu|wk|w|week|weeks|hari|d|day|days|jam|h|hour|hours|mnt|m|min|minute|minutes|detik|s|sec|second|seconds)?(?:\s*lalu|\s*ago)?$', clean)
    if relative_match:
        val_str, unit = relative_match.groups()
        value = int(val_str)
        unit = unit.lower() if unit else ""
        
        if unit.startswith('thn') or unit == 'y' or unit.startswith('year'):
            return (today - datetime.timedelta(days=value * 365)).isoformat()
        elif unit.startswith('bln') or unit == 'mo' or unit.startswith('month'):
            return (today - datetime.timedelta(days=value * 30)).isoformat()
        elif unit.startswith('minggu') or unit == 'w' or unit == 'wk' or unit.startswith('week'):
            return (today - datetime.timedelta(days=value * 7)).isoformat()
        elif unit.startswith('hari') or unit == 'd' or unit.startswith('day'):
            return (today - datetime.timedelta(days=value)).isoformat()
        elif unit.startswith('jam') or unit == 'h' or unit.startswith('hour'):
            return today.isoformat()
        elif unit.startswith('mnt') or unit == 'm' or unit.startswith('min') or unit.startswith('minute'):
            return today.isoformat()
        elif unit.startswith('detik') or unit == 's' or unit.startswith('sec') or unit.startswith('second'):
            return today.isoformat()
            
    months_map = {
        'jan': 1, 'janari': 1, 'january': 1,
        'feb': 2, 'peb': 2, 'februari': 2, 'february': 2,
        'mar': 3, 'maret': 3, 'march': 3,
        'apr': 4, 'april': 4,
        'mei': 5, 'may': 5,
        'jun': 6, 'juni': 6, 'june': 6,
        'jul': 7, 'juli': 7, 'july': 7,
        'agt': 8, 'aug': 8, 'agustus': 8, 'august': 8,
        'sep': 9, 'september': 9,
        'okt': 10, 'oct': 10, 'oktober': 10, 'october': 10,
        'nov': 11, 'november': 11,
        'des': 12, 'dec': 12, 'desember': 12, 'december': 12
    }
    
    tokens = re.split(r'\s+', clean.replace(',', ' ').strip())
    if len(tokens) >= 2:
        day = None
        month = None
        year = today.year
        
        token0_lower = tokens[0].lower()
        token1_lower = tokens[1].lower()
        
        if token0_lower in months_map:
            month = months_map[token0_lower]
            try:
                day = int(tokens[1])
            except ValueError:
                pass
        elif token1_lower in months_map:
            month = months_map[token1_lower]
            try:
                day = int(tokens[0])
            except ValueError:
                pass
                
        if month is not None and day is not None:
            if len(tokens) >= 3:
                try:
                    parsed_year = int(tokens[2])
                    if parsed_year > 2000:
                        year = parsed_year
                except ValueError:
                    pass
            else:
                try:
                    test_date = datetime.date(year, month, day)
                    if test_date > today:
                        year -= 1
                except Exception:
                    pass
            try:
                return datetime.date(year, month, day).isoformat()
            except Exception:
                pass
                
    return today.isoformat()

# Crawl Space links
async def crawl_space_links(crawler, space_url, cookies):
    # JS code to scroll down, bypass login overlay, and load older posts
    js_scroll = """
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let previousCount = 0;
    let noNewCount = 0;
    
    for (let i = 0; i < 60; i++) {
        window.scrollBy(0, window.innerHeight * 2);
        await delay(2000);
        
        // Remove login overlays
        const overlays = document.querySelectorAll('.qu-bg--black_alpha_60, .qu-zIndex--modal, [class*="Modal"], [class*="Overlay"]');
        overlays.forEach(el => el.remove());
        document.body.style.overflow = 'auto';
        document.documentElement.style.overflow = 'auto';
        
        const count = document.querySelectorAll('a').length;
        if (count === previousCount) {
            noNewCount++;
            if (noNewCount >= 10) break;
        } else {
            noNewCount = 0;
        }
        previousCount = count;
    }
    """
    
    config = CrawlerRunConfig(
        js_code=js_scroll,
        wait_for="body"
    )
    
    print(f"Mengambil tautan dari Space: {space_url}...")
    result = await crawler.arun(
        url=space_url, 
        config=config,
        storage_state={"cookies": cookies} if cookies else None
    )
    
    if not result.success:
        print(f"Gagal crawling Space {space_url}: {result.error_message}")
        return []
        
    internal_links = result.links.get("internal", [])
    external_links = result.links.get("external", [])
    all_links = internal_links + external_links
    
    article_urls = []
    base_domains = ["sekalaniskalauniverse.quora.com", "waroengpodjokmangkoes.quora.com"]
    
    for link in all_links:
        href = link.get("href", "").split('?')[0].split('#')[0]
        if not href:
            continue
            
        # Match base domains
        is_matched = any(domain in href for domain in base_domains)
        if is_matched and not any(x in href for x in ['/about', '/followers', '/submissions', '/log', '/comment/']):
            # Exclude landing pages
            if href not in ["https://sekalaniskalauniverse.quora.com", "https://waroengpodjokmangkoes.quora.com",
                            "http://sekalaniskalauniverse.quora.com", "http://waroengpodjokmangkoes.quora.com",
                            "https://sekalaniskalauniverse.quora.com/", "https://waroengpodjokmangkoes.quora.com/"]:
                article_urls.append(href)
                
    unique_urls = list(set(article_urls))
    print(f"Menemukan {len(unique_urls)} artikel unik dari {space_url}")
    return unique_urls

# Crawl individual post
async def crawl_article(crawler, url, cookies):
    config = CrawlerRunConfig(
        wait_for=".qu-userSelect--text, article"
    )
    
    result = await crawler.arun(
        url=url, 
        config=config,
        storage_state={"cookies": cookies} if cookies else None
    )
    if not result.success:
        print(f"Gagal crawling artikel {url}: {result.error_message}")
        return False
        
    soup = BeautifulSoup(result.html, 'html.parser')
    
    # Extract clean title
    title_raw = soup.title.string if soup.title else ""
    title = title_raw.replace(' - Sekala Niskala Universe (SNU) - Quora', '')\
                     .replace(' - Sekala Niskala Universe - Quora', '')\
                     .replace(' - Sekala Niskala Universe (SNU)', '')\
                     .replace(' - Sekala Niskala Universe', '')\
                     .replace(' - Quora', '')\
                     .replace(' - Waroeng Podjok Mangkoes - Quora', '')\
                     .replace(' - Waroeng Podjok Mangkoes', '')\
                     .strip()
                     
    if not title:
        # Fallback to description-based title
        desc = clean_description(result.markdown)
        title = desc[:50] + ("..." if len(desc) > 50 else "")
        
    slug = slugify(title)
    file_path = os.path.join(ARTICLES_DIR, f"{slug}.mdx")
    
    # Check if article already exists and is complete / has valid date
    needs_update = False
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if "PolitePaul" not in content and len(content) > 1500:
                date_match = re.search(r'publishDate:\s*"([^"]+)"', content)
                if date_match and date_match.group(1).startswith('2026-06'):
                    needs_update = True
                else:
                    print(f"[Terlewati] Artikel sudah ada, lengkap, dan tanggalnya valid: {title}")
                    return True
                    
    if needs_update:
        print(f"[Pembaruan] Memaksa pembaruan tanggal artikel dari Juni 2026 ke tanggal asli Quora: {title}")
                
    print(f"Menyinkronkan artikel: {title}...")
    
    # Get publish date
    date_el = soup.select_one('.post_timestamp')
    if not date_el:
        path = urllib.parse.urlparse(url).path
        date_el = soup.find('a', href=lambda h: h and path in h)
    if not date_el:
        date_el = soup.find(class_=re.compile("qu-color--gray_light"))
        
    date_str = date_el.text.strip() if date_el else ""
    formatted_date = parse_date(date_str)
    
    # Cover image extraction
    cover_url = ""
    first_img_el = soup.select_one('.qu-userSelect--text img, article img')
    if first_img_el and first_img_el.get('src'):
        cover_url = first_img_el.get('src')
        
    cover_path = ""
    if cover_url and cover_url.startswith('http'):
        url_without_query = cover_url.split('?')[0].split('#')[0]
        ext = url_without_query.split('.')[-1]
        if ext.lower() not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
            ext = 'jpg'
        short_slug = slug[:50].rstrip('-')
        img_name = f"cover-{short_slug}.{ext}"
        dest_path = os.path.join(PUBLIC_IMAGES_DIR, img_name)
        
        print(f"Mengunduh gambar sampul: {url_without_query}...")
        if download_image(cover_url, dest_path):
            cover_path = f"../../../public/images/artikel/{img_name}"
            
    # Process inline images in Markdown
    markdown_content = result.markdown
    img_pattern = r'!\[(.*?)\]\((https?://[^)]+)\)'
    inline_img_index = 1
    
    def replace_img(match):
        nonlocal inline_img_index
        alt = match.group(1)
        url = match.group(2)
        clean_url = url.split('?')[0].split('#')[0]
        ext = clean_url.split('.')[-1]
        if ext.lower() not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
            ext = 'jpg'
        if ext.lower() == 'jpeg':
            ext = 'jpg'
            
        short_slug = slug[:50].rstrip('-')
        img_name = f"content-{short_slug}-{inline_img_index}.{ext}"
        dest_path = os.path.join(PUBLIC_IMAGES_DIR, img_name)
        relative_path = f"/images/artikel/{img_name}"
        
        print(f"Mengunduh gambar konten: {clean_url}...")
        if download_image(clean_url, dest_path):
            inline_img_index += 1
            return f"![{alt}]({relative_path})"
        return match.group(0)
        
    final_markdown = re.sub(img_pattern, replace_img, markdown_content)
    description_text = clean_description(final_markdown)
    
    # Sanitize invalid characters for MDX
    clean_markdown = final_markdown.replace('୨>0<୧', '୨&gt;0&lt;୧')\
                                   .replace('<--', '&lt;--')\
                                   .replace('-->', '--&gt;')\
                                   .replace('><', '&gt;&lt;')
    
    # Construct MDX file
    mdx_content = f"""---
title: "{title.replace('"', '\\"')}"
description: "{description_text.replace('"', '\\"')}"
publishDate: "{formatted_date}"
author: "lovelie-light"
tags: ["quora-sync"]
sourceUrl: "{url}"
"""
    if cover_path:
        mdx_content += f'cover: "{cover_path}"\n'
    mdx_content += "---\n\n" + clean_markdown + "\n"
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(mdx_content)
        
    print(f"[Sukses] Berhasil menyinkronkan: {title}")
    return True

async def main():
    print("Memulai sinkronisasi menggunakan Crawl4AI...")
    
    # Load cookies if they exist
    cookies = []
    cookie_path = os.path.join(os.path.dirname(__file__), 'quora_cookies.json')
    if os.path.exists(cookie_path):
        print(f"Memuat cookies dari {cookie_path}...")
        with open(cookie_path, 'r', encoding='utf-8') as f:
            cookies = json.load(f)
            print(f"Memuat {len(cookies)} cookies sesi.")
    else:
        print("PENTING: Cookie sesi login tidak ditemukan. Berjalan sebagai tamu.")
        
    # Configure browser
    browser_config = BrowserConfig(
        headless=True,
        extra_args=['--no-sandbox', '--disable-setuid-sandbox']
    )
    
    spaces = [
        "https://sekalaniskalauniverse.quora.com/",
        "https://waroengpodjokmangkoes.quora.com/"
    ]
    
    all_article_urls = []
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        # Crawl all spaces to extract link list
        for space_url in spaces:
            links = await crawl_space_links(crawler, space_url, cookies)
            all_article_urls.extend(links)
            
        unique_articles = list(set(all_article_urls))
        print(f"\n==========================================")
        print(f"Total seluruh artikel unik yang ditemukan: {len(unique_articles)}")
        print(f"==========================================\n")
        
        success_count = 0
        
        # Scrape each article
        for url in unique_articles:
            print("-" * 50)
            print(f"Memproses: {url}...")
            
            # Retry mechanism
            success = False
            attempts = 0
            while not success and attempts < 3:
                attempts += 1
                try:
                    success = await crawl_article(crawler, url, cookies)
                    if success:
                        success_count += 1
                except Exception as e:
                    print(f"Kesalahan pada percobaan #{attempts} untuk {url}: {e}")
                    if attempts < 3:
                        await asyncio.sleep(3)
                        
            if not success:
                print(f"[GAGAL PERMANEN] Melewati {url} setelah 3 percobaan.")
                
        print(f"\n==========================================")
        print(f"Sinkronisasi selesai! Berhasil menyinkronkan {success_count} artikel.")
        print(f"==========================================\n")

if __name__ == "__main__":
    asyncio.run(main())

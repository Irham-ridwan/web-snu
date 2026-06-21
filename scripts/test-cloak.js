import { launch } from 'cloakbrowser/puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  console.log('Memulai CloakBrowser...');
  try {
    const browser = await launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Browser berhasil diluncurkan. Membuka tab baru...');
    const page = await browser.newPage();
    
    const spaceUrl = 'https://sekalaniskalauniverse.quora.com/';
    console.log(`Membuka: ${spaceUrl}...`);
    
    try {
      await page.goto(spaceUrl, { waitUntil: 'networkidle2', timeout: 35000 });
    } catch (e) {
      console.log('Selesai menunggu halaman dimuat...');
    }
    
    const pageTitle = await page.title();
    console.log(`Judul Halaman: "${pageTitle}"`);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`Panjang teks halaman: ${bodyText.length}`);
    if (bodyText.length > 500) {
      console.log('Isi teks (potongan pertama):');
      console.log(bodyText.slice(0, 300));
    }
    
    await browser.close();
  } catch (err) {
    console.error('Terjadi kesalahan:', err);
  }
}

test();

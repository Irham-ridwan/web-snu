const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
  console.log('Memulai browser virtual untuk login Quora...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log('Membuka halaman utama Quora...');
    await page.goto('https://www.quora.com/', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Mengisi kredensial...');
    
    // Tunggu kolom email muncul
    await page.waitForSelector('#email', { timeout: 15000 });
    
    // Focus dan ketik email
    await page.focus('#email');
    await page.type('#email', 'lofox000@gmail.com', { delay: 50 });
    
    // Focus dan ketik password
    await page.waitForSelector('#password', { timeout: 15000 });
    await page.focus('#password');
    await page.type('#password', '(Aa123456789)', { delay: 50 });

    console.log('Mengeklik tombol login...');
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginBtn = buttons.find(btn => {
        const text = btn.innerText.toLowerCase();
        return text === 'masuk' || text === 'log in' || text === 'login';
      });
      if (loginBtn) {
        loginBtn.click();
        return true;
      }
      return false;
    });
    
    if (!clicked) {
      console.log('Tombol tidak ditemukan lewat teks, mencoba submit form...');
      await page.evaluate(() => {
        const emailInput = document.querySelector('#email');
        if (emailInput && emailInput.closest('form')) {
          emailInput.closest('form').submit();
        }
      });
    }

    console.log('Menunggu login berhasil...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const cookies = await page.cookies();
    const m_login = cookies.find(c => c.name === 'm-login');
    const m_b = cookies.find(c => c.name === 'm-b');
    const m_s = cookies.find(c => c.name === 'm-s');
    const m_uid = cookies.find(c => c.name === 'm-uid');
    
    console.log(`Status Cookie: m-login=${m_login ? m_login.value : 'tidak ada'}, m-uid=${m_uid ? m_uid.value : 'tidak ada'}`);

    if (m_login && m_login.value !== '0') {
      console.log('Login BERHASIL! Cookie sesi ditemukan.');
      fs.writeFileSync(path.join(__dirname, 'quora_cookies.json'), JSON.stringify(cookies, null, 2));
      console.log('Cookies sesi berhasil disimpan ke scripts/quora_cookies.json.');
    } else {
      console.log('Gagal login: Kredensial ditolak atau terblokir captcha.');
      // Simpan screenshot untuk investigasi
      try {
        await page.screenshot({ path: path.join(__dirname, 'login-error.png') });
        console.log('Screenshot error disimpan ke scripts/login-error.png');
      } catch (e) {}
    }

  } catch (err) {
    console.error('Gagal melakukan login otomatis:', err.message);
    try {
      await page.screenshot({ path: path.join(__dirname, 'login-error.png') });
      console.log('Screenshot error disimpan ke scripts/login-error.png');
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

run();

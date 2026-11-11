// Firefox checks for dispute variants, seller form data and saved-state recovery.
// Run: node tests/browser-issues.cjs  (needs Playwright + Firefox, see ARCHITECTURE.md §9)
const {firefox} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const types = {'.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png'};

async function agreeAndShip(p) {
  await p.getByRole('button', {name: 'เริ่มสาธิตในฐานะผู้ซื้อ'}).click();
  await p.locator('[data-action="choose:1"]').first().click();
  await p.locator('#consent').check();
  await p.locator('[data-action="sign"]').click();
  await p.locator('[data-action="switch"]').first().click();
  await p.locator('#consent').check();
  await p.locator('[data-action="sign"]').click();
  await p.locator('[data-action="page:delivery"]').first().click();
  await p.locator('#ship-form button[type="submit"]').click();
  await p.locator('[data-action="role:buyer"]').first().click();
}

async function restart(p) {
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.getByRole('heading', {name: 'ผู้ซื้อ / SME', exact: true}).waitFor();
}

(async () => {
  const browser = await firefox.launch({headless: true, ...(process.env.FIREFOX_BIN ? {executablePath: process.env.FIREFOX_BIN} : {})});
  try {
    const p = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.route('http://supplytrust.test/**', r => {
      const pathname = new URL(r.request().url()).pathname;
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
      r.fulfill({body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'text/html'});
    });
    await p.goto('http://supplytrust.test/');

    // 1. Corrupt or outdated saved state falls back to a fresh demo.
    await p.evaluate(() => localStorage.setItem('supplytrust-v1', '{"role":"buyer","offers":"broken"}'));
    await p.reload();
    await p.getByRole('heading', {name: 'ผู้ซื้อ / SME', exact: true}).waitFor();

    // 2. Temperature above 4 °C with full weight.
    await agreeAndShip(p);
    await p.locator('#receive-form input[name="temp"]').fill('7');
    await p.locator('#receive-form button').click();
    assert(await p.getByText('อุณหภูมิขณะรับ 7 °C สูงกว่าเกณฑ์ 4 °C', {exact: true}).isVisible(), 'temperature issue summary');
    assert(await p.getByText(/ข้อ 1 การส่งมอบและเกณฑ์ตรวจรับ · ข้อ 4/).isVisible(), 'temperature clauses');
    await p.locator('[data-action="role:seller"]').first().click();
    assert.match(await p.locator('#response-form textarea').inputValue(), /เปลี่ยนสินค้าที่อุณหภูมิเกินเกณฑ์/);

    // 3. Seller document panel follows the selected supplier (Siam Fresh: 4/4).
    await p.locator('[data-action="page:offers"]').first().click();
    assert.equal(await p.locator('.stack .status-list .tag.green').count(), 4, 'seller docs should be 4/4');
    assert.match(await p.locator('#offer-form textarea[name="terms"]').inputValue(), /24 ชั่วโมง/);

    // 4. Over-delivery.
    await restart(p);
    await agreeAndShip(p);
    await p.locator('#receive-form input[name="weight"]').fill('103');
    await p.locator('#receive-form button').click();
    assert(await p.getByText('สินค้าเกิน 3 กิโลกรัม', {exact: true}).isVisible(), 'over-delivery summary');

    // 5. Shortage quick action still produces the original 5 kg story.
    await restart(p);
    await agreeAndShip(p);
    await p.locator('[data-action="issue"]').click();
    assert(await p.getByText('สินค้าขาด 5 กิโลกรัม', {exact: true}).isVisible(), 'shortage summary');
    await p.locator('[data-action="role:seller"]').first().click();
    assert.match(await p.locator('#response-form textarea').inputValue(), /จัดส่งสินค้าเพิ่มเติม 5 กิโลกรัม/);

    // 6. Mobile card shows a readable label for unknown distance.
    await restart(p);
    await p.setViewportSize({width: 390, height: 844});
    await p.getByRole('button', {name: 'เริ่มสาธิตในฐานะผู้ซื้อ'}).click();
    await p.locator('summary').filter({hasText: 'เครื่องมือการสาธิต'}).click();
    await p.locator('#scenario').selectOption('missing');
    const mobile = await p.locator('.mobile-offers').innerText();
    assert(mobile.includes('ไม่ทราบระยะทาง') && !mobile.includes('ไม่ทราบ กม.'), 'mobile unknown distance label');

    assert.deepEqual(errors, []);
    console.log('PASS Firefox issues: saved-state recovery; temperature, over-delivery and shortage disputes; seller docs/terms; mobile unknown distance; no page errors.');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });

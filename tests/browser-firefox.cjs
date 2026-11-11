// Firefox end-to-end journey across phone, tablet and laptop sizes.
// Run: node tests/browser-firefox.cjs  (needs Playwright + Firefox, see ARCHITECTURE.md §9)
const {firefox} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const types = {'.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png'};
const sizes = [['iphone', 390, 844], ['ipad', 820, 1180], ['laptop', 1440, 1000]];

(async () => {
  const browser = await firefox.launch({headless: true, ...(process.env.FIREFOX_BIN ? {executablePath: process.env.FIREFOX_BIN} : {})});
  try {
    const p = await browser.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push(e.message));
    await p.route('http://supplytrust.test/**', r => {
      const pathname = new URL(r.request().url()).pathname;
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
      r.fulfill({body: fs.readFileSync(file), contentType: types[path.extname(file)] || 'text/html'});
    });
    await p.goto('http://supplytrust.test/');
    await p.locator('.role-card').first().waitFor();
    fs.mkdirSync(path.join(root, 'screenshots'), {recursive: true});

    const shoot = async (label, check) => {
      for (const [name, width, height] of sizes) {
        await p.setViewportSize({width, height});
        await p.waitForTimeout(150);
        await p.screenshot({path: path.join(root, 'screenshots', `${name}-${label}.png`), fullPage: true});
        assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${check} overflow`);
      }
    };

    await shoot('start', 'landing');
    await p.locator('.role-card[data-action="role:buyer"]').click();
    await shoot('compare', 'compare');

    // Criteria live behind a disclosure; the recommendation explains the trade-off in baht.
    const eq = await p.locator('.equation').innerText();
    assert(/300 บาท/.test(eq) && /547 บาท/.test(eq) && /247 บาท/.test(eq), 'value equation tiles');
    await p.locator('summary', {hasText: 'ปรับเกณฑ์เอง'}).click();
    await p.locator('#crit-maxHours').fill('9');
    assert(await p.locator('.tag.bad', {hasText: 'ส่งนานกว่า 9 ชม.'}).first().isVisible(), 'max-hours must-have');
    await p.locator('#crit-maxHours').fill('24');
    await p.locator('#crit-perDay').fill('0');
    await p.locator('#crit-perHour').fill('0');
    assert.match(await p.locator('.advice-title').textContent(), /พร้อมส่งฟู้ดส์/, 'pure cost picks the cheapest eligible');
    await p.locator('#crit-perDay').fill('400');
    await p.locator('#crit-perHour').fill('20');
    assert.match(await p.locator('.advice-title').textContent(), /สยามเฟรชฟู้ด/);

    // Motion: panels stay open across re-renders; the slider pill lines up with the pressed preset.
    await p.locator('[data-action="preset:cost"]').click();
    await p.waitForTimeout(450);
    assert(await p.evaluate(() => document.querySelector('details[data-panel="tune"]').open), 'tune panel should stay open');
    const pill = await p.evaluate(() => {
      const g = document.querySelector('[data-slider="preset"]');
      return {pill: g.querySelector('.slider-pill').getBoundingClientRect().left, btn: g.querySelector('[aria-pressed="true"]').getBoundingClientRect().left};
    });
    assert(Math.abs(pill.pill - pill.btn) < 1.5, 'preset pill aligned with pressed button');
    await p.locator('[data-action="preset:balanced"]').click();

    // Demo scenarios.
    const scenario = async v => { await p.locator('.demo-menu summary').click(); await p.locator('#scenario').selectOption(v); };
    await scenario('none');
    assert(await p.getByText('ยังไม่มีผู้ขายที่ผ่านเกณฑ์ที่ตั้งไว้', {exact: true}).isVisible());
    await scenario('single');
    assert.equal(await p.locator('tbody tr').count(), 1);
    await scenario('normal');

    // Documents dialog.
    await p.locator('[data-action="docs:1"]').first().click();
    assert(await p.locator('dialog').isVisible());
    await p.getByRole('button', {name: 'ปิดรายละเอียด'}).click();

    // Full journey: select, both confirm, ship, shortage, response, resolution.
    await p.locator('[data-action="choose:1"]').first().click();
    await p.locator('#consent').check();
    await p.locator('[data-action="sign"]').click();
    // The seller reviews on their own: waiting state first, then confirmed.
    assert(await p.locator('.badge.wait').isVisible(), 'seller shows as reviewing');
    await p.getByRole('button', {name: 'ไปที่การส่งมอบ'}).waitFor({timeout: 10000});
    assert.equal(await p.locator('.rows .badge.ok').count(), 2);
    await p.getByRole('button', {name: 'ไปที่การส่งมอบ'}).click();
    // Buyer stays the buyer throughout: the seller ships and responds on their own.
    assert.equal(await p.getByText(/สลับเป็น/).count(), 0, 'no role-switch buttons in the flow');
    await p.locator('[data-action="issue"]').click({timeout: 10000});
    assert(await p.locator('.waiting').isVisible(), 'buyer waits for seller response');
    await p.locator('[data-action="resolve"]').click({timeout: 10000});
    assert(await p.getByText('ตกลงแนวทางแก้ไขแล้ว', {exact: true}).isVisible());
    await shoot('evidence', 'delivery');

    assert.deepEqual(errors, []);
    console.log('PASS Firefox: 3 viewport sizes; criteria and baht trade-off; scenarios; documents; buyer selection; both confirmations; dispatch; shortage; supplier response; mutual resolution; no page errors.');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });

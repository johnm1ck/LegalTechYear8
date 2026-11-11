import {initialOffers, rank, defaults, criteria} from './logic.js';

/* ---------- helpers ---------- */

const icons = {
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z M8.5 12l2.5 2.5 4.5-5',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  doc: 'M14 2H5v20h14V7l-5-5Z M14 2v6h5 M8 12h8 M8 16h6',
  truck: 'M1 5h13v12H1z M14 9h5l3 4v4h-8 M5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  check: 'm5 12 4 4L19 6',
  bag: 'M4 7h16l1 14H3L4 7Z M8 8V6a4 4 0 0 1 8 0v2',
  download: 'M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5',
  lock: 'M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4',
  close: 'M6 6l12 12M18 6 6 18'
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[n] || icons.doc}"/></svg>`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const money = n => n == null ? 'รอยืนยัน' : new Intl.NumberFormat('th-TH', {maximumFractionDigits: 0}).format(n);
const baht = n => n == null ? 'รอยืนยัน' : money(n) + ' บาท';
const days = n => `${Math.floor(n)} วัน ${Math.round((n % 1) * 24)} ชม.`;
const btn = (text, action, style = '') => `<button class="btn ${style}" data-action="${action}">${text}</button>`;
const BUYER = 'ร้านอาหารครัวอุ่นใจ';
const DOCS = ['ทะเบียนนิติบุคคล', 'เอกสารสถานประกอบการ', 'ผลวิเคราะห์สินค้าตัวอย่าง', 'เอกสารระบบการผลิต'];
// Presets set what each improvement is worth in baht; must-haves stay as the buyer set them.
const PRESETS = {
  balanced: ['สมดุล', {perDay: 400, perHour: 20, perDoc: 300}],
  cost: ['ต้นทุน', {perDay: 100, perHour: 5, perDoc: 100}],
  fresh: ['ความสด', {perDay: 1000, perHour: 20, perDoc: 300}],
  speed: ['ความเร็ว', {perDay: 400, perHour: 80, perDoc: 300}],
};

/* ---------- state ---------- */

const fresh = () => ({role: null, page: 'offers', offers: structuredClone(initialOffers), criteria: {...defaults}, scenario: 'normal', selected: null, version: 1, buyer: false, seller: false, amended: false, revisionNote: '', shipped: false, received: false, issue: false, resolved: false, acceptResolution: false, evidence: null, events: []});
let s;
try {
  const saved = JSON.parse(localStorage.getItem('supplytrust-v1'));
  s = saved && typeof saved === 'object' && Array.isArray(saved.offers) && Array.isArray(saved.events) ? {...fresh(), ...saved} : fresh();
  s.criteria = criteria(s.criteria); // older saves used weights; they fall back to defaults
  delete s.weights;
} catch { s = fresh(); }
try { localStorage.removeItem('supplytrust-theme'); } catch {}

const app = document.querySelector('#app');
const save = () => { try { localStorage.setItem('supplytrust-v1', JSON.stringify(s)); } catch { toast('พื้นที่จัดเก็บเต็ม กรุณาเริ่มใหม่'); } };
let toastTimer;
function toast(t) {
  const el = document.querySelector('#toast');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
const event = (title, detail = '') => { s.events.push({title, detail, time: new Date().toLocaleString('th-TH', {dateStyle: 'short', timeStyle: 'short'})}); };
const chosen = () => s.offers.find(o => o.id === s.selected);
const agreed = () => s.buyer && s.seller;
const other = () => s.role === 'buyer' ? 'ผู้ขาย' : 'ผู้ซื้อ';
const otherRole = () => s.role === 'buyer' ? 'seller' : 'buyer';
const roleName = r => r === 'buyer' ? 'ผู้ซื้อ' : 'ผู้ขาย';
const partyName = r => r === 'buyer' ? BUYER : chosen()?.name;
const spinner = '<span class="spinner" aria-hidden="true"></span>';
const waitLine = text => `<p class="waiting" role="status">${spinner}${text}</p>`;
const doneMap = () => ({offers: !!s.selected, contract: agreed(), delivery: !!(s.received || s.acceptResolution)});
const view = () => s.role ? s.role + ':' + s.page : 'landing';

/* ---------- motion state (not persisted) ---------- */

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const EASE = 'cubic-bezier(.2, .8, .2, 1)';
const PAGE_ORDER = {offers: 0, contract: 1, delivery: 2};
const ui = {
  open: {},                 // expandable panels the user opened/closed
  pills: {},                // last slider-pill geometry per group
  lastView: view(),
  prevDone: doneMap(),
  prevIssue: s.issue,
  seenEvents: s.events.length,
  justSigned: null,
  anim: {}                  // one-shot animation flags for the current render
};
const openAttr = (key, fallback = false) => (ui.open[key] ?? fallback) ? ' open' : '';
const pill = '<span class="slider-pill" aria-hidden="true"></span>';

/* ---------- shell ---------- */

function header() {
  const roles = s.role ? `<div class="segmented" data-slider="role" role="group" aria-label="บทบาทที่ใช้งาน">${pill}${[['buyer', 'ผู้ซื้อ'], ['seller', 'ผู้ขาย']].map(([r, l]) => `<button data-action="role:${r}" aria-pressed="${s.role === r}">${l}</button>`).join('')}</div>` : '';
  return `<header class="header"><div class="header-inner">
    <button class="brand" data-action="home" aria-label="SupplyTrust กลับหน้าแรก"><span class="brand-mark">${icon('shield')}</span><span class="brand-name">SupplyTrust</span></button>
    <div class="header-right">${roles}${demoMenu()}</div>
  </div></header>`;
}

function demoMenu() {
  const opts = [['normal', 'ข้อเสนอปกติ 5 ราย'], ['none', 'ไม่มีรายใดผ่านเกณฑ์'], ['single', 'มีข้อเสนอรายเดียว'], ['missing', 'ข้อมูลขนส่งไม่ครบ']];
  return `<details class="demo-menu"><summary>เดโม</summary><div class="demo-pop">
    <p>ผู้ประกอบการ เอกสาร และการยืนยันทั้งหมดเป็นข้อมูลสมมติ ไม่มีการทำธุรกรรมจริง</p>
    <label class="field">สถานการณ์ข้อเสนอ<select id="scenario">${opts.map(([v, l]) => `<option value="${v}" ${s.scenario === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    ${btn('เริ่มใหม่ทั้งหมด', 'reset', 'danger full')}
  </div></details>`;
}

function steps() {
  const done = doneMap();
  const list = [['offers', s.role === 'seller' ? 'ข้อเสนอ' : 'เลือกผู้ขาย'], ['contract', 'ข้อตกลง'], ['delivery', 'ส่งมอบ']];
  return `<nav class="steps" aria-label="ขั้นตอน"><ol data-slider="steps">${list.map(([p, l], i) => `<li${s.page === p ? ' class="active"' : ''}><button data-action="page:${p}" class="step${s.page === p ? ' current' : ''}${done[p] ? ' done' : ''}" ${s.page === p ? 'aria-current="step"' : ''}><span class="step-num${ui.anim.newDone?.includes(p) ? ' pop' : ''}">${done[p] ? icon('check') : i + 1}</span><span>${l}</span></button></li>`).join('')}<span class="slider-pill step-bar" aria-hidden="true"></span></ol></nav>`;
}

function heading(title, sub, extra = '') {
  return `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${extra ? `<div class="page-actions">${extra}</div>` : ''}</div>`;
}
const requestLine = () => `อกไก่แช่เย็น 100 กก. · ส่งเขตปทุมวันภายใน ${s.criteria.maxHours} ชม. · อายุเหลืออย่างน้อย ${s.criteria.minDays} วันเมื่อส่งถึง`;
const signed = n => (n > 0 ? '−' : '+') + money(Math.abs(n));
const empty = (title, desc, action, text) => `<section class="card empty"><h2>${title}</h2><p>${desc}</p>${btn(text, action, 'primary')}</section>`;
const badge = (ok, yes = 'ยืนยันแล้ว', no = 'รอยืนยัน', pop = false) => ok ? `<span class="badge ok${pop ? ' pop' : ''}">${icon('check')}${yes}</span>` : `<span class="badge">${no}</span>`;

/* ---------- landing ---------- */

function landing() {
  const card = (role, ic, title, desc, go) => `<button class="role-card" data-action="role:${role}"><span class="role-icon">${icon(ic)}</span><span class="role-title">${title}</span><span class="role-desc">${desc}</span><span class="role-go">${go}${icon('arrow')}</span></button>`;
  return `<main id="main" class="landing">
    <h1>ซื้อขายอย่างมั่นใจ<br>ด้วยข้อตกลงที่ชัดเจน</h1>
    <p class="lead">เปรียบเทียบข้อเสนอ ตกลงเงื่อนไขร่วมกัน และเก็บหลักฐานการส่งมอบไว้ในที่เดียว</p>
    <div class="roles">
      ${card('buyer', 'bag', 'ผู้ซื้อ', 'ร้านอาหารต้องการอกไก่แช่เย็น 100 กก. เปรียบเทียบข้อเสนอแล้วเลือกผู้ขายเอง', 'เริ่มในฐานะผู้ซื้อ')}
      ${card('seller', 'truck', 'ผู้ขาย', 'ยื่นข้อเสนอพร้อมเงื่อนไขที่ชัดเจน ยืนยันข้อตกลง และบันทึกการส่งมอบ', 'เริ่มในฐานะผู้ขาย')}
    </div>
  </main>`;
}

/* ---------- step 1: offers ---------- */

function offersForScenario() {
  let o = structuredClone(s.offers);
  if (s.scenario === 'single') o = o.slice(0, 1);
  if (s.scenario === 'missing') { o[1].shipping = null; o[2].distance = null; }
  return o;
}
const dist = o => o.distance == null ? 'ไม่ทราบระยะทาง' : o.distance + ' กม.';

function tags(o, best) {
  const t = [];
  if (o.id === best?.id) t.push(['rec', 'แนะนำ']);
  o.fails.forEach(f => t.push(['bad', f]));
  if (o.unusual) t.push(['warn', 'ค่าขนส่งต่ำผิดปกติ']);
  if (o.shipping == null) t.push(['warn', 'ยังไม่ระบุค่าขนส่ง']);
  if (o.distance == null) t.push(['warn', 'ไม่ทราบระยะทาง']);
  if (!o.terms) t.push(['warn', 'ยังไม่ระบุกรณีส่งไม่ครบ']);
  if (o.new) t.push(['', 'ผู้ขายรายใหม่']);
  return t.length ? `<div class="tags">${t.map(([c, l]) => `<span class="tag ${c}">${l}</span>`).join('')}</div>` : '';
}

function offersPage() {
  const rows = rank(offersForScenario(), s.criteria, s.scenario);
  const best = rows.find(o => o.eligible);
  const c = s.criteria;
  const num = (k, label, unit, max) => `<label class="crit"><span>${label}</span><span class="crit-input"><input type="number" inputmode="numeric" min="0" max="${max}" step="1" value="${c[k]}" data-crit="${k}" id="crit-${k}"><span>${unit}</span></span></label>`;
  return `${heading('เลือกผู้ขาย', requestLine())}
    ${advice(rows, best)}
    <section class="criteria">
      <div class="criteria-row"><span class="criteria-label">ให้ความสำคัญกับ</span>${presets()}</div>
      <details class="disclosure" data-panel="tune"${openAttr('tune')}><summary>ปรับเกณฑ์เอง</summary><div class="panel-body">
        <div class="criteria-grid">
          <fieldset><legend>ต้องผ่าน</legend><p class="hint">ไม่ผ่านข้อใดข้อหนึ่ง จะไม่จัดอันดับ</p>
            ${num('minDays', 'อายุสินค้าเหลือเมื่อถึงอย่างน้อย', 'วัน', 7)}
            ${num('maxHours', 'ส่งถึงภายใน', 'ชม.', 72)}
            <label class="check"><input type="checkbox" data-crit="allDocs" id="crit-allDocs" ${c.allDocs ? 'checked' : ''}><span>ต้องมีเอกสารตรวจแล้วครบ 4 รายการ</span></label>
          </fieldset>
          <fieldset><legend>คุ้มค่ากับคุณเท่าไร</legend><p class="hint">ใช้เทียบข้อเสนอเป็นเงินบาท</p>
            ${num('perDay', 'สดเพิ่ม 1 วัน มีค่า', 'บาท', 100000)}
            ${num('perHour', 'ส่งเร็วขึ้น 1 ชั่วโมง มีค่า', 'บาท', 100000)}
            ${num('perDoc', 'เอกสารขาด 1 รายการ ถือเป็นความเสี่ยง', 'บาท', 100000)}
          </fieldset>
        </div>
      </div></details>
    </section>
    ${comparison(rows, best)}
    <details class="disclosure" data-panel="calc"${openAttr('calc')}><summary>วิธีคำนวณต้นทุนเทียบ</summary><div class="panel-body">
      <p>ต้นทุนเทียบ = ต้นทุนรวม − (วันที่สดเกินเกณฑ์ × ${money(c.perDay)}) − (ชั่วโมงที่เร็วกว่าเกณฑ์ × ${money(c.perHour)}) + (เอกสารที่ขาด × ${money(c.perDoc)}) ยิ่งต่ำยิ่งคุ้ม</p>
      <p>ต้นทุนรวม = ราคา × 100 กก. + ค่าขนส่ง ค่าขนส่งประมาณ = 500 + ระยะทาง × 10 บาท หากค่าขนส่งที่เสนอต่ำกว่า 70% ของค่าประมาณ จะใช้ค่าประมาณในการจัดอันดับ</p>
      <p>อายุเหลือ = 7 วัน − อายุเมื่อออกส่ง − ชั่วโมงขนส่ง ÷ 24 ผู้ขายที่ไม่ผ่านเกณฑ์ต้องผ่านจะอยู่ท้ายรายการและไม่จัดอันดับ</p>
      <p>เกณฑ์อุณหภูมิ ระยะเวลาตรวจรับ และรายการเอกสารเป็นตัวอย่าง ต้องให้ผู้เชี่ยวชาญตรวจก่อนใช้จริง</p>
    </div></details>`;
}

function presets() {
  return `<div id="presets" class="segmented" data-slider="preset" role="group" aria-label="ชุดความคุ้มค่า">${pill}${Object.entries(PRESETS).map(([k, [l, w]]) => `<button data-action="preset:${k}" aria-pressed="${Object.entries(w).every(([key, v]) => s.criteria[key] === v)}">${l}</button>`).join('')}</div>`;
}

function advice(rows, best) {
  const notes = [];
  const cheap = [...rows].sort((a, b) => a.price - b.price)[0];
  if (best && cheap && cheap.id !== best.id) notes.push(`${cheap.name} ราคาต่อกิโลกรัมต่ำที่สุด แต่${cheap.eligible ? `ต้นทุนรวมส่งถึง ${baht(cheap.total)} และต้นทุนเทียบสูงกว่า` : cheap.fails.join(' · ')}`);
  if (rows.some(o => o.unusual)) notes.push('บางรายเสนอค่าขนส่งต่ำกว่าค่าประมาณมาก ควรขอให้ยืนยันก่อนตกลงราคา');
  if (rows.some(o => !o.terms)) notes.push('บางรายยังไม่ระบุวิธีจัดการกรณีส่งไม่ครบ ต้องตกลงก่อนยืนยันข้อตกลง');
  const newbie = best && rows.find(o => o.new && o.docs >= 3 && o.eligible && o.id !== best.id);
  if (newbie) notes.push(`${newbie.name} เป็นผู้ขายรายใหม่ที่ผ่านเกณฑ์และมีเอกสารตรวจแล้ว ${newbie.docs} รายการ เหมาะกับการทดลองสั่งรอบแรก`);
  const t = best && tradeOff(rows, best);
  const tile = (label, value, detail = '', cls = '') => `<div class="eq-tile${cls}"><span class="eq-label">${label}</span><strong class="eq-value">${value}</strong>${detail ? `<span class="eq-detail">${detail}</span>` : ''}</div>`;
  const op = c => `<span class="eq-op" aria-hidden="true">${c}</span>`;
  const body = !best
    ? '<div class="advice-head"><div><p class="advice-title">ยังไม่มีผู้ขายที่ผ่านเกณฑ์ที่ตั้งไว้</p><p class="advice-sub">ลองทบทวนเกณฑ์ต้องผ่าน หรือเปิดรับข้อเสนอรอบใหม่</p></div></div>'
    : `<div class="advice-head">
        <div><p class="eyebrow">แนะนำ</p><p class="advice-title">${best.name}</p>
          <p class="advice-sub">${t ? `เทียบกับ${esc(t.cheap.name)} ซึ่งต้นทุนรวมต่ำที่สุดในผู้ขายที่ผ่านเกณฑ์` : 'ต้นทุนรวมต่ำที่สุดในผู้ขายที่ผ่านเกณฑ์ และคุ้มที่สุดตามค่าที่คุณตั้ง'}</p></div>
        ${btn(s.selected === best.id ? 'เลือกแล้ว' : 'เลือกผู้ขายรายนี้', 'choose:' + best.id, 'primary')}
      </div>
      <div class="equation${t ? '' : ' plain'}">${t
        ? tile('แพงกว่า', '+' + baht(t.extra)) + op('−') + tile('ได้มูลค่าเพิ่ม', baht(t.worth), t.gains.join('<br>')) + op('=') + tile('คุ้มกว่า', baht(t.better), '', ' win')
        : tile('ต้นทุนรวมส่งถึง', baht(best.total)) + tile('อายุเหลือเมื่อถึง', days(best.remaining)) + tile('เอกสารตรวจแล้ว', best.docs + '/4')}</div>`;
  return `<section id="advice" class="advice">
    ${body}
    ${notes.length ? `<details class="disclosure advice-notes" data-panel="notes"${openAttr('notes')}><summary>ข้อควรรู้ ${notes.length} ข้อ</summary><div class="panel-body"><ul>${notes.map(n => `<li>${n}</li>`).join('')}</ul></div></details>` : ''}
    <p class="advice-foot">การจัดอันดับใช้ค่าที่คุณตั้ง ไม่ใช่การรับรองคุณภาพ คุณเป็นผู้เลือกเอง</p>
  </section>`;
}

// Why the recommended offer beats the cheapest eligible one, in baht. Null when it is the cheapest.
function tradeOff(rows, best) {
  const cheap = rows.filter(o => o.eligible && o.total != null).sort((a, b) => a.total - b.total || a.id - b.id)[0];
  if (!cheap || cheap.id === best.id || best.adjusted == null) return null;
  const gains = [];
  const dDays = best.remaining - cheap.remaining, dHours = cheap.hours - best.hours, dDocs = best.docs - cheap.docs;
  if (dDays > 0.04) gains.push('สดกว่า ' + days(dDays));
  if (dHours > 0) gains.push(`ส่งเร็วกว่า ${dHours} ชม.`);
  if (dDocs > 0) gains.push(`เอกสารครบกว่า ${dDocs} รายการ`);
  const worth = (best.freshValue + best.speedValue - best.docRisk) - (cheap.freshValue + cheap.speedValue - cheap.docRisk);
  return {cheap, gains, extra: best.total - cheap.total, worth, better: cheap.adjusted - best.adjusted};
}

function comparison(rows, best) {
  const breakdown = o => [o.freshValue && 'สด ' + signed(o.freshValue), o.speedValue && 'เร็ว ' + signed(o.speedValue), o.docRisk && 'เอกสาร ' + signed(-o.docRisk)].filter(Boolean).map(t => `<span class="nowrap">${t}</span>`).join(' · ');
  const adj = o => !o.eligible ? '<span class="meta">ไม่จัดอันดับ</span>' : o.adjusted == null ? '<span class="meta">รอข้อมูลขนส่ง</span>' : `<strong class="money"><span data-count="${o.adjusted}">${money(o.adjusted)}</span></strong><span class="meta">${breakdown(o)}</span>`;
  const est = o => o.unusual || o.shipping == null;
  const choose = (o, full = '') => btn(s.selected === o.id ? 'เลือกแล้ว' : full ? 'เลือกผู้ขายรายนี้' : 'เลือก', 'choose:' + o.id, (o.id === best?.id ? 'primary' : 'secondary') + full);
  const freshBar = o => `<span class="fresh-bar${o.eligible ? '' : ' bad'}"><span style="width:${Math.max(0, Math.min(1, o.remaining / 7)) * 100}%"></span></span>`;
  return `<div id="comparison">
    <div class="list-head"><h2>ข้อเสนอ ${rows.length} ราย</h2><span class="hint">${icon('lock')}ข้อเสนอปิดผนึก ผู้ขายไม่เห็นราคาของรายอื่น</span></div>
    <div class="card table-card desktop-offers"><div class="table-wrap"><table>
      <thead><tr><th>ผู้ขาย</th><th class="num">ต้นทุนรวมส่งถึง</th><th>อายุเหลือเมื่อถึง</th><th class="num">ขนส่ง</th><th>เอกสาร</th><th class="num">ต้นทุนเทียบ</th><th><span class="sr-only">การเลือก</span></th></tr></thead>
      <tbody>${rows.map(o => `<tr data-flip="r${o.id}" class="${o.id === best?.id ? 'recommended' : ''}">
        <td><strong>${o.name}</strong><span class="meta">${o.area} · ${dist(o)}</span>${tags(o, best)}</td>
        <td class="num"><strong class="money">${baht(o.total)}</strong><span class="meta">${money(o.price)} บาท/กก. + ส่ง ${money(o.freight)}${est(o) ? '*' : ''}</span></td>
        <td><span class="${o.eligible ? '' : 'bad-text'}">${days(o.remaining)}</span>${freshBar(o)}</td>
        <td class="num nowrap">${o.hours} ชม.</td>
        <td class="nowrap"><button class="link" data-action="docs:${o.id}">${o.docs}/4</button></td>
        <td class="num">${adj(o)}</td>
        <td class="num">${choose(o)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <p class="table-note">* ค่าขนส่งประมาณ ใช้จัดอันดับเท่านั้น ไม่ใช่ราคาที่ตกลง ผู้ขายต้องยืนยันค่าขนส่งจริงในข้อตกลง</p></div>
    <div class="mobile-offers">${rows.map(o => `<article data-flip="c${o.id}" class="card offer-card${o.id === best?.id ? ' recommended' : ''}">
      <div class="offer-top"><div><strong class="name">${o.name}</strong><span class="meta">${o.area} · ${dist(o)}</span></div><div class="score-big">${o.eligible && o.adjusted != null ? `<span data-count="${o.adjusted}">${money(o.adjusted)}</span><small>ต้นทุนเทียบ</small>` : `<small>${o.eligible ? 'รอข้อมูลขนส่ง' : 'ไม่จัดอันดับ'}</small>`}</div></div>
      ${tags(o, best)}
      <dl class="offer-stats">
        <div><dt>ต้นทุนรวมส่งถึง</dt><dd>${baht(o.total)}</dd></div>
        <div><dt>อายุเหลือเมื่อถึง</dt><dd class="${o.eligible ? '' : 'bad-text'}">${days(o.remaining)}</dd></div>
        <div><dt>ราคา/กก. · ค่าส่ง</dt><dd>${money(o.price)} · ${money(o.freight)}${est(o) ? '*' : ''}</dd></div>
        <div><dt>ขนส่ง · เอกสาร</dt><dd>${o.hours} ชม. · <button class="link" data-action="docs:${o.id}">${o.docs}/4</button></dd></div>
      </dl>
      ${choose(o, ' full')}
    </article>`).join('')}
    <p class="hint">* ค่าขนส่งประมาณ ใช้จัดอันดับเท่านั้น ไม่ใช่ราคาที่ตกลง</p></div>
  </div>`;
}

// What the buyer asked for, checked live against the seller's current form values.
function buyerBrief(o, v = {}) {
  const val = k => v[k] ?? o[k];
  const num = k => { const n = val(k); return n === '' || n == null ? null : +n; };
  const age = num('age'), hours = num('hours'), shipping = num('shipping');
  const terms = (v.terms ?? (o.terms || o.termsText ? (o.termsText || 'x') : '')).trim();
  const left = age == null || hours == null ? null : 7 - age - hours / 24;
  const c = s.criteria;
  const mark = st => `<span class="need-mark ${st}" aria-hidden="true">${st === 'ok' ? icon('check') : st === 'bad' || st === 'warn' ? '!' : '·'}</span>`;
  const need = (st, label, yours) => `<li class="${st}">${mark(st)}<span class="need-label">${label}</span><span class="need-yours">${yours}</span></li>`;
  const needs = [
    need('info', 'อกไก่สดแช่เย็น 100 กิโลกรัม', 'ตามคำขอ'),
    need(hours == null ? 'warn' : hours <= c.maxHours ? 'ok' : 'bad', `ส่งถึงเขตปทุมวันภายใน ${c.maxHours} ชม.`, hours == null ? 'ยังไม่ระบุ' : `ของคุณ ${hours} ชม.`),
    need(left == null ? 'warn' : left >= c.minDays ? 'ok' : 'bad', `อายุสินค้าเหลืออย่างน้อย ${c.minDays} วันเมื่อส่งถึง`, left == null ? 'ยังไม่ระบุ' : `ของคุณ ${days(Math.max(0, left))}`),
    need('info', 'อุณหภูมิขณะรับไม่เกิน 4 °C', 'ตรวจตอนรับสินค้า'),
    need(shipping == null ? 'warn' : 'ok', 'ระบุค่าขนส่งชัดเจน', shipping == null ? 'ยังไม่ระบุ' : baht(shipping)),
    need(terms ? 'ok' : 'warn', 'มีวิธีแก้ไขกรณีส่งไม่ครบ', terms ? 'ระบุแล้ว' : 'ยังไม่ระบุ'),
    need(o.docs >= 4 ? 'ok' : c.allDocs ? 'bad' : 'warn', c.allDocs ? 'ต้องมีเอกสารครบ 4 รายการ' : 'เอกสารประกอบครบ 4 รายการ', `ตรวจแล้ว ${o.docs}/4`),
  ];
  const worth = [['สดเพิ่ม 1 วัน', 'ยอมจ่ายเพิ่ม', c.perDay], ['ส่งเร็วขึ้น 1 ชั่วโมง', 'ยอมจ่ายเพิ่ม', c.perHour], ['เอกสารขาด 1 รายการ', 'หักความคุ้มค่า', c.perDoc]]
    .map(([l, verb, n]) => `<li><span>${l}</span><span>${verb} <b>${money(n)}</b> บาท</span></li>`).join('');
  return `<section class="card brief" id="buyer-brief" aria-label="คำขอซื้อ">
    <header class="brief-head">
      <span class="role-icon">${icon('bag')}</span>
      <div><p class="eyebrow">คำขอซื้อจาก</p><h2>${BUYER}</h2><p class="meta">ร้านอาหาร · เขตปทุมวัน กรุงเทพฯ</p></div>
    </header>
    <div class="brief-body">
      <div><h3>สิ่งที่ผู้ซื้อต้องการ</h3><ul class="needs">${needs.join('')}</ul></div>
      <div class="brief-prio"><h3>ผู้ซื้อให้ความสำคัญกับ</h3><ul class="worth">${worth}</ul>
        <p class="hint">ผู้ซื้อเทียบข้อเสนอเป็นเงินบาท: ต้นทุนรวม หักมูลค่าความสดและความเร็วที่เกินเกณฑ์ บวกความเสี่ยงจากเอกสารที่ขาด ข้อเสนอที่ไม่ผ่านเกณฑ์ต้องผ่านจะไม่ถูกจัดอันดับ</p></div>
    </div>
  </section>`;
}

function supplierPage() {
  const o = chosen() || s.offers[1];
  const field = (n, l, v, mode) => `<label class="field">${l}<input name="${n}" type="number" inputmode="${mode}" value="${v ?? ''}" required min="${n === 'hours' ? 1 : 0}" max="${n === 'age' ? 7 : 100000}" step="${n === 'price' ? '0.01' : 1}"></label>`;
  const terms = o.terms || o.termsText ? esc(o.termsText || 'ผู้ขายจัดส่งส่วนที่ขาดภายใน 24 ชั่วโมง โดยรับผิดชอบค่าขนส่งเพิ่มเติม') : '';
  const status = !o.submitted ? '<span class="badge">ฉบับร่าง</span>'
    : !s.selected ? `<span class="badge wait">${spinner}รอผู้ซื้อพิจารณา</span>`
    : s.selected === o.id ? badge(true, 'ผู้ซื้อเลือกข้อเสนอนี้') : '<span class="badge">ผู้ซื้อเลือกรายอื่น</span>';
  const next = o.submitted && s.selected === o.id ? `<div class="notice ok next"><p>${BUYER}เลือกข้อเสนอของคุณแล้ว ร่างข้อตกลงพร้อมให้ตรวจ</p>${btn('ไปที่ข้อตกลง', 'page:contract', 'primary')}</div>` : '';
  return `${heading('ข้อเสนอของคุณ', '', status)}${next}
  ${buyerBrief(o)}
  <div class="split">
    <section class="card pad">
      <h2>${esc(o.name)}</h2>
      <form id="offer-form">
        <div class="form-grid">
          ${field('price', 'ราคาต่อกิโลกรัม (บาท)', o.price, 'decimal')}
          ${field('shipping', 'ค่าขนส่ง (บาท)', o.shipping, 'numeric')}
          ${field('hours', 'ระยะเวลาขนส่ง (ชั่วโมง)', o.hours, 'numeric')}
          ${field('age', 'อายุสินค้าเมื่อออกส่ง (วัน)', o.age, 'numeric')}
          <label class="field wide">หากส่งสินค้าไม่ครบ จะดำเนินการอย่างไร<textarea name="terms" required placeholder="วิธีแก้ไข ระยะเวลา และผู้รับผิดชอบค่าใช้จ่าย">${terms}</textarea></label>
          <label class="field wide">ข้อยกเว้นหรือเงื่อนไขเพิ่มเติม<textarea name="exception" placeholder="หากไม่มี ให้ระบุว่า ไม่มี">${esc(o.exception || 'ไม่มี')}</textarea></label>
        </div>
        <p class="hint">ข้อเสนอมีอายุ 48 ชั่วโมง ผู้ซื้อเห็นเงื่อนไขทั้งหมดก่อนตัดสินใจ หากแก้ไขหลังมีข้อตกลงแล้ว ทั้งสองฝ่ายต้องยืนยันฉบับใหม่</p>
        <button class="btn primary full" type="submit">${o.submitted ? 'ส่งข้อเสนอฉบับแก้ไข' : 'ส่งข้อเสนอ'}</button>
      </form>
    </section>
    <aside class="stack">
      <section class="card pad">
        <h2>เอกสารประกอบ</h2>
        <ul class="rows docs-list">${DOCS.map((d, i) => `<li><span>${d}</span>${badge(i < o.docs, 'ตรวจแล้ว', 'รอตรวจ')}</li>`).join('')}</ul>
        <p class="hint">การตรวจเอกสารยืนยันว่ามีเอกสารครบและตรงกับผู้ขาย ไม่ใช่การรับรองคุณภาพสินค้าหรือการส่งมอบ</p>
      </section>
    </aside>
  </div>`;
}

/* ---------- step 2: agreement ---------- */

function contractPage() {
  const o = chosen();
  if (!o) return heading('ข้อตกลงซื้อขาย') + (s.role === 'seller'
    ? empty('รอผู้ซื้อเลือกข้อเสนอ', 'เมื่อผู้ซื้อเลือกข้อเสนอของคุณ ระบบจะสร้างร่างข้อตกลงให้ตรวจ', 'page:offers', 'ไปที่ข้อเสนอของคุณ')
    : empty('ยังไม่ได้เลือกผู้ขาย', 'เลือกข้อเสนอก่อน ระบบจึงจะสร้างร่างข้อตกลง', 'buyer-offers', 'ไปเลือกผู้ขาย'));
  const r = rank([o], s.criteria, s.scenario)[0];
  const shippingConfirmed = (o.shipping != null && !r.unusual) || o.freightConfirmed;
  const terms = o.terms || s.amended;
  const ready = shippingConfirmed && terms;
  const mine = s[s.role];
  const blockers = [];
  if (!shippingConfirmed) blockers.push(`<div class="notice warn"><p>ค่าขนส่งยังไม่ได้ยืนยัน ค่าประมาณ ${baht(r.estimate)} ใช้จัดอันดับเท่านั้น</p>${s.role === 'seller' ? btn('ยืนยันค่าขนส่ง ' + baht(o.shipping), 'freight', 'secondary') : (ui.pendingFreight ? `<span class="waiting">${spinner}รอผู้ขายยืนยันค่าขนส่ง</span>` : btn('ขอให้ผู้ขายยืนยันค่าขนส่ง', 'ask-freight', 'secondary'))}</div>`);
  if (!terms) blockers.push('<div class="notice warn"><p>ข้อ 3 กรณีส่งมอบไม่ครบ ยังไม่ได้ตกลง ใช้ “ขอแก้ไขข้อตกลง” เพื่อเสนอเงื่อนไข</p></div>');
  if (!r.eligible) blockers.push(`<div class="notice bad"><p>${r.fails.join(' · ')} ไม่ตรงกับคำขอซื้อ ควรตกลงแก้ไขก่อนยืนยัน</p></div>`);
  const clause = (h, p) => `<li><h3>${h}</h3><p>${p}</p></li>`;
  return `${heading('ข้อตกลงซื้อขาย', `${esc(o.name)} → ${BUYER}`, btn(icon('download') + 'พิมพ์', 'print', 'secondary'))}
  <div class="split">
    <article class="card doc">
      <header class="doc-head">
        <h2>ข้อตกลงซื้อขายสินค้า</h2>
        <p class="meta">เลขที่ ST-2026-001 · ฉบับที่ ${s.version}</p>
        ${agreed() ? badge(true, 'ทั้งสองฝ่ายยืนยันแล้ว') : '<span class="badge">รอการยืนยันจากทั้งสองฝ่าย</span>'}
      </header>
      <dl class="terms">
        <div><dt>ผู้ซื้อ</dt><dd>${BUYER}</dd></div>
        <div><dt>ผู้ขาย</dt><dd>${esc(o.name)}</dd></div>
        <div><dt>สินค้า</dt><dd>อกไก่สดแช่เย็น 100 กิโลกรัม</dd></div>
        <div><dt>ราคาต่อกิโลกรัม</dt><dd>${baht(o.price)}</dd></div>
        <div><dt>ค่าขนส่ง</dt><dd>${baht(o.shipping)}${shippingConfirmed ? '' : ' · รอยืนยัน'}</dd></div>
        <div class="total"><dt>ยอดรวม</dt><dd>${baht(o.shipping == null ? null : o.price * 100 + o.shipping)}</dd></div>
      </dl>
      ${blockers.join('')}
      <ol class="clauses">
        ${clause('การส่งมอบและเกณฑ์ตรวจรับ', `จัดส่งถึงเขตปทุมวัน กรุงเทพฯ ภายใน ${o.hours} ชั่วโมงนับจากเวลาออกส่งที่บันทึก อายุสินค้าเหลือไม่น้อยกว่า ${s.criteria.minDays} วัน และอุณหภูมิขณะรับไม่เกิน 4 °C`)}
        ${clause('การตรวจรับและแจ้งปัญหา', 'ผู้ซื้อบันทึกน้ำหนัก เลขล็อต อุณหภูมิ และภาพถ่าย และแจ้งปัญหาภายใน 6 ชั่วโมงหลังรับสินค้า การบันทึกว่าสินค้ามาถึงแยกจากการยืนยันผลตรวจรับ')}
        ${clause('กรณีส่งมอบไม่ครบ', terms ? esc(o.termsText || 'ผู้ขายจัดส่งส่วนที่ขาดภายใน 24 ชั่วโมงหลังทั้งสองฝ่ายยืนยันปัญหา โดยผู้ขายรับผิดชอบค่าขนส่งเพิ่มเติม') : '<span class="bad-text">ยังไม่ได้ตกลง</span>')}
        ${clause('ความรับผิดชอบระหว่างขนส่ง', 'ผู้ขายรับผิดชอบความเสียหายระหว่างขนส่งจนกว่าผู้ซื้อจะยืนยันการรับมอบ')}
        ${clause('เงื่อนไขเพิ่มเติม', `${esc(o.exception || 'ไม่มีข้อยกเว้นเพิ่มเติม')} · ราคาคงที่ 48 ชั่วโมงนับจากยืนยันร่วมกัน เงื่อนไขการชำระเงินตกลงแยกต่างหาก`)}
      </ol>
      <details class="disclosure" data-panel="history"${openAttr('history')}><summary>ประวัติการแก้ไข</summary><div class="panel-body">
        <p>ฉบับที่ ${s.version} · ${esc(s.revisionNote || 'สร้างจากข้อเสนอที่ผู้ซื้อเลือก')}</p>
        ${s.events.filter(e => /ร่าง|แก้ไข|เลือก/.test(e.title)).map(e => `<p>${esc(e.time)} · ${esc(e.title)}${e.detail ? ' — ' + esc(e.detail) : ''}</p>`).join('')}
      </div></details>
      <p class="doc-foot">ร่างตัวอย่าง ข้อสัญญาและเกณฑ์ด้านอาหารต้องให้ผู้เชี่ยวชาญด้านกฎหมายและอาหารตรวจก่อนใช้จริง</p>
    </article>
    <aside class="stack">
      <section class="card pad">
        <h2>การยืนยันฉบับที่ ${s.version}</h2>
        <ul class="rows">${['buyer', 'seller'].map(role => `<li><span>${esc(partyName(role))}</span>${s[role] ? badge(true, undefined, undefined, ui.anim.signed === role) : mine && role === otherRole() ? `<span class="badge wait">${spinner}กำลังตรวจ</span>` : '<span class="badge">รอยืนยัน</span>'}</li>`).join('')}</ul>
        ${agreed() ? btn('ไปที่การส่งมอบ', 'page:delivery', 'primary full')
          : mine ? `<p class="waiting" role="status">ส่งให้${esc(partyName(otherRole()))}ตรวจแล้ว รอการยืนยัน</p>`
          : `
          ${ready ? '' : '<p class="hint warn-text">ยังมีเงื่อนไขที่ต้องตกลงก่อนยืนยัน</p>'}
          <label class="check"><input type="checkbox" id="consent" ${!ready ? 'disabled' : ''}><span>ฉันได้อ่านข้อตกลงฉบับที่ ${s.version} และยอมรับเงื่อนไขทั้งหมด</span></label>
          ${!r.eligible ? '<label class="check"><input type="checkbox" id="risk-consent"><span>รับทราบว่าข้อเสนอนี้ไม่ผ่านเกณฑ์ที่กำหนด</span></label>' : ''}
          <button class="btn primary full" data-action="sign" ${!ready ? 'disabled' : ''}>ยืนยันข้อตกลง</button>`}
        <p class="hint">การเลือกผู้ขายยังไม่ใช่การตกลง ทั้งสองฝ่ายต้องยืนยันฉบับเดียวกัน และทุกการแก้ไขจะล้างการยืนยันเดิม</p>
      </section>
      <details class="card pad revise" data-panel="revise"${openAttr('revise', !s.shipped && !terms)}><summary>ขอแก้ไขข้อตกลง</summary><div class="panel-body">
        ${s.shipped ? '<p class="hint">ส่งมอบแล้ว จัดการการเปลี่ยนแปลงผ่านการแจ้งปัญหา</p>' : `<form id="revision-form">
          <label class="field">สิ่งที่ต้องการแก้ไข<textarea name="note" required placeholder="เช่น ผู้ขายจัดส่งส่วนที่ขาดภายใน 24 ชั่วโมง และรับผิดชอบค่าขนส่ง"></textarea></label>
          <button class="btn secondary full" type="submit">บันทึกฉบับแก้ไข</button>
        </form>`}
      </div></details>
    </aside>
  </div>`;
}

/* ---------- step 3: delivery ---------- */

function issueInfo() {
  const weight = s.actualWeight ?? 95, temp = s.actualTemp ?? 3, diff = weight - 100, hot = temp > 4;
  const parts = [], clauses = new Set(), remedy = [];
  if (diff < 0) { parts.push('สินค้าขาด ' + (-diff) + ' กิโลกรัม'); clauses.add('ข้อ 3 กรณีส่งมอบไม่ครบ'); remedy.push('จัดส่งสินค้าเพิ่มเติม ' + (-diff) + ' กิโลกรัมภายใน 24 ชั่วโมง โดยผู้ขายรับผิดชอบค่าขนส่งเพิ่มเติม'); }
  if (diff > 0) { parts.push('สินค้าเกิน ' + diff + ' กิโลกรัม'); clauses.add('ข้อ 1 การส่งมอบและเกณฑ์ตรวจรับ'); remedy.push('รับคืนสินค้าส่วนเกิน ' + diff + ' กิโลกรัม หรือให้ผู้ซื้อเลือกเก็บไว้และชำระตามราคาต่อกิโลกรัมที่ตกลง'); }
  if (hot) { parts.push('อุณหภูมิขณะรับ ' + temp + ' °C สูงกว่าเกณฑ์ 4 °C'); clauses.add('ข้อ 1 การส่งมอบและเกณฑ์ตรวจรับ'); clauses.add('ข้อ 4 ความรับผิดชอบระหว่างขนส่ง'); remedy.push('เปลี่ยนสินค้าที่อุณหภูมิเกินเกณฑ์ภายใน 24 ชั่วโมง โดยผู้ขายรับผิดชอบค่าขนส่ง'); }
  return {weight, temp, diff, hot, summary: parts.join(' และ ') || 'ไม่พบความคลาดเคลื่อนจากเกณฑ์', clauses: [...clauses].join(' · ') || '-', remedy: remedy.length ? 'เสนอ' + remedy.join(' และ') : ''};
}

function deliveryPage() {
  const o = chosen();
  if (!o || !agreed()) return heading('ส่งมอบและหลักฐาน') + empty('รอทั้งสองฝ่ายยืนยันข้อตกลง', 'เมื่อผู้ซื้อและผู้ขายยืนยันข้อตกลงฉบับเดียวกันแล้ว จึงเริ่มส่งมอบได้', 'page:contract', 'ไปที่ข้อตกลง');
  const [cls, label] = s.acceptResolution ? ['ok', 'ตกลงแนวทางแก้ไขแล้ว'] : s.issue ? ['warn', 'กำลังจัดการปัญหา'] : s.received ? ['ok', 'ตรวจรับผ่าน'] : s.shipped ? ['', 'รอผู้ซื้อตรวจรับ'] : ['', 'รอผู้ขายส่งสินค้า'];
  return `${heading('ส่งมอบและหลักฐาน', `${esc(o.name)} → ${BUYER} · ${baht(o.price * 100 + o.shipping)} รวมค่าขนส่ง`, `<span class="badge ${cls}">${label}</span>`)}
  <div class="split">
    <div class="stack">
      ${s.issue ? issueCard() : ''}
      <section class="card pad">
        <div class="card-head"><h2>บันทึกเหตุการณ์</h2><span class="meta">ข้อตกลงฉบับที่ ${s.version}</span></div>
        <ol class="timeline">${s.events.map((e, i) => `<li${i >= (ui.anim.newEventsFrom ?? Infinity) ? ` class="new" style="animation-delay:${(i - ui.anim.newEventsFrom) * 70}ms"` : ''}><span class="meta">${esc(e.time)}</span><h3>${esc(e.title)}</h3>${e.detail ? `<p>${esc(e.detail)}</p>` : ''}</li>`).join('')}</ol>
        ${s.evidence ? `<p class="file">${icon('doc')}${esc(s.evidence.name)}<span class="meta">เก็บเฉพาะชื่อไฟล์ในเบราว์เซอร์</span></p>` : ''}
      </section>
    </div>
    <aside class="stack">${actionCard()}</aside>
  </div>`;
}

function issueCard() {
  const i = issueInfo();
  return `<section class="card pad issue${ui.anim.issueEnter ? ' enter' : ''}">
    <h2>ประเด็นที่ต้องตรวจสอบ</h2>
    <p class="issue-summary"><strong>${esc(i.summary)}</strong></p>
    <dl class="terms">
      <div><dt>ตามข้อตกลง</dt><dd>100 กิโลกรัม · ไม่เกิน 4 °C</dd></div>
      <div><dt>ผู้ซื้อบันทึก</dt><dd>${i.weight} กิโลกรัม · ${i.temp} °C</dd></div>
      <div><dt>ข้อกำหนดที่เกี่ยวข้อง</dt><dd>${i.clauses}</dd></div>
    </dl>
    <p class="hint">เป็นข้อมูลที่ผู้ซื้อแจ้ง ยังไม่ใช่ข้อสรุปว่าฝ่ายใดต้องรับผิด ผู้ขายชี้แจงพร้อมหลักฐานได้</p>
    ${btn(icon('download') + 'ดาวน์โหลดสรุปสำหรับผู้เชี่ยวชาญ', 'export', 'secondary full')}
  </section>`;
}

function actionCard() {
  const wrap = (title, body) => `<section class="card pad"><h2>${title}</h2>${body}</section>`;
  const say = t => `<p class="hint">${t}</p>`;
  if (s.role === 'seller') {
    if (!s.shipped) return wrap('บันทึกการส่งสินค้า', `<form id="ship-form">
      <div class="form-grid">
        <label class="field">เลขล็อตสินค้า<input name="lot" required value="BS-2026-001"></label>
        <label class="field">น้ำหนักที่ส่ง (กก.)<input name="weight" type="number" inputmode="numeric" required min="1" max="10000" value="100"></label>
        <label class="field wide">หลักฐานการส่ง (ไม่บังคับ)<input type="file" name="proof" accept="image/*,.pdf"></label>
      </div>
      <button type="submit" class="btn primary full">บันทึกการส่งสินค้า</button>
    </form>`);
    if (s.issue && !s.resolved) return wrap('ตอบกลับการแจ้งปัญหา', `${say('อ่านรายละเอียดที่ผู้ซื้อแจ้ง แล้วเสนอวิธีแก้ไข')}<form id="response-form">
      <label class="field">คำชี้แจงและข้อเสนอแก้ไข<textarea name="response" required>${esc(issueInfo().remedy)}</textarea></label>
      <button class="btn primary full">ส่งข้อเสนอแก้ไข</button>
    </form>`);
    if (s.acceptResolution) return wrap('สถานะการส่งสินค้า', say('ผู้ซื้อยอมรับแนวทางแก้ไขแล้ว ดำเนินการตามที่เสนอ'));
    if (s.received) return wrap('สถานะการส่งสินค้า', '<div class="notice ok"><p>ผู้ซื้อตรวจรับผ่านแล้ว</p></div>');
    return wrap('สถานะการส่งสินค้า', waitLine(s.resolved ? 'ส่งข้อเสนอแก้ไขแล้ว รอผู้ซื้อพิจารณา' : 'บันทึกการส่งแล้ว รอผู้ซื้อตรวจรับ'));
  }
  if (!s.shipped) return wrap('ตรวจรับสินค้า', waitLine(`รอ${esc(chosen().name)}ส่งสินค้า`));
  if (s.issue) {
    if (s.acceptResolution) return wrap('ตรวจรับสินค้า', say('ทั้งสองฝ่ายยอมรับแนวทางแก้ไขแล้ว ยังต้องติดตามให้ผู้ขายดำเนินการตามที่ตกลง'));
    if (s.resolved) return wrap('ข้อเสนอจากผู้ขาย', say('ผู้ขายส่งคำชี้แจงและข้อเสนอแก้ไขแล้ว ดูรายละเอียดในบันทึกเหตุการณ์') + btn('ยอมรับแนวทางแก้ไข', 'resolve', 'primary full'));
    return wrap('ตรวจรับสินค้า', waitLine('แจ้งปัญหาแล้ว รอผู้ขายตรวจสอบและเสนอวิธีแก้ไข'));
  }
  if (s.received) return wrap('ตรวจรับสินค้า', '<div class="notice ok"><p>ตรวจรับผ่านแล้ว บันทึกไว้ในเหตุการณ์</p></div>');
  return wrap('ตรวจรับสินค้า', `<form id="receive-form">
      <div class="form-grid">
        <label class="field">น้ำหนักที่ได้รับ (กก.)<input name="weight" required type="number" inputmode="decimal" min="0" max="10000" value="100"></label>
        <label class="field">อุณหภูมิขณะรับ (°C)<input name="temp" required type="number" inputmode="decimal" min="-30" max="60" value="3" step="0.1"></label>
        <label class="field wide">รูปถ่ายหรือเอกสาร (ไม่บังคับ)<input name="proof" type="file" accept="image/*,.pdf"></label>
      </div>
      <button class="btn primary full">บันทึกผลตรวจรับ</button>
    </form>
    <div class="try"><span class="meta">ลองสถานการณ์</span>${btn('สินค้าขาด 5 กก.', 'issue', 'chip')}${btn('อุณหภูมิ 7 °C', 'issue:temp', 'chip')}</div>`);
}

/* ---------- render & events ---------- */

function page() {
  if (s.page === 'contract') return contractPage();
  if (s.page === 'delivery') return deliveryPage();
  return s.role === 'buyer' ? offersPage() : supplierPage();
}

function render() {
  app.innerHTML = header() + (s.role ? `${steps()}<main id="main" class="content" tabindex="-1">${page()}</main>` : landing());
  bindForms();
  save();
}

/* ---------- motion ---------- */

const motionOK = () => !reduce.matches;

// Work out one-shot animation flags by comparing with the previous render.
function prepareAnim(sameView) {
  const done = doneMap();
  ui.anim = {
    newDone: sameView ? Object.keys(done).filter(k => done[k] && !ui.prevDone[k]) : [],
    signed: sameView ? ui.justSigned : null,
    newEventsFrom: sameView && s.page === 'delivery' && s.events.length > ui.seenEvents ? ui.seenEvents : null,
    issueEnter: sameView && s.issue && !ui.prevIssue
  };
  if (!motionOK()) ui.anim = {};
}
// The other party acts on their own after a short wait, like a real counterpart.
// Each task is derived from state; if the state changes first (or the user switches
// to play the other side), the pending task is cancelled.
const REPLY_MS = 3500;
let reply = {key: null, timer: null};
function counterpartTask() {
  if (!s.role) return null;
  const o = chosen();
  if (s.role === 'seller' && !s.selected) {
    const mine = s.offers[1];
    if (!mine.submitted) return null;
    return {key: 'select', run: () => {
      s.selected = mine.id;
      s.amended = false;
      revision('สร้างร่างจากข้อเสนอของ ' + mine.name);
      toast(BUYER + 'เลือกข้อเสนอของคุณแล้ว');
    }};
  }
  if (!o) return null;
  if (!agreed()) {
    const role = otherRole();
    if (!s[s.role] || s[role]) return null;
    return {key: 'sign:' + role + ':' + s.version, run: () => {
      s[role] = true;
      ui.justSigned = role;
      event(roleName(role) + 'ยืนยันข้อตกลงฉบับที่ ' + s.version);
      toast(partyName(role) + ' ยืนยันข้อตกลงฉบับที่ ' + s.version + ' แล้ว');
    }};
  }
  if (s.role === 'buyer') {
    if (!s.shipped) return {key: 'ship', run: () => {
      s.shipped = true;
      s.shippedWeight = 100;
      event('ผู้ขายบันทึกการส่งสินค้า', 'ล็อต BS-2026-001 · น้ำหนัก 100 กิโลกรัม');
      toast(o.name + ' ส่งสินค้าแล้ว');
    }};
    if (s.issue && !s.resolved) return {key: 'respond', run: () => {
      s.resolved = true;
      event('ผู้ขายชี้แจงและเสนอแนวทางแก้ไข', issueInfo().remedy);
      toast(o.name + ' ส่งข้อเสนอแก้ไขแล้ว');
    }};
  }
  if (s.role === 'seller') {
    if (s.shipped && !s.received && !s.issue) return {key: 'receive', run: () => {
      recordReceipt(s.shippedWeight ?? 100, 3);
      toast(s.issue ? BUYER + ' แจ้งผลตรวจรับที่ต้องตรวจสอบ' : BUYER + ' ตรวจรับผ่านแล้ว');
    }};
    if (s.resolved && !s.acceptResolution) return {key: 'accept', run: () => {
      s.acceptResolution = true;
      event('ผู้ซื้อยอมรับแนวทางแก้ไข', 'ยังไม่ถือว่าดำเนินการตามแนวทางแก้ไขเสร็จแล้ว');
      toast(BUYER + ' ยอมรับแนวทางแก้ไขแล้ว');
    }};
  }
  return null;
}
function scheduleCounterpart() {
  const task = counterpartTask();
  if (task?.key === reply.key) return;
  clearTimeout(reply.timer);
  reply = {key: task?.key ?? null, timer: null};
  if (!task) return;
  reply.timer = setTimeout(() => {
    const now = counterpartTask();
    reply = {key: null, timer: null};
    if (now?.key !== task.key) { scheduleCounterpart(); return; }
    now.run();
    update();
  }, REPLY_MS);
}

function recordReceipt(weight, temp) {
  s.issue = weight !== 100 || temp > 4;
  s.received = !s.issue;
  s.actualWeight = weight;
  s.actualTemp = temp;
  event(s.issue ? 'ผู้ซื้อแจ้งผลตรวจรับที่ต้องตรวจสอบ' : 'ผู้ซื้อตรวจรับผ่าน', 'น้ำหนัก ' + weight + ' กิโลกรัม · อุณหภูมิ ' + temp + ' °C' + (s.evidence ? ' · แนบ ' + s.evidence.name : ''));
}

function afterRender() {
  queueMicrotask(scheduleCounterpart);
  ui.prevDone = doneMap();
  ui.prevIssue = s.issue;
  ui.seenEvents = s.events.length;
  ui.justSigned = null;
  ui.anim = {};
  ui.lastView = view();
}

// #1 / #2 Sliding pill under the active segmented option or step.
function placePills(animate) {
  document.querySelectorAll('[data-slider]').forEach(group => {
    const key = group.dataset.slider;
    const p = group.querySelector(':scope > .slider-pill');
    const active = key === 'steps' ? group.querySelector(':scope > li.active') : group.querySelector(':scope > button[aria-pressed="true"]');
    if (!p) return;
    const next = active ? {x: active.offsetLeft, w: active.offsetWidth, on: 1} : {...(ui.pills[key] || {x: 0, w: 0}), on: 0};
    const prev = ui.pills[key];
    p.style.transition = 'none';
    if (animate && prev && motionOK()) {
      p.style.transform = `translateX(${prev.x}px)`;
      p.style.width = prev.w + 'px';
      p.style.opacity = prev.on;
      p.getBoundingClientRect();
      p.style.transition = '';
    }
    p.style.transform = `translateX(${next.x}px)`;
    p.style.width = next.w + 'px';
    p.style.opacity = next.on;
    ui.pills[key] = next;
  });
}

// #3 FLIP: remember where ranked items were and what score they showed.
function measure() {
  const m = {};
  document.querySelectorAll('[data-flip]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.height) m[el.dataset.flip] = {top: r.top, score: Number(el.querySelector('[data-count]')?.dataset.count)};
  });
  return m;
}
function playFlip(m) {
  if (!m || !motionOK()) return;
  document.querySelectorAll('[data-flip]').forEach(el => {
    const old = m[el.dataset.flip];
    const r = el.getBoundingClientRect();
    if (!old || !r.height) return;
    const dy = old.top - r.top;
    if (Math.abs(dy) > 1) el.animate([{transform: `translateY(${dy}px)`}, {transform: 'none'}], {duration: 420, easing: EASE});
    const c = el.querySelector('[data-count]');
    if (c && Number.isFinite(old.score) && old.score !== Number(c.dataset.count)) countTo(c, old.score, Number(c.dataset.count));
  });
}
function countTo(el, from, to) {
  const start = performance.now();
  const tick = now => {
    const k = Math.min(1, (now - start) / 450);
    el.textContent = money(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// #4 Fade the recommendation when the recommended supplier changes.
function fadeAdvice(prevTitle) {
  const now = document.querySelector('.advice-title')?.textContent;
  if (!motionOK() || prevTitle == null || now === prevTitle) return;
  document.querySelectorAll('#advice > *').forEach((el, i) => el.animate([{opacity: 0, transform: 'translateY(4px)'}, {opacity: 1, transform: 'none'}], {duration: 320, delay: i * 40, easing: EASE, fill: 'backwards'}));
}

// Same-view update: keep the screen, animate what changed.
function renderInPlace() {
  const flip = measure();
  const prevTitle = document.querySelector('.advice-title')?.textContent;
  prepareAnim(true);
  render();
  placePills(true);
  playFlip(flip);
  fadeAdvice(prevTitle);
  afterRender();
}

// #2 / #9 View change: browser view transition (or CSS fallback).
function renderNewView(source) {
  const from = ui.lastView, to = view();
  const dir = from === 'landing' ? 'hero'
    : to === 'landing' ? 'fade'
    : PAGE_ORDER[s.page] > PAGE_ORDER[from.split(':')[1]] ? 'forward'
    : PAGE_ORDER[s.page] < PAGE_ORDER[from.split(':')[1]] ? 'back' : 'fade';
  const swap = () => {
    prepareAnim(false);
    render();
    window.scrollTo(0, 0);
    if (dir === 'hero') document.querySelector('#main')?.style.setProperty('view-transition-name', 'hero');
    placePills(true);
    afterRender();
  };
  const focusMain = () => document.querySelector('#main')?.focus({preventScroll: true});
  if (!motionOK()) { swap(); focusMain(); return; }
  if (!document.startViewTransition) {
    swap();
    document.querySelector('#main')?.classList.add('enter-' + dir);
    focusMain();
    return;
  }
  document.documentElement.dataset.vt = dir;
  if (dir === 'hero' && source) source.style.viewTransitionName = 'hero';
  const t = document.startViewTransition(swap);
  t.finished.finally(() => {
    delete document.documentElement.dataset.vt;
    document.querySelector('#main')?.style.removeProperty('view-transition-name');
    focusMain();
  });
}

function update(source) {
  if (view() === ui.lastView) renderInPlace();
  else renderNewView(source);
}

// #5 Expandable panels: animate height, remember open state across renders.
app.addEventListener('click', e => {
  const summary = e.target.closest('details[data-panel] > summary');
  if (!summary) return;
  e.preventDefault();
  const d = summary.parentElement;
  const body = d.querySelector(':scope > .panel-body');
  const opening = !d.open || d.classList.contains('closing');
  ui.open[d.dataset.panel] = opening;
  d.getAnimations({subtree: true}).forEach(a => a.cancel());
  d.classList.remove('closing');
  if (!motionOK() || !body) { d.open = opening; return; }
  body.style.overflow = 'hidden';
  const done = () => { body.style.overflow = ''; };
  if (opening) {
    d.open = true;
    body.animate([{height: '0px', opacity: 0}, {height: body.scrollHeight + 'px', opacity: 1}], {duration: 300, easing: EASE}).onfinish = done;
  } else {
    d.classList.add('closing');
    body.animate([{height: body.offsetHeight + 'px', opacity: 1}, {height: '0px', opacity: 0}], {duration: 220, easing: EASE}).onfinish = () => { d.open = false; d.classList.remove('closing'); done(); };
  }
});

// Close the demo menu when clicking elsewhere.
document.addEventListener('click', e => {
  const m = document.querySelector('.demo-menu[open]');
  if (m && !m.contains(e.target)) m.open = false;
});

function revision(note) {
  if (s.selected && s.events.length === 0) s.version = 0;
  s.version++;
  s.buyer = false;
  s.seller = false;
  s.revisionNote = note;
  event('จัดทำร่างฉบับที่ ' + s.version, note);
}

app.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const [a, v] = b.dataset.action.split(':');
  if (a === 'home') s.role = null;
  if (a === 'role') s.role = v;
  if (a === 'switch') s.role = s.role === 'buyer' ? 'seller' : 'buyer';
  if (a === 'page') s.page = v;
  if (a === 'buyer-offers') { s.role = 'buyer'; s.page = 'offers'; }
  if (a === 'reset') { if (!confirm('ล้างข้อมูลและเริ่มเดโมใหม่ทั้งหมดหรือไม่')) return; s = fresh(); ui.open = {}; ui.pendingFreight = false; clearTimeout(reply.timer); reply = {key: null, timer: null}; }
  if (a === 'preset') s.criteria = {...s.criteria, ...(PRESETS[v] || PRESETS.balanced)[1]};
  if (a === 'choose') {
    if (s.shipped) { toast('เริ่มส่งมอบแล้ว ต้องเริ่มเดโมใหม่เพื่อเปลี่ยนผู้ขาย'); return; }
    if (s.selected !== Number(v)) { s.selected = Number(v); s.amended = false; revision('สร้างร่างจากข้อเสนอของ ' + chosen().name); }
    s.page = 'contract';
  }
  if (a === 'ask-freight') {
    if (ui.pendingFreight) return;
    const o = chosen();
    ui.pendingFreight = true;
    event('ผู้ซื้อขอให้ผู้ขายยืนยันค่าขนส่ง', o.name + ' · ' + baht(o.shipping));
    setTimeout(() => {
      ui.pendingFreight = false;
      if (chosen() === o && !o.freightConfirmed) {
        o.freightConfirmed = true;
        revision('ผู้ขายยืนยันค่าขนส่ง ' + baht(o.shipping));
        toast(o.name + ' ยืนยันค่าขนส่ง ' + baht(o.shipping) + ' แล้ว');
      }
      update();
    }, 3000);
  }
  if (a === 'freight') {
    if (s.role !== 'seller') return;
    const o = chosen();
    if (o.shipping == null) { toast('กรุณาระบุค่าขนส่งในข้อเสนอก่อน'); return; }
    o.freightConfirmed = true;
    revision('ผู้ขายยืนยันค่าขนส่ง ' + baht(o.shipping));
  }
  if (a === 'sign') {
    if (!document.querySelector('#consent')?.checked) { toast('กรุณายืนยันว่าได้อ่านข้อตกลงแล้ว'); return; }
    const risk = document.querySelector('#risk-consent');
    if (risk && !risk.checked) { toast('กรุณารับทราบเรื่องอายุสินค้า'); return; }
    s[s.role] = true;
    ui.justSigned = s.role;
    event((s.role === 'buyer' ? 'ผู้ซื้อ' : 'ผู้ขาย') + 'ยืนยันข้อตกลงฉบับที่ ' + s.version);
    toast('ยืนยันแล้ว ส่งให้' + partyName(otherRole()) + 'ตรวจ');
  }
  if (a === 'docs') { showDocs(s.offers.find(x => x.id === Number(v))); return; }
  if (a === 'print') { window.print(); return; }
  if (a === 'issue') {
    const temp = v === 'temp';
    s.actualWeight = temp ? 100 : 95;
    s.actualTemp = temp ? 7 : 3;
    s.issue = true;
    event('ผู้ซื้อแจ้งผลตรวจรับที่ต้องตรวจสอบ', `น้ำหนัก ${s.actualWeight} กิโลกรัม · อุณหภูมิ ${s.actualTemp} °C`);
    toast('แจ้งปัญหาแล้ว รอผู้ขายตอบกลับ');
  }
  if (a === 'resolve') { s.acceptResolution = true; event('ผู้ซื้อยอมรับแนวทางแก้ไข', 'ยังไม่ถือว่าดำเนินการตามแนวทางแก้ไขเสร็จแล้ว'); }
  if (a === 'export') { download(); return; }
  update(b);
});

app.addEventListener('input', e => {
  const form = e.target.closest('#offer-form');
  if (form) {
    const v = Object.fromEntries(new FormData(form));
    const t = document.createElement('template');
    t.innerHTML = buyerBrief(chosen() || s.offers[1], v);
    document.getElementById('buyer-brief').querySelector('.needs').replaceWith(t.content.querySelector('.needs'));
    return;
  }
  const k = e.target.dataset.crit;
  if (!k) return;
  if (k === 'allDocs') s.criteria.allDocs = e.target.checked;
  else if (e.target.value === '' || !(+e.target.value >= 0)) return; // keep the last valid value while typing
  else s.criteria[k] = Math.min(+e.target.value, +e.target.max || Infinity);
  const flip = measure();
  const prevTitle = document.querySelector('.advice-title')?.textContent;
  const t = document.createElement('template');
  t.innerHTML = offersPage();
  for (const id of ['advice', 'comparison', 'presets']) document.getElementById(id).replaceWith(t.content.getElementById(id));
  placePills(true);
  playFlip(flip);
  fadeAdvice(prevTitle);
  save();
});

app.addEventListener('change', e => { if (e.target.id === 'scenario') { s.scenario = e.target.value; update(); } });

function proof(form) { const f = new FormData(form).get('proof'); if (f?.size) s.evidence = {name: f.name, type: f.type, size: f.size}; }

function bindForms() {
  const on = (id, fn) => document.querySelector(id)?.addEventListener('submit', e => { e.preventDefault(); fn(new FormData(e.target), e.target); });
  on('#offer-form', f => {
    const o = chosen() || s.offers[1];
    if (s.shipped) { toast('เริ่มส่งมอบแล้ว ต้องเริ่มเดโมใหม่เพื่อแก้ไขข้อเสนอ'); return; }
    if (!String(f.get('terms') || '').trim()) { toast('กรุณาระบุวิธีดำเนินการกรณีส่งไม่ครบ'); return; }
    Object.assign(o, {price: +f.get('price'), shipping: +f.get('shipping'), hours: +f.get('hours'), age: +f.get('age'), terms: true, termsText: f.get('terms').trim(), exception: f.get('exception').trim(), submitted: true, freightConfirmed: false});
    event('ผู้ขายส่งข้อเสนอฉบับแก้ไข', o.name + ' · ' + money(o.price) + ' บาท/กก. · ค่าขนส่ง ' + baht(o.shipping));
    if (s.selected === o.id) revision('ปรับร่างตามข้อเสนอฉบับแก้ไขของผู้ขาย');
    toast(s.selected ? 'ส่งข้อเสนอฉบับแก้ไขแล้ว' : 'ส่งข้อเสนอแล้ว รอผู้ซื้อพิจารณา');
    update();
  });
  on('#revision-form', f => {
    const note = f.get('note').trim();
    if (!note || s.shipped) return;
    revision(note);
    s.amended = true;
    chosen().termsText = note;
    toast('บันทึกฉบับใหม่แล้ว ทั้งสองฝ่ายต้องยืนยันอีกครั้ง');
    update();
  });
  on('#ship-form', (f, form) => {
    proof(form);
    s.shipped = true;
    s.shippedWeight = +f.get('weight');
    event('ผู้ขายบันทึกการส่งสินค้า', 'ล็อต ' + f.get('lot') + ' · น้ำหนัก ' + f.get('weight') + ' กิโลกรัม' + (s.evidence ? ' · แนบ ' + s.evidence.name : ''));
    update();
  });
  on('#receive-form', (f, form) => {
    proof(form);
    recordReceipt(+f.get('weight'), +f.get('temp'));
    update();
  });
  on('#response-form', f => {
    const t = f.get('response').trim();
    if (!t) return;
    s.resolved = true;
    event('ผู้ขายชี้แจงและเสนอแนวทางแก้ไข', t);
    update();
  });
}

function showDocs(o) {
  const d = document.createElement('dialog');
  d.className = 'sheet';
  d.innerHTML = `<div class="card-head"><h2>เอกสารของ${esc(o.name)}</h2><button class="icon-btn" aria-label="ปิดรายละเอียด">${icon('close')}</button></div>
    <ul class="rows">${DOCS.map((n, i) => `<li><span>${n}</span>${badge(i < o.docs, 'ตรวจแล้ว', 'รอตรวจ')}</li>`).join('')}</ul>
    <p class="hint">การตรวจเอกสารไม่ใช่การรับรองคุณภาพสินค้า ความสามารถในการส่งมอบ หรือการรับประกันว่าจะไม่มีข้อพิพาท</p>`;
  document.body.append(d);
  const close = () => {
    if (!motionOK() || d.dataset.closing) { d.close(); return; }
    d.dataset.closing = '1';
    const phone = matchMedia('(max-width: 540px)').matches;
    d.animate([{opacity: 1, transform: 'none'}, {opacity: 0, transform: phone ? 'translateY(40%)' : 'scale(.96)'}], {duration: 180, easing: 'ease-in', fill: 'forwards'}).onfinish = () => d.close();
  };
  d.querySelector('button').onclick = close;
  d.addEventListener('click', e => { if (e.target === d) close(); });
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  d.addEventListener('close', () => d.remove());
  d.showModal();
}

function download() {
  const i = issueInfo();
  const text = [
    'SupplyTrust — สรุปเรื่องสำหรับผู้เชี่ยวชาญ (ข้อมูลจำลอง)',
    'คำขอซื้อ ST-2026-001',
    'ผู้ซื้อ: ' + BUYER,
    'ผู้ขาย: ' + chosen().name,
    'ข้อตกลงฉบับที่ ' + s.version,
    'ตามข้อตกลง: 100 กิโลกรัม · อุณหภูมิขณะรับไม่เกิน 4 °C',
    'ผลตรวจรับที่ผู้ซื้อบันทึก: ' + i.weight + ' กิโลกรัม · ' + i.temp + ' °C',
    'ประเด็นที่แจ้ง: ' + i.summary,
    'ข้อกำหนดที่เกี่ยวข้อง: ' + i.clauses,
    'ข้อกำหนดกรณีส่งไม่ครบ: ' + (chosen().termsText || 'จัดส่งส่วนที่ขาดภายใน 24 ชั่วโมง โดยผู้ขายรับผิดชอบค่าขนส่ง'),
    'ข้อมูลเป็นคำบันทึกของคู่ค้า ยังไม่มีข้อสรุปความรับผิด',
    ...s.events.map(e => e.time + ' | ' + e.title + (e.detail ? ' | ' + e.detail : '')),
    'ไฟล์ที่แนบ: ' + (s.evidence?.name || 'ไม่มี'),
    'สรุปนี้มีเฉพาะชื่อไฟล์ ไม่ได้รวมเนื้อหาไฟล์แนบ ต้องรวบรวมต้นฉบับแยกต่างหาก'
  ].join('\n\n');
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob(['﻿' + text], {type: 'text/plain;charset=utf-8'}));
  a.href = url;
  a.download = 'SupplyTrust-ST-2026-001.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

render();
placePills(false);
afterRender();
document.fonts?.ready.then(() => placePills(false));
let resizeFrame;
addEventListener('resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => placePills(false)); });

# SupplyTrust: เทคโนโลยี โครงสร้าง และวิธีพัฒนาต่อ

อ่าน [CONTEXT.md](CONTEXT.md) สำหรับเป้าหมาย ข้อกำหนดผู้ใช้ และข้อจำกัดของต้นแบบ

## 1. Framework ที่ใช้จริง

**ไม่ได้ใช้ frontend framework** โค้ดปัจจุบันเป็น Vanilla JavaScript แบบ ES Modules, HTML และ CSS และทำงานเป็น static website

แผนช่วงแรกเคยเสนอ React + Vite แต่ไม่ได้ใช้ในการสร้างจริง อย่าอ้างว่าโปรเจกต์นี้มี React, Vite, TypeScript, Tailwind หรือระบบ build

- Runtime ในเบราว์เซอร์: JavaScript, DOM APIs, localStorage, HTML forms, `<dialog>`, Blob download และ `window.print()`
- Styling: CSS custom properties (brand palette + role tokens), Grid, Flexbox, media queries ไม่มีโหมดมืด
- Font: Noto Sans Thai จาก Google Fonts พร้อม Tahoma/sans-serif fallback
- Icons: SVG path ที่กำหนดในโค้ด ไม่ใช้ icon package
- Development server: `scripts/serve.mjs` (Node.js built-in `http` ไม่มี dependency) ผ่าน `npm run dev` ใช้ได้ทั้ง Windows, macOS และ Linux
- Calculation tests: Node.js built-in `node:test` และ `node:assert/strict`
- Browser tests: Playwright + Firefox เป็นเครื่องมือภายนอก ไม่ได้ประกาศเป็น dependency ใน package.json
- ไม่มี package dependencies, bundler, compilation หรือ production build step

ถ้าจะย้าย framework ให้ทำตามคำขอหรือความจำเป็นของงาน ไม่ต้องย้ายเพื่อเริ่มแก้ข้อความหรือ CSS เล็กน้อย

## 2. โครงสร้างไฟล์

```text
LegalTechYear8/              # root ของ Git repository
├── index.html              # Thai document, stylesheet, #app และ module entry
├── app.js                  # state, rendering, events, forms และ demo workflow
├── logic.js                # initialOffers, defaults และ pure rank()
├── styles.css              # design tokens, layout, responsive และ print
├── package.json            # type: module; dev และ test scripts
├── scripts/
│   └── serve.mjs           # static server สำหรับ npm run dev (เปลี่ยนพอร์ตด้วย PORT)
├── color-reference.png     # ภาพอ้างอิงสีม่วงชุดเดิม (เลิกใช้ ดู §8)
├── tests/
│   ├── scoring.test.js     # สูตรและ edge cases 6 กรณี
│   ├── browser-firefox.cjs # browser workflow และ screenshots
│   └── browser-issues.cjs  # กรณีอุณหภูมิ/ส่งเกิน/ส่งขาด, ฟอร์มผู้ขาย, state เสีย, การ์ดมือถือ
├── screenshots/            # สร้างจาก browser tests; gitignored
├── README.md               # วิธีเริ่มและข้อจำกัดโดยย่อ
├── CONTEXT.md              # บริบทส่งต่องาน
└── ARCHITECTURE.md          # เอกสารฉบับนี้
```

## 3. วิธีเปิดใช้งาน

ต้องมี Node.js 18 ขึ้นไป (ทดสอบกับ v22) ไม่ต้องใช้ Python และไม่ต้อง `npm install`:

```bash
npm run dev
# เปลี่ยนพอร์ต: PORT=8080 npm run dev (bash) หรือ $env:PORT=8080; npm run dev (PowerShell)
```

เปิด `http://localhost:5173` ไม่ต้อง `npm install` สำหรับตัวเว็บ และไม่ควรเปิด index.html ผ่าน file:// เพราะมี ES Module imports

ตัวเว็บเป็น static assets จึงนำไฟล์ไปวางบน static hosting ได้เมื่อได้รับคำขอ ปัจจุบันไม่มี hosting manifest หรือการ deploy

server ทำงานเฉพาะขณะที่คำสั่ง `npm run dev` เปิดอยู่ อย่าเข้าใจว่าลิงก์ localhost กำลังให้บริการอยู่เสมอ

## 4. State และวงจร render

`fresh()` สร้าง state เริ่มต้นใน `app.js`; ตัวแปร `s` เป็น state ของทั้งเดโม:

| กลุ่ม | ตัวแปรหลัก |
| --- | --- |
| มุมมอง | `role`: null / buyer / seller, `page`: offers / contract / delivery |
| ข้อเสนอ | `offers`, `weights`, `scenario`, `selected` |
| ข้อตกลง | `version`, `buyer`, `seller`, `amended`, `revisionNote` |
| ส่งมอบ/ปัญหา | `shipped`, `received`, `issue`, `resolved`, `acceptResolution` |
| หลักฐาน | `events`, `evidence`; เพิ่ม `actualWeight`, `actualTemp` หลังตรวจรับ |

`buyer` และ `seller` ที่ root state เป็น boolean การยืนยัน ไม่ใช่วัตถุคู่สัญญา ชื่อและรายละเอียดคู่ค้าเป็นตัวอย่างใน UI

Storage keys:
- `supplytrust-v1`: JSON state ทั้งเดโม
- `supplytrust-theme`: เลิกใช้แล้ว (ไม่มีโหมดมืด) แอปลบ key นี้เมื่อโหลด

`render()` แทนที่ `#app.innerHTML` แล้วเรียก `bindForms()` และ `save()` ต้อง bind form listeners หลัง render ทุกครั้ง ส่วน click/input/change หลักใช้ event delegation บน `#app`

แถบเลื่อนน้ำหนักอัปเดตเฉพาะ `#advice`, `#comparison`, `#presets` และตัวเลขกำกับ เพื่อไม่ทำลาย input ระหว่างลาก อย่าเปลี่ยนกลับไป render ทั้งหน้าในทุก input event

ไม่มี URL router หรือ deep links; การเปลี่ยนหน้าใช้ state ปุ่มหน้าแรกกลับไปเลือกบทบาทโดยไม่ล้างข้อมูล ใช้เครื่องมือเริ่มใหม่เพื่อล้าง state เดโม

## 5. จุดแก้โค้ดตามงาน

| งาน | จุดเริ่มอ่าน |
| --- | --- |
| หน้าเลือกบทบาท | `landing()`, `header()` |
| เมนูเดโม ขั้นตอน และสถานการณ์ | `demoMenu()`, `steps()`, delegated change listener |
| หน้าผู้ซื้อ | `offersPage()`, `advice()`, `presets()`, `comparison()`, `offersForScenario()`, `tags()` |
| หน้าผู้ขาย | `supplierPage()`, handler ของ `#offer-form` |
| ร่างข้อตกลง | `contractPage()`, `revision()`, actions choose/freight/sign |
| การส่งและปัญหา | `deliveryPage()`, handlers ship/receive/response และ actions issue/resolve |
| เอกสารและ export | `showDocs()`, `proof()`, `download()` |
| สูตรและข้อมูลจำลอง | `logic.js` |
| สีและ responsive | `styles.css` |

`chosen()` คืนข้อเสนอที่ถูกเลือก; `agreed()` ตรวจ boolean ยืนยันทั้งสองฝ่าย; `event()` เพิ่มรายการไทม์ไลน์พร้อมเวลาจากเครื่องผู้ใช้

ข้อความผู้ใช้ที่แทรกใน HTML ต้องผ่าน `esc()` ตรวจจุดแทรกข้อความทุกครั้งเมื่อเพิ่มฟิลด์ใหม่

## 6. สูตรใน logic.js

`rank(offers, weights = defaults, scenario = 'normal')` คืนสำเนาข้อเสนอพร้อมผลคำนวณ จัดผู้ที่ผ่านเกณฑ์ก่อน แล้วเรียงคะแนนจากมากไปน้อย

- ปริมาณคงที่: 100 กก.; อายุรวม: 7 วัน; อายุเหลือขั้นต่ำ: 4 วัน
- ค่าขนส่งประมาณ = 500 + ระยะทางกิโลเมตร × 10
- ถ้าค่าขนส่งที่เสนอ < 70% ของค่าประมาณ ใช้ค่าประมาณเพื่อจัดอันดับ พร้อม `unusual=true`
- ถ้าไม่มีค่าขนส่ง ใช้ค่าประมาณเมื่อมีระยะทาง; ถ้าคำนวณไม่ได้ ค่าอาจเป็น null ไม่ใช่ศูนย์
- ต้นทุนรวม = ราคา/กก. × 100 + ค่าขนส่งที่ใช้เปรียบเทียบ
- อายุเหลือ = 7 − อายุเมื่อออกส่ง − เวลาขนส่ง/24
- คะแนนต้นทุน = ต้นทุนต่ำสุดในกลุ่ม / ต้นทุนรายนั้น
- คะแนนอายุ = อายุเหลือ/7 จำกัดช่วง 0–1
- คะแนนเวลา = max(เวลาที่เร็วสุด, 6)/เวลารายนั้น จำกัดสูงสุด 1
- คะแนนเอกสาร = จำนวนตรวจแล้ว/4
- คะแนนรวม = 100 × ผลรวมน้ำหนักคูณคะแนน / ผลรวมน้ำหนักที่มีข้อมูล
- ค่าเริ่มต้น `[40,25,15,20]`; ถ้าทุกน้ำหนักเป็น 0 ใช้ค่าเริ่มต้น
- ระยะทางไม่ทราบจะไม่นำคะแนนเวลารายนั้นมาคิด และปรับตัวหารตามด้านที่มีข้อมูล
- กรอง `expired` ก่อนคำนวณ

คำนวณตัวเลขด้วยโค้ดเสมอ คำแนะนำปัจจุบันเป็นข้อความจากกฎ หากเพิ่ม LLM ให้รับตัวเลขที่คำนวณเสร็จแล้ว

## 7. เงื่อนไขที่ต้องรักษาใน workflow

1. ผู้ซื้อกดเลือกเอง จึงสร้างร่าง; คะแนนสูงสุดไม่เลือกแทน
2. `revision()` เพิ่มเลขฉบับและล้างการยืนยันทั้งสองฝ่าย
3. ยังไม่ส่งมอบก่อน `agreed()` เป็นจริง
4. ราคาในข้อตกลงใช้ `shipping` ที่เสนอ ไม่ใช้ `freight` ประมาณจากการจัดอันดับ
5. ค่าขนส่งผิดปกติและเงื่อนไขส่งไม่ครบต้องจัดการก่อนเปิดให้ยืนยัน
6. หากเลือกผู้ขายที่อายุไม่ผ่านเกณฑ์ มีคำเตือนและช่องรับทราบเพิ่มตามสเปกต้นแบบ
7. หลังเริ่มส่งมอบ บางการแก้ข้อเสนอ/ร่างถูกปิด ต้องเริ่มเดโมใหม่หากเปลี่ยนดีล
8. การยอมรับแนวทางแก้ไขยังไม่ใช่การยืนยันว่าได้สินค้าส่วนที่ขาดครบแล้ว
9. คู่สัญญาอีกฝ่ายจำลองการตอบเอง ไม่มีปุ่ม "สลับเป็น…" ใน flow: `counterpartTask()` คืนงานถัดไปของอีกฝ่ายจาก state ปัจจุบัน และ `scheduleCounterpart()` (เรียกหลังทุก render) ตั้งเวลา `REPLY_MS` 3.5 วินาที ถ้า state เปลี่ยนหรือผู้ใช้สลับบทบาทก่อนถึงเวลา งานจะถูกยกเลิก งานที่มี: ผู้ซื้อเลือกข้อเสนอของผู้ขาย (select), อีกฝ่ายยืนยันข้อตกลงฉบับเดียวกัน (sign), ผู้ขายส่งสินค้า 100 กก. (ship), ผู้ขายตอบปัญหาด้วย `issueInfo().remedy` (respond), ผู้ซื้อตรวจรับด้วยน้ำหนักที่ผู้ขายส่งและ 3 °C (receive ผ่าน `recordReceipt()`), ผู้ซื้อยอมรับแนวทางแก้ไข (accept) ส่วน action `ask-freight` ให้ผู้ขายยืนยันค่าขนส่งหลัง 3 วินาที ตัวจับเวลาไม่ persist ถ้ารีโหลดระหว่างรอจะเริ่มนับใหม่

เงื่อนไขข้างต้นเป็นพฤติกรรมใน UI ของต้นแบบ ไม่ใช่ระบบ authorization หรือหลักฐานที่ป้องกันการแก้ไขจากภายนอก

## 8. Design system และ responsive

แนวทาง (ตกลงกับผู้ใช้ 2026-11-11): "Apple white" สีจาก brand palette ของผู้ใช้ ไม่มีโหมดมืด

Token ที่ `:root` ใน `styles.css` มี 2 ชั้น:
- Brand palette ตามที่ผู้ใช้กำหนด: `--brand-primary #E4012D`, `--brand-crimson`, `--brand-maroon`, `--brand-bright`, `--accent-orange`, `--accent-amber`, `--accent-yellow`, `--surface-cream`, `--surface-beige`, `--neutral-gray`, `--text-primary`, `--text-secondary`, `--bg`
- Role tokens ที่ component ใช้: `--page #F5F5F7`, `--surface`, `--fill`, `--line`, `--ink`, `--muted`, `--accent`, `--warn-bg/ink`, `--bad-bg/ink`, `--success/-tint`
- `--success #1A7F45` เป็นสีเดียวที่อยู่นอก palette (ผู้ใช้อนุมัติ) ใช้เฉพาะสถานะยืนยันแล้ว/ตรวจแล้ว/ขั้นตอนเสร็จ

กติกาการใช้สี:
- แดงใช้เฉพาะปุ่มหลัก ขั้นตอนปัจจุบัน ผู้ขายที่แนะนำ และโลโก้ อย่าใช้แดงกับลิงก์หรือข้อความทั่วไป
- ข้อผิดพลาด/ไม่ผ่านเกณฑ์ใช้ maroon บนพื้นชมพูอ่อน คำเตือนใช้ข้อความน้ำตาลบนพื้น cream เหลือง/amber ห้ามใช้เป็นสีข้อความ
- Font: system stack (SF Pro + Thai system font บน Apple) แล้ว fallback เป็น Noto Sans Thai

Layout:
- Header แบบ sticky blur: โลโก้, segmented control ผู้ซื้อ|ผู้ขาย, เมนู "เดโม" (`demoMenu()`) ที่รวมสถานการณ์ เริ่มใหม่ และข้อความว่าข้อมูลเป็นข้อมูลสมมติ (ข้อความทำนองนี้ต้องอยู่ที่นี่ที่เดียว)
- Stepper 3 ขั้น (`steps()`) แทน sidebar แสดงสถานะ เสร็จ/ปัจจุบัน
- Content กว้างสูงสุด 1120px; `.split` เป็นเนื้อหา + แผงด้านข้าง 340px (290px ที่ 761–960px), ต่ำกว่า 760px เรียงเป็นคอลัมน์เดียว
- ≤ 720px: การ์ดผู้ขายแทนตาราง; ≤ 540px: ฟอร์มคอลัมน์เดียว stepper แบบตัวเลขบนข้อความ
- มี `prefers-reduced-motion`, `:focus-visible`, skip link, Thai `lang` และ print styles (พิมพ์เฉพาะตัวข้อตกลง)
- กติกา unslop: ไม่ใส่ eyebrow label, icon tile ประดับ, gradient, การ์ดซ้อนการ์ด หรือข้อความ "เพื่อการสาธิต" ซ้ำ ข้อความกฎหมายสำคัญ (AI แนะนำเท่านั้น, เอกสารไม่ใช่การรับรอง, ค่าขนส่งประมาณไม่ใช่ราคาตกลง, ยืนยันฉบับเดียวกัน, ระบบไม่ตัดสินความผิด) ให้พูดครั้งเดียวในจุดที่เกี่ยวข้อง
- อย่าถือว่าขนาดการทดสอบครั้งก่อนครอบคลุมทุกจุด ควรตรวจทั้งขนาดข้างเคียงและ Safari เมื่อมีเครื่องมือ

## 9. การทดสอบ

ตรวจ syntax และสูตร:

```bash
node --check app.js
node tests/scoring.test.js
npm test
```

หกกรณี: ผู้ไม่ผ่านเกณฑ์อยู่ท้าย, ค่าขนส่งผิดปกติ, น้ำหนักรวมศูนย์, ไม่มีรายผ่าน, ข้อมูลขนส่งขาด, ข้อเสนอหมดอายุ/รายเดียว/รายการว่าง

Browser test ต้องมี Playwright และ Firefox ที่เวอร์ชันเข้ากัน:

```bash
node tests/browser-firefox.cjs
node tests/browser-issues.cjs
```

ติดตั้งครั้งแรก (ไม่บันทึกลง package.json): `npm install --no-save playwright` แล้ว `npx playwright install firefox`

หาก Playwright หรือ Firefox ติดตั้งไว้ที่อื่น ให้ชี้ path ด้วย environment variable:

```bash
PLAYWRIGHT_MODULE=<path ไปยัง node_modules/playwright> \
FIREFOX_BIN=<path ไปยัง firefox executable> \
node tests/browser-firefox.cjs
```

`FIREFOX_BIN` ใช้ override executable เมื่อจำเป็นเท่านั้น

สคริปต์ intercept URL `http://supplytrust.test/**` แล้วคืนไฟล์จาก repository จึงทดสอบได้โดยไม่เปิด HTTP listening port URL นี้เป็น origin สมมติภายใน test ไม่ใช่เว็บไซต์ที่ deploy

Screenshots อยู่ใน `screenshots/` และไม่ถูก commit การทดสอบไม่ได้ครอบคลุมทุกฟอร์ม/ทุกกรณีขอบ จึงเพิ่มกรณีที่สัมพันธ์กับการแก้ไขจริง และตรวจภาพด้วยสายตาด้วย

## 10. Git และการส่งมอบ

ทำงาน Git ที่ root ของ repository นี้

ก่อนจบงาน:
- ตรวจ diff ให้ตรงกับคำขอและไม่รวมไฟล์ชั่วคราวหรือข้อมูลลับ
- รันการตรวจที่สัมพันธ์กับการแก้ไข
- บันทึก commit ตามช่วงงาน และตรวจ working tree
- รายงานสิ่งที่ทำ ผลทดสอบ และข้อจำกัดตามจริง
- หากเปลี่ยน stack, storage schema, คำสั่งรัน หรือ workflow ให้ปรับเอกสารส่งต่อด้วย

## 11. Motion (Apple-style animation)

ทั้งหมดอยู่ส่วน `/* motion */` ใน `app.js` และ `/* Motion */` ท้าย `styles.css` ปิดอัตโนมัติเมื่อผู้ใช้ตั้ง `prefers-reduced-motion`

- ทุก action เรียก `update()` แทน `render()` ตรง ๆ: ถ้ายังอยู่หน้าเดิม (`view()` เท่าเดิม) ใช้ `renderInPlace()` ถ้าเปลี่ยนหน้า/บทบาทใช้ `renderNewView()` ผ่าน View Transitions API (`data-vt` = forward/back/fade/hero) และมี CSS fallback `enter-*`
- `ui` เก็บสถานะ animation ที่ไม่ persist: แผงที่เปิดอยู่ (`ui.open`), ตำแหน่ง pill, ค่าก่อนหน้าเพื่อหาสิ่งที่เพิ่งเปลี่ยน (`prepareAnim()` → `ui.anim` → `afterRender()`)
- Slider pill: กลุ่มที่มี `data-slider` + `.slider-pill` (บทบาท, ชุดน้ำหนัก, stepper) จัดตำแหน่งด้วย `placePills()` และจัดใหม่เมื่อ resize/โหลดฟอนต์เสร็จ
- จัดอันดับใหม่: แถว/การ์ดที่มี `data-flip` ใช้ FLIP (`measure()` → `playFlip()`) คะแนนใน `data-count` นับไปค่าใหม่
- `<details data-panel>` ต้องมีเนื้อหาใน `.panel-body` เพื่อให้ขยาย/ยุบแบบ animation และคงสถานะเปิดหลัง render
- หน้าต่างเอกสารเป็น bottom sheet บนมือถือ ปิดด้วย animation ทั้งปุ่ม คลิกพื้นหลัง และ Escape
- ใช้เฉพาะ transform/opacity (ยกเว้นความสูงของแผงที่ขยาย) อย่าเพิ่ม animation ที่ขยับ layout ทั้งหน้า

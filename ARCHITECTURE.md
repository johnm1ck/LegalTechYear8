# SupplyTrust: เทคโนโลยี โครงสร้าง และวิธีพัฒนาต่อ

อ่าน [CONTEXT.md](CONTEXT.md) สำหรับเป้าหมาย ข้อกำหนดผู้ใช้ และข้อจำกัดของต้นแบบ

## 1. Framework ที่ใช้จริง

**ไม่ได้ใช้ frontend framework** โค้ดปัจจุบันเป็น Vanilla JavaScript แบบ ES Modules, HTML และ CSS และทำงานเป็น static website

แผนช่วงแรกเคยเสนอ React + Vite แต่ไม่ได้ใช้ในการสร้างจริง อย่าอ้างว่าโปรเจกต์นี้มี React, Vite, TypeScript, Tailwind หรือระบบ build

- Runtime ในเบราว์เซอร์: JavaScript, DOM APIs, localStorage, HTML forms, `<dialog>`, Blob download และ `window.print()`
- Styling: CSS custom properties, Grid, Flexbox, media queries และ dark-mode class
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
├── styles.css              # design tokens, layout, responsive, dark และ print
├── package.json            # type: module; dev และ test scripts
├── scripts/
│   └── serve.mjs           # static server สำหรับ npm run dev (เปลี่ยนพอร์ตด้วย PORT)
├── color-reference.png     # สำเนาภาพอ้างอิงสีของผู้ใช้
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
- `supplytrust-theme`: light/dark preference

`render()` แทนที่ `#app.innerHTML` แล้วเรียก `bindForms()` และ `save()` ต้อง bind form listeners หลัง render ทุกครั้ง ส่วน click/input/change หลักใช้ event delegation บน `#app`

แถบเลื่อนน้ำหนักอัปเดตเฉพาะ `#comparison` และตัวเลขกำกับ เพื่อไม่ทำลาย input ระหว่างลาก อย่าเปลี่ยนกลับไป render ทั้งหน้าในทุก input event

ไม่มี URL router หรือ deep links; การเปลี่ยนหน้าใช้ state ปุ่มหน้าแรกกลับไปเลือกบทบาทโดยไม่ล้างข้อมูล ใช้เครื่องมือเริ่มใหม่เพื่อล้าง state เดโม

## 5. จุดแก้โค้ดตามงาน

| งาน | จุดเริ่มอ่าน |
| --- | --- |
| หน้าเลือกบทบาท | `landing()`, `header()` |
| เมนูและสถานการณ์ | `sidebar()`, delegated change listener |
| หน้าผู้ซื้อ | `request()`, `offersPage()`, `offersForScenario()`, `tags()` |
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

เงื่อนไขข้างต้นเป็นพฤติกรรมใน UI ของต้นแบบ ไม่ใช่ระบบ authorization หรือหลักฐานที่ป้องกันการแก้ไขจากภายนอก

## 8. Design system และ responsive

CSS variables หลัก: `--paper`, `--bg`, `--ink`, `--muted`, `--line`, `--primary`, `--tint`, `--green`, `--rose`, `--red`

- Light: พื้นเกือบขาว ม่วงหลัก `#735385`, พื้นม่วงอ่อน `#f1ebf7`, ชมพูอ่อน `#f6edf1`
- Dark: class `.dark` บน documentElement เปลี่ยน variables พร้อม overrides บางสถานะ
- Breakpoints ปัจจุบัน: 1600, 1150, 800, 540 px
- จอใหญ่: sidebar + content; ตารางข้อเสนอเลื่อนภายในกรอบได้
- ไม่เกิน 800 px: เมนูหลักด้านบน; ไม่เกิน 540 px: การ์ดผู้ขายแทนตารางและคอลัมน์เดียวในฟอร์ม
- มี `prefers-reduced-motion`, `:focus-visible`, skip link, Thai `lang` และ print styles
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

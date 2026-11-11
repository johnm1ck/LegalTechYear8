# SupplyTrust — ต้นแบบเว็บซื้อขายพร้อมข้อตกลงและหลักฐาน

Static prototype in Thai. Run `npm run dev` then open http://localhost:5173. No dependency installation required. Run `npm test` for scoring checks.

## Scope
Two roles share a simulated chilled-chicken purchase: sealed offers, explainable comparison, bilateral agreement revisions, simulated signatures, delivery evidence, and dispute resolution. All data, identities, document reviews, signatures, and timestamps are fictional. Nothing is sent externally. Browser storage retains the demo; reset clears it.

## Design
Formal, clear Thai. "Apple white" direction using the user's red/cream brand palette: white and light-gray surfaces, black text, red only for primary actions and emphasis, one functional green for confirmed states. No dark mode. Demo disclaimers live in a single "เดโม" menu. Responsive phone/tablet/laptop layouts, keyboard controls, and Apple-style motion (sliding segmented controls, view transitions between steps, animated re-ranking) that turns off under reduced motion. See ARCHITECTURE.md §8 and §11.

## Implementation stages
1. Repository and requirements.
2. Static interface and shared business logic.
3. Browser verification, scoring tests and refinements.

Legal and food-handling terms are illustrative drafts awaiting specialist review. Estimated freight is never inserted as an agreed price. Buyer selection alone does not confirm an agreement. A changed agreement requires both parties to confirm the same revision.

## Verification
- Firefox browser workflow: phone 390×844, tablet 820×1180, laptop 1440×1000. Full journey from comparison to bilateral confirmation, dispatch, shortage report and accepted remedy. Checked overflow, document dialog, weighting and alternative scenarios. These are viewport simulations, not physical-device or Safari certification.
- `node tests/scoring.test.js`: six calculation and edge-case checks.
- Optional browser check: install Playwright separately (`npm install --no-save playwright` and `npx playwright install firefox`), then run `node tests/browser-firefox.cjs` and `node tests/browser-issues.cjs` (temperature, over-delivery and shortage disputes, seller form data, corrupted saved state, mobile cards). Set `PLAYWRIGHT_MODULE` and `FIREFOX_BIN` if using existing local installations. The test serves local assets through browser route interception, without opening a listening port.
- Screenshots are generated in ignored `screenshots/`.
- `npm run dev` uses a dependency-free Node server (`scripts/serve.mjs`), so it works on Windows, macOS and Linux without Python. Set `PORT` to change the port.
- Uploaded files are represented by metadata only; original file contents are not persisted. Downloaded dispute summaries explicitly state that original attachments must be collected separately.

## Agent handoff
อ่าน [CONTEXT.md](CONTEXT.md) สำหรับบริบทผลิตภัณฑ์ ข้อกำหนดผู้ใช้ สถานะฟีเจอร์ และข้อจำกัด จากนั้นอ่าน [ARCHITECTURE.md](ARCHITECTURE.md) สำหรับ stack ที่ใช้จริง โครงสร้างโค้ด state สูตรคะแนน และคำสั่งทดสอบ

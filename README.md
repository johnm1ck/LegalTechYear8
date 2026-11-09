# SupplyTrust — ต้นแบบเว็บซื้อขายพร้อมข้อตกลงและหลักฐาน

Static prototype in Thai. Run `npm run dev` then open http://localhost:5173. No dependency installation required. Run `npm test` for scoring checks.

## Scope
Two roles share a simulated chilled-chicken purchase: sealed offers, explainable comparison, bilateral agreement revisions, simulated signatures, delivery evidence, and dispute resolution. All data, identities, document reviews, signatures, and timestamps are fictional. Nothing is sent externally. Browser storage retains the demo; reset clears it.

## Design
Formal, clear Thai. Muted violet/pink from the supplied reference. Responsive phone/tablet/laptop layouts, keyboard controls, reduced motion and dark mode. Application layouts take priority over marketing-page section-height conventions. User-requested violet takes priority over skill palette restrictions.

## Implementation stages
1. Repository and requirements.
2. Static interface and shared business logic.
3. Browser verification, scoring tests and refinements.

Legal and food-handling terms are illustrative drafts awaiting specialist review. Estimated freight is never inserted as an agreed price. Buyer selection alone does not confirm an agreement. A changed agreement requires both parties to confirm the same revision.

## Verification
- Firefox browser workflow: phone 390×844, tablet 820×1180, laptop 1440×1000. Full journey from comparison to bilateral confirmation, dispatch, shortage report and accepted remedy. Checked overflow, document dialog, weighting and alternative scenarios. These are viewport simulations, not physical-device or Safari certification.
- `node tests/scoring.test.js`: six calculation and edge-case checks.
- Optional browser check: install Playwright separately, then run `node tests/browser-firefox.cjs`. Set `PLAYWRIGHT_MODULE` and `FIREFOX_BIN` if using existing local installations. The test serves local assets through browser route interception, without opening a listening port.
- Screenshots are generated in ignored `screenshots/`.
- Preview server could not start in the agent's restricted execution environment (socket permission denied). Start `npm run dev` in your own terminal to view the site.
- Uploaded files are represented by metadata only; original file contents are not persisted. Downloaded dispute summaries explicitly state that original attachments must be collected separately.

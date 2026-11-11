import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rank, initialOffers, defaults} from '../logic.js';

const ids = r => r.map(o => o.id);
const cost = {perDay: 100, perHour: 5, perDoc: 100};

test('default criteria recommend Siam Fresh with the documented adjusted costs', () => {
  const r = rank(initialOffers);
  assert.deepEqual(ids(r), [1, 2, 3, 4, 5]);
  assert.deepEqual(r.slice(0, 4).map(o => o.adjusted), [8940, 9113, 9187, 9860]);
});

test('cost preset favours the cheapest eligible offer', () => {
  assert.equal(rank(initialOffers, {...defaults, ...cost})[0].id, 3);
});

test('offers missing a must-have stay last even when cheapest', () => {
  const r = rank(initialOffers, {...defaults, perDay: 0, perHour: 0, perDoc: 0});
  assert.equal(r.at(-1).id, 5);
  assert.equal(r.at(-1).eligible, false);
  assert.match(r.at(-1).fails[0], /อายุเหลือต่ำกว่า 4 วัน/);
});

test('delivery-time and document must-haves exclude offers', () => {
  const r = rank(initialOffers, {...defaults, maxHours: 9, allDocs: true});
  assert.deepEqual(r.filter(o => o.eligible).map(o => o.id), [1]);
  assert.ok(r.find(o => o.id === 4).fails.includes('ส่งนานกว่า 9 ชม.'));
  assert.ok(r.find(o => o.id === 2).fails.includes('เอกสารไม่ครบ 4 รายการ'));
});

test('abnormally low freight uses estimate, preserves quoted freight', () => {
  const o = rank(initialOffers).find(o => o.id === 3);
  assert.equal(o.shipping, 200);
  assert.equal(o.freight, 1200);
  assert.equal(o.total, 9700);
  assert.equal(o.unusual, true);
});

test('invalid criteria fall back to defaults', () => {
  assert.deepEqual(rank(initialOffers, {minDays: -1, perDay: 'x', maxHours: ''}), rank(initialOffers));
});

test('no eligible suppliers', () => assert.ok(rank(initialOffers, defaults, 'none').every(o => !o.eligible)));

test('unknown total sorts after known totals, missing freight uses estimate', () => {
  const o = structuredClone(initialOffers);
  o[0].shipping = null;
  o[1].distance = null;
  o[1].shipping = null;
  const r = rank(o);
  assert.equal(r.find(o => o.id === 1).freight, 800);
  assert.equal(r.find(o => o.id === 2).adjusted, null);
  assert.equal(r.filter(o => o.eligible).at(-1).id, 2);
});

test('expired offers excluded; single and empty lists supported', () => {
  assert.equal(rank([{...initialOffers[0], expired: true}]).length, 0);
  assert.equal(rank([initialOffers[0]]).length, 1);
  assert.deepEqual(rank([]), []);
});

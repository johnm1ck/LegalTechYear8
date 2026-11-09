import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rank,initialOffers,defaults} from '../logic.js';
test('ineligible offers stay last even with better price',()=>{const r=rank(initialOffers,[100,0,0,0]);assert.equal(r.at(-1).id,5);assert.ok(r.at(-1).score>0)});
test('abnormally low freight uses estimate, preserves quoted freight',()=>{const o=rank(initialOffers).find(o=>o.id===3);assert.equal(o.shipping,200);assert.equal(o.freight,1200);assert.equal(o.total,9700);assert.equal(o.unusual,true)});
test('zero weights fall back to defaults',()=>assert.deepEqual(rank(initialOffers,[0,0,0,0]),rank(initialOffers,defaults)));
test('no eligible suppliers',()=>assert.ok(rank(initialOffers,defaults,'none').every(o=>!o.eligible)));
test('missing freight uses estimate, missing distance remains explicit',()=>{const o=structuredClone(initialOffers);o[0].shipping=null;o[1].distance=null;o[1].shipping=null;const r=rank(o);assert.equal(r.find(o=>o.id===1).freight,800);assert.equal(r.find(o=>o.id===2).total,null);assert.ok(r.every(o=>Number.isFinite(o.score)))});
test('expired offers excluded; single and empty lists supported',()=>{assert.equal(rank([{...initialOffers[0],expired:true}]).length,0);assert.equal(rank([initialOffers[0]]).length,1);assert.deepEqual(rank([]),[])});

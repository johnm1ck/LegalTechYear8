export const initialOffers = [
 {id:1,name:'สยามเฟรชฟู้ด',area:'ปทุมธานี',initial:'ส',price:92,shipping:800,distance:30,hours:6,age:1,docs:4,new:false,terms:true},
 {id:2,name:'บ้านสวนฟาร์ม',area:'นครนายก',initial:'บ',price:88,shipping:1000,distance:50,hours:8,age:1,docs:3,new:true,terms:false},
 {id:3,name:'พร้อมส่งฟู้ดส์',area:'สมุทรปราการ',initial:'พ',price:85,shipping:200,distance:70,hours:10,age:2,docs:4,new:false,terms:true},
 {id:4,name:'กรีนวัลเลย์ฟาร์ม',area:'ราชบุรี',initial:'ก',price:90,shipping:1400,distance:90,hours:12,age:1,docs:3,new:true,terms:true},
 {id:5,name:'รุ่งเรืองโปรตีน',area:'สระบุรี',initial:'ร',price:80,shipping:900,distance:40,hours:18,age:4,docs:2,new:false,terms:false}
];

// Buyer criteria: must-haves (pass/fail) plus what each improvement is worth in baht.
export const defaults = {minDays: 4, maxHours: 24, allDocs: false, perDay: 400, perHour: 20, perDoc: 300};

export function criteria(c = {}) {
  const out = {...defaults};
  for (const k of Object.keys(defaults)) {
    if (k === 'allDocs') out.allDocs = Boolean(c.allDocs ?? defaults.allDocs);
    else if (Number.isFinite(+c[k]) && c[k] !== '' && c[k] != null && +c[k] >= 0) out[k] = +c[k];
  }
  return out;
}

// Adjusted cost = total cost − value of freshness above the minimum
//                 − value of hours saved under the limit + risk of missing documents.
// Lower is better. Offers that miss a must-have are listed last and not ranked.
export function rank(offers, input = defaults, scenario = 'normal') {
  const c = criteria(input);
  return offers.filter(o => !o.expired).map(o => {
    const estimate = o.distance == null ? null : 500 + o.distance * 10;
    const unusual = estimate != null && o.shipping != null && o.shipping < estimate * .7;
    const freight = o.shipping == null || unusual ? estimate : o.shipping;
    const total = freight == null ? null : o.price * 100 + freight;
    const remaining = 7 - (scenario === 'none' ? 5 : o.age) - o.hours / 24;
    const fails = [];
    if (remaining < c.minDays) fails.push(`อายุเหลือต่ำกว่า ${c.minDays} วัน`);
    if (o.hours > c.maxHours) fails.push(`ส่งนานกว่า ${c.maxHours} ชม.`);
    if (c.allDocs && o.docs < 4) fails.push('เอกสารไม่ครบ 4 รายการ');
    const freshValue = Math.round(Math.max(0, remaining - c.minDays) * c.perDay);
    const speedValue = Math.round(Math.max(0, c.maxHours - o.hours) * c.perHour);
    const docRisk = (4 - o.docs) * c.perDoc;
    const adjusted = total == null ? null : total - freshValue - speedValue + docRisk;
    return {...o, estimate, unusual, freight, total, remaining, fails, eligible: !fails.length, freshValue, speedValue, docRisk, adjusted};
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || (a.adjusted ?? Infinity) - (b.adjusted ?? Infinity) || a.id - b.id);
}

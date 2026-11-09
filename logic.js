export const initialOffers = [
 {id:1,name:'สยามเฟรชฟู้ด',area:'ปทุมธานี',initial:'ส',price:92,shipping:800,distance:30,hours:6,age:1,docs:4,new:false,terms:true},
 {id:2,name:'บ้านสวนฟาร์ม',area:'นครนายก',initial:'บ',price:88,shipping:1000,distance:50,hours:8,age:1,docs:3,new:true,terms:false},
 {id:3,name:'พร้อมส่งฟู้ดส์',area:'สมุทรปราการ',initial:'พ',price:85,shipping:200,distance:70,hours:10,age:2,docs:4,new:false,terms:true},
 {id:4,name:'กรีนวัลเลย์ฟาร์ม',area:'ราชบุรี',initial:'ก',price:90,shipping:1400,distance:90,hours:12,age:1,docs:3,new:true,terms:true},
 {id:5,name:'รุ่งเรืองโปรตีน',area:'สระบุรี',initial:'ร',price:80,shipping:900,distance:40,hours:18,age:4,docs:2,new:false,terms:false}
];
export const defaults=[40,25,15,20];
export function rank(offers,weights=defaults,scenario='normal'){
 const active=offers.filter(o=>!o.expired); const rows=active.map(o=>{const estimate=o.distance==null?null:500+o.distance*10; const unusual=estimate!=null&&o.shipping!=null&&o.shipping<estimate*.7; const freight=o.shipping==null||unusual?estimate:o.shipping;const remaining=7-(scenario==='none'?5:o.age)-o.hours/24;return {...o,estimate,unusual,freight,total:freight==null?null:o.price*100+freight,remaining,eligible:remaining>=4};});
 const minimum=Math.min(...rows.filter(o=>o.total!=null).map(o=>o.total)); const fastest=Math.max(6,Math.min(...rows.filter(o=>o.distance!=null).map(o=>o.hours)));const w=weights.some(Boolean)?weights:defaults;
 return rows.map(o=>{const scores=[o.total==null?null:minimum/o.total,Math.max(0,Math.min(1,o.remaining/7)),o.distance==null?null:Math.min(1,fastest/o.hours),o.docs/4];let denom=0,sum=0;scores.forEach((n,i)=>{if(n!=null){denom+=w[i];sum+=w[i]*n;}});return {...o,score:denom?100*sum/denom:0};}).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score||a.id-b.id);
}

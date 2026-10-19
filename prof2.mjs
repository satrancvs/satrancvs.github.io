import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1280,height:900}});
const reqs=[]; const t0=Date.now();
p.on('request',r=>{const u=r.url(); if(/chesspublica/.test(u)) reqs.push((Date.now()-t0)+' '+u.slice(22,80));});
await p.goto('http://localhost:4173/'); await p.waitForTimeout(6000);
console.log(await p.evaluate(()=>({fd:document.querySelectorAll('.fen-diagram').length, boards:document.querySelectorAll('.fen-diagram .jc-board-wrapper').length, imgs:document.querySelectorAll('.fen-diagram img').length, html:(document.querySelector('.fen-diagram')||{}).outerHTML?.slice(0,300)})));
console.log(reqs.join('\n'));
await b.close();

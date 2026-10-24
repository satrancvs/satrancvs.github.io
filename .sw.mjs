import { chromium } from 'playwright';
const S=process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1300, height: 900 } });
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.goto('http://localhost:4173/karlsruhe-ve-yol-ayrimlari#x'); await p.waitForTimeout(6000);
const info = await p.evaluate(()=>{
  const study=document.querySelector('pgn-study'); const pgn=document.querySelector('.cp-game pgn-study, pgn-study');
  const txt=study?.innerText||'';
  const moves=[...document.querySelectorAll('pgn-study .pgn-mainline')].map(e=>e.textContent.trim().slice(0,40));
  const game=document.querySelector('.cp-game .pgn-container:not(pgn-study .pgn-container)');
  const mainlines=game? [...game.querySelectorAll('.pgn-mainline')].map(e=>e.textContent.trim()) : [];
  return { studyMainlines: moves.length, lastStudy: moves.slice(-2), textGameMainlines: mainlines.length, lastText: mainlines.slice(-2), variations: document.querySelectorAll('.pgn-variation').length, warn: [...document.querySelectorAll('mark')].map(m=>m.textContent) };
});
console.log(JSON.stringify(info,null,1)); console.log('errors', errs.slice(0,3));
const st=p.locator('pgn-study').first(); await st.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.screenshot({path:S+'/study.png'});
await b.close();

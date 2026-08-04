import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT='E:/_Temp/st_orange'; fs.mkdirSync(OUT,{recursive:true});
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1600,height:900} });
await p.addInitScript(()=>window.localStorage.setItem('caos.theme','dark'));

for (const cs of ['concurrent','surge']) {
  await p.goto(`https://stocktwin.fasl-work.com/?case=${cs}`, {waitUntil:'networkidle'});
  await p.waitForSelector('.st-rail'); await p.waitForTimeout(3000);
  // Walk the timeline and count, per frame, whether the scene reports a reclaim job.
  // Read it off the DOM the only way the page exposes it: sample many positions and look for the
  // orange machine in the rendered canvas pixels.
  const n = await p.$eval('.st-play-scrub', e => Number(e.max));
  let orangeFrames = 0, sampled = 0;
  const cuts = cs === 'concurrent' ? 26 : 10;   // cadence
  for (let i = 1; i <= 8; i++) {
    const pos = cuts * i + 0.4;
    if (pos > n) break;
    await p.$eval('.st-play-scrub', (el,v)=>{
      const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      set.call(el,String(v)); el.dispatchEvent(new Event('input',{bubbles:true}));
    }, pos);
    await p.waitForTimeout(900);
    // count strongly-orange pixels in the canvas
    const orange = await p.evaluate(() => {
      const cv = document.querySelector('.st-canvashost canvas');
      if (!cv) return -1;
      const g = cv.getContext('webgl2') || cv.getContext('webgl');
      const w = cv.width, h = cv.height;
      const px = new Uint8Array(w*h*4);
      g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,px);
      let c=0;
      for (let k=0;k<px.length;k+=4){
        const r=px[k],gg=px[k+1],bb=px[k+2];
        if (r>150 && gg>55 && gg<135 && bb<70) c++;   // the loader's orange
      }
      return c;
    });
    sampled++;
    if (orange > 60) orangeFrames++;
    console.log(`  ${cs} pos ${pos}: orange pixels ${orange}`);
    if (i===3) await p.screenshot({path:`${OUT}/${cs}-cut.png`, clip:{x:300,y:110,width:1290,height:640}});
  }
  console.log(`${cs}: ${orangeFrames}/${sampled} sampled cut moments show an orange machine\n`);
}
await b.close();

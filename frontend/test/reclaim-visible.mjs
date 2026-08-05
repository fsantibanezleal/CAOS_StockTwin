/**
 * THE RECLAIM MACHINES HAVE TO BE ON THE STAGE, checked by clicking, in both themes.
 *
 * WHY IT EXISTS. A reader opened the product, picked the cases named for draining, and reported "no
 * orange trucks detected" and "nothing is draining mineral in all the cases that state that". Every
 * number was right: the tonnages, the grades, the provenance, the mass balance. The ore left the
 * ledger correctly and NOTHING ON SITE CARRIED IT AWAY, because the reclaim had no haul cycle at all.
 * No test could see it, because every test asserted numbers and the defect was a missing machine.
 *
 * WHY IT IS NOT A PIXEL SAMPLER, which is worth recording because it was the first attempt. Counting
 * orange in the WebGL drawing buffer matched 21022 pixels with NO cut selected at all, so it was
 * reading terrain. Narrowing to the livery's hue band, 20 to 36 degrees against haul yellow at 47 and
 * the viridis top end at 54, did not separate them either: the light-theme ground sits in the same
 * band, and the count went DOWN when a cut was selected because the pile had shrunk. Either version
 * would have passed whether or not a machine was ever drawn, which is precisely the defect it exists
 * to catch. So the renderer declares what it put on the stage, on `data-machines`, and this reads it.
 *
 * WHAT IT PROVES AND WHAT IT DOES NOT. It proves the reclaim branch ran and drew both machines on a
 * cut frame, that a build frame draws neither, and that the stage repainted between the two. It does
 * not prove the machines are unoccluded or well framed; the stage-share and no-scroll checks in
 * focus-flow.mjs cover the framing.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
// A sequential drain case: reclaim runs after the build, so a cut mark puts the machines on the
// stage without having to interleave with trucks that are still delivering.
const CASE = process.argv[3] ?? 'intensive_drain';
const SEL = '.st-stage3d [data-machines]';

const fails = [];
const ok = [];
const check = (cond, what) => (cond ? ok.push(what) : fails.push(what));

const browser = await chromium.launch();
try {
  for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });
    await page.addInitScript((t) => window.localStorage.setItem('caos.theme', t), theme);
    // `domcontentloaded`, not `networkidle`: the stage keeps a render loop alive so the network never
    // goes quiet and waiting for it just times out. Wait for the canvas, which is what matters.
    await page.goto(`${BASE}/?case=${CASE}`, { waitUntil: 'domcontentloaded' });

    const canvas = page.locator('canvas').first();
    await canvas.waitFor({ state: 'visible', timeout: 30000 });
    const stage = page.locator(SEL).first();
    await stage.waitFor({ state: 'attached', timeout: 30000 });

    // DRIVEN THROUGH THE SCRUB, which is the control a reader actually has. This used to click cut
    // ticks on the track; those were removed because on a 90-cut campaign they covered three quarters
    // of the scrub and made the timeline undraggable. A gate must not be the reason a control exists.
    const scrub = page.locator('.st-play-scrub');
    await scrub.waitFor({ state: 'visible', timeout: 30000 });
    const max = Number(await scrub.getAttribute('max'));
    check(max > 0, `[${theme}] the timeline has ${max} steps`);
    const seek = (v) =>
      scrub.evaluate((el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, String(val));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, v);

    // A BUILD FRAME FIRST, so the reclaim assertion has something to differ from. Without it the
    // gate cannot tell "the machines were drawn" from "the attribute is always set".
    await seek(Math.round(max * 0.5));
    await page.waitForTimeout(900);
    const before = await stage.getAttribute('data-machines');
    const shotBefore = await canvas.screenshot();
    check(
      !(before ?? '').includes('loader'),
      `[${theme}] a build frame draws no loader (declared "${before}")`,
    );

    // Into the reclaim half of the timeline, where the machines belong.
    await seek((max * 0.9).toFixed(2));
    // WAIT for the declaration to change rather than sampling and hoping. Sampling for a state
    // instead of waiting for it is how the focus gate passed while the return button was unclickable.
    await page
      .waitForFunction(
        (sel) => (document.querySelector(sel)?.dataset.machines ?? '').includes('loader'),
        SEL,
        { timeout: 15000 },
      )
      .catch(() => {});

    const after = await stage.getAttribute('data-machines');
    const drawn = (after ?? '').split(',').filter(Boolean);
    check(drawn.includes('loader'), `[${theme}] the LOADER is on the cut (declared "${after}")`);
    check(
      drawn.includes('truck'),
      `[${theme}] the orange TRUCK came for the material (declared "${after}")`,
    );

    const shotAfter = await canvas.screenshot();
    check(
      !shotBefore.equals(shotAfter),
      `[${theme}] the stage repainted between the two frames`,
    );
    check(shotAfter.length > 5000, `[${theme}] the cut frame rendered (${shotAfter.length} bytes)`);

    await page.close();
  }
} finally {
  await browser.close();
}

for (const line of ok) console.log(`  ok   ${line}`);
for (const line of fails) console.log(`  FAIL ${line}`);
if (fails.length) {
  console.error(`\nreclaim-visible: ${fails.length} of ${ok.length + fails.length} checks failed`);
  process.exit(1);
}
console.log(`\nreclaim-visible OK: ${ok.length} checks, both themes, case ${CASE}.`);

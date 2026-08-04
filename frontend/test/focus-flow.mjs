/**
 * THE FLOW IS THE FEATURE. ADR-0070 clause 8, verified by CLICKING.
 *
 * "Verification is by CLICKING, not by requesting a URL. A reachability check that navigates directly
 * to /focus/<id> proves the route renders; it proves nothing about whether a user can get there. The
 * gate is: load the App, click the entry control, assert the focus view rendered, click return,
 * assert the App rendered on the same scenario."
 *
 * That clause exists because exactly this failure shipped on a sibling product and was reported as
 * complete: the focus route, its deep links and its whole parameter rail were deployed with no way to
 * open any of it from the App, and it was verified by fetching the URL, which passed. This script is
 * the check that would have caught it.
 *
 * It also asserts the half the clause that is easiest to skip: the round trip preserves PARAMETER
 * state, not only the scenario. A round trip that resets the reader's work is a broken flow.
 *
 * Run: node test/focus-flow.mjs [baseURL]      (default http://127.0.0.1:4173)
 * The caller is responsible for serving the built site; `npm run gate:flow` does both.
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const fails = [];
const ok = [];

function check(cond, what) {
  (cond ? ok : fails).push(what);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}`);
}

const browser = await chromium.launch();
try {
  for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript((t) => window.localStorage.setItem('caos.theme', t), theme);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('.st-rail', { timeout: 20000 });

    // Pick a scenario that is NOT the default, so "preserved" cannot pass by accident.
    const select = page.locator('.st-case select');
    const target = await select.locator('option').nth(3).getAttribute('value');
    await select.selectOption(target);
    await page.waitForTimeout(1200);

    // And change a parameter, so "preserves parameter state" is actually exercised.
    const colour = page.locator('.st-controls .st-sel select').first();
    await colour.selectOption('thickness');
    const knob = page.locator('.st-knobs input[type=range]').first();
    await knob.evaluate((el) => {
      const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      set.call(el, '7');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(400);

    // 1. The entry control is visible in the App, on the same surface as the scenario selector.
    const entry = page.locator('.st-rail .st-focus');
    check(await entry.isVisible(), `[${theme}] the focus entry is visible in the rail`);

    // 2. Clicking it opens the focus view ON THAT SCENARIO.
    await entry.click();
    await page.waitForSelector('.fx-root', { timeout: 20000 });
    check(page.url().includes(`/focus/${target}`), `[${theme}] clicking it lands on /focus/${target}`);
    // WAIT FOR THE CANVAS, do not sample for it. The scenario is re-fetched on the focus route and
    // the WebGL context is built after it resolves, so asking whether the canvas is visible the
    // instant the root mounts is a race: it passed locally and failed on a slower CI runner, which
    // is the worst kind of green.
    const stage = page.locator('.fx-stage canvas');
    await stage.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    check(await stage.isVisible(), `[${theme}] the focus stage rendered`);

    // 3. Parameter state came across.
    const fxColour = await page.locator('.fx-field select').nth(0).inputValue();
    check(fxColour === 'thickness', `[${theme}] the colour field survived the trip in (${fxColour})`);
    check(page.url().includes('batch=7'), `[${theme}] the knob setting survived the trip in`);

    // 4. The stage clears the ADR-0070 eighty percent floor.
    const share = await page.evaluate(() => {
      const s = document.querySelector('.fx-stage');
      if (!s) return 0;
      const r = s.getBoundingClientRect();
      return (r.width * r.height) / (window.innerWidth * window.innerHeight);
    });
    check(share >= 0.8, `[${theme}] the stage owns ${(share * 100).toFixed(1)} percent of the viewport (floor 80)`);

    // 4b. THE WAY OUT IS NEVER OBSTRUCTED, including with the controls open.
    //
    // Below the docked breakpoint the parameter rail is an overlay pinned to the right edge, which
    // is exactly where the return control sits. At a lower z-index the drawer covered it: the click
    // landed on the rail heading and the reader was stuck in the focus view with no way out but the
    // browser's back button. Every earlier version of this gate clicked return on a CLOSED drawer
    // and passed, which is why it shipped. A control that exists and cannot be clicked is the same
    // failure as one that was never built.
    const handle = page.locator('.fx-railtoggle');
    if (await handle.isVisible().catch(() => false)) {
      await handle.click();
      await page.waitForTimeout(500);
      const topmost = await page.evaluate(() => {
        const r = document.querySelector('.fx-return');
        if (!r) return 'no return control';
        const b = r.getBoundingClientRect();
        const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return el ? (el.closest('.fx-return') ? 'fx-return' : `${el.tagName}.${el.className}`) : 'none';
      });
      check(topmost === 'fx-return', `[${theme}] return is clickable with the drawer OPEN (hit ${topmost})`);
      await handle.click();               // put it back
      await page.waitForTimeout(400);
    }

    // 5. The return control lands back on the App, same scenario, same work.
    const back = page.locator('.fx-return');
    check(await back.isVisible(), `[${theme}] the return control is visible`);
    await back.click();
    await page.waitForSelector('.st-rail', { timeout: 20000 });
    const backTo = await page.locator('.st-case select').inputValue();
    check(backTo === target, `[${theme}] the App came back on the same scenario (${backTo})`);
    const backColour = await page.locator('.st-controls .st-sel select').first().inputValue();
    check(backColour === 'thickness', `[${theme}] the colour field survived the trip out`);
    const backKnob = await page.locator('.st-knobs input[type=range]').first().inputValue();
    check(backKnob === '7', `[${theme}] the knob setting survived the trip out (${backKnob})`);

    // 6. And the App's own instrument floor, ADR-0071 clause 8.
    const appShare = await page.evaluate(() => {
      const s = document.querySelector('.st-canvashost');
      if (!s) return 0;
      const r = s.getBoundingClientRect();
      return (r.width * r.height) / (window.innerWidth * window.innerHeight);
    });
    check(appShare >= 0.5, `[${theme}] the App instrument owns ${(appShare * 100).toFixed(1)} percent (floor 50)`);

    // 7. The rail shows its controls WITHOUT scrolling, ADR-0071 clause 6.
    const railOverflow = await page.evaluate(() => {
      const r = document.querySelector('.st-rail');
      return r ? r.scrollHeight - r.clientHeight : 0;
    });
    check(railOverflow <= 2, `[${theme}] the rail does not scroll (overflow ${railOverflow}px)`);

    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${ok.length} passed, ${fails.length} failed`);
if (fails.length) {
  console.error('\nFAILED:\n' + fails.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

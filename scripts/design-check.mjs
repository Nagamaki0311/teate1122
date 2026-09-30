#!/usr/bin/env node
// Mechanical design checks (M0-M19) for T-026 (docs/decisions.md D-032). Not run in CI.
//
//   npm run build && python3 -m http.server 8080 -d _site
//   node scripts/design-check.mjs --base http://localhost:8080 --out /tmp/shots [--with-tests] [--advisory M4,M5] [--only M1,M2]
//
// Env: PLAYWRIGHT_PATH (default /opt/node22/lib/node_modules/playwright),
//      CHROMIUM_PATH (default /opt/pw-browsers/chromium-1194/chrome-linux/chrome).
// Output: JSON on stdout and <out>/design-check.json, screenshots in <out>. Exit 1 if any non-advisory check fails.

import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const repoRoot = fileURLToPath(new URL("../", import.meta.url));

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const BASE = arg("--base", "http://localhost:8080").replace(/\/$/, "");
const OUT = path.resolve(arg("--out", "design-check-out"));
const WITH_TESTS = argv.includes("--with-tests");
const ADVISORY = new Set((arg("--advisory", "") || "").split(",").filter(Boolean));
const ONLY = new Set((arg("--only", "") || "").split(",").filter(Boolean));
mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 375, 390, 412, 768, 820, 1024, 1440, 1920];
// Labels (--fs-label, 12px) are exempt from the "p / li >= 14px" rule of M13.
const LABEL_OK = ".kicker, .events__group-label, .tag-list__item, .events__badge, .site-footer__copyright, .candle-grid__roman";

const results = {};
const consoleErrors = [];
const wanted = (id) => ONLY.size === 0 || ONLY.has(id);
function rec(id, name, pass, detail) {
  results[id] = { name, pass, advisory: ADVISORY.has(id), detail };
  console.error(`${pass ? "PASS" : "FAIL"} ${id} ${name}${ADVISORY.has(id) ? " (advisory)" : ""}`);
}

// Injected into pages (serialised via Function#toString, so it must be self-contained).
function installHelpers() {
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s || "");
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  // Flattened background behind `el` (walks up from `start`); null if a non-grain image/gradient is involved.
  const bgOf = (start) => {
    const layers = [];
    for (let e = start; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== "none" && !/data:image\/svg\+xml/.test(cs.backgroundImage)) return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 1) break;
      }
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
    return o;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility !== "visible" || cs.display === "none") return false;
    const sx = window.scrollX, sy = window.scrollY;
    if (r.right + sx < 0 || r.bottom + sy < 0) return false; // parked off-screen (skip link, honeypot)
    return true;
  };
  const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  const desc = (el) => {
    const c = typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).join(".") : "";
    return el.tagName.toLowerCase() + c + (hasText(el) ? ` "${el.textContent.trim().slice(0, 18)}"` : "");
  };
  window.__dc = { parse, over, ratio, lum, bgOf, opacityOf, visible, hasText, desc };
}

async function open(browser, { width, height = 900, url, html, reduced, js = true, name = "" }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    reducedMotion: reduced ? "reduce" : "no-preference",
    javaScriptEnabled: js,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push({ ctx: name, kind: "console", text: m.text(), url: m.location().url });
  });
  page.on("pageerror", (e) => consoleErrors.push({ ctx: name, kind: "pageerror", text: String(e), url: "" }));
  if (html !== undefined) await page.setContent(html, { waitUntil: "load" });
  else await page.goto(url, { waitUntil: "load" });
  if (js) await page.evaluate(installHelpers);
  return page;
}
const closePage = (page) => page.context().close();

async function settle(page) {
  await page.evaluate(() => document.querySelectorAll("[data-reveal]").forEach((e) => e.setAttribute("data-in", "")));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
}

// ---- page-context measurements ---------------------------------------------------------
const measureOverflow = () => {
  const vw = window.innerWidth;
  const bad = [];
  const clipRight = (el, right) => {
    for (let a = el.parentElement; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== "visible") right = Math.min(right, a.getBoundingClientRect().right);
    }
    return right;
  };
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (getComputedStyle(el).position === "fixed") continue;
    const right = clipRight(el, r.right);
    if (r.left > -9000 && right > vw + 0.5) bad.push(window.__dc.desc(el) + ` right=${right.toFixed(1)}`);
  }
  return { scrollWidth: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 8) };
};

const measureContrast = () => {
  const { parse, over, ratio, bgOf, opacityOf, visible, hasText, desc } = window.__dc;
  const fails = [];
  let n = 0, skipped = 0, min = 99;
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "OPTION"].includes(el.tagName)) continue;
    const field = ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
    if (!hasText(el) && !field) continue;
    if (el.closest(".hero-section")) continue; // hero text sits on a photo: covered by M4/M5
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const op = opacityOf(el);
    if (op < 0.05) continue;
    const bg = bgOf(el);
    if (!bg) { skipped++; continue; }
    let fg = parse(cs.color);
    fg = { ...fg, a: fg.a * op };
    const c = over(fg, bg);
    const r = ratio(c, bg);
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    n++;
    min = Math.min(min, r);
    if (r < need) fails.push(`${desc(el)} ${r.toFixed(2)}<${need}`);
  }
  return { checked: n, skipped, min: Number(min.toFixed(2)), fails: fails.slice(0, 10) };
};

const measureTextSizes = (labelSel) => {
  const { visible, hasText, desc } = window.__dc;
  const fails = [];
  let min = 99, minP = 99, n = 0;
  for (const el of document.querySelectorAll("body *")) {
    if (["SCRIPT", "STYLE", "OPTION"].includes(el.tagName) || !hasText(el) || !visible(el)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    n++;
    min = Math.min(min, px);
    if (px < 12 - 0.01) fails.push(`${desc(el)} ${px}px<12`);
    else if ((el.tagName === "P" || el.tagName === "LI") && !el.matches(labelSel)) {
      minP = Math.min(minP, px);
      if (px < 14 - 0.01) fails.push(`${desc(el)} ${px}px<14`);
    }
  }
  return { checked: n, minPx: min, minParagraphPx: minP, fails: fails.slice(0, 10) };
};

const measureTargets = () => {
  const { visible, desc } = window.__dc;
  const fails = [];
  let n = 0;
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(sel)) {
    if (!visible(el)) continue;
    if (el.tabIndex < 0 && el.tagName !== "A") continue;
    const inline = el.tagName === "A" && el.closest("p") && getComputedStyle(el).display === "inline";
    if (inline) continue;
    const r = el.getBoundingClientRect();
    n++;
    if (r.width < 44 - 0.5 || r.height < 44 - 0.5) fails.push(`${desc(el)} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`);
  }
  return { checked: n, fails: fails.slice(0, 10) };
};

// ---- checks ----------------------------------------------------------------------------
async function m0(browser) {
  const page = await open(browser, { width: 1440, url: BASE + "/", name: "M0" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/["']/g, "")),
  );
  await closePage(page);
  const has = (fam) => loaded.filter((f) => f === fam).length;
  const pass = has("Zen Old Mincho") > 0 && has("Noto Sans JP") > 0;
  rec("M0", "Web font loaded", pass, { zenOldMincho: has("Zen Old Mincho"), notoSansJP: has("Noto Sans JP") });
  return pass;
}

async function m1(browser) {
  const detail = {};
  let pass = true;
  for (const w of WIDTHS) {
    const page = await open(browser, { width: w, url: BASE + "/", name: "M1" });
    await settle(page);
    const r = await page.evaluate(measureOverflow);
    const ok = r.scrollWidth <= r.vw && r.bad.length === 0;
    detail[w] = ok ? "ok" : r;
    pass = pass && ok;
    await closePage(page);
  }
  rec("M1", "No horizontal overflow", pass, detail);
}

async function m2(browser) {
  const detail = {};
  let pass = true;
  for (const [w, url] of [[1440, "/"], [390, "/"], [1440, "/privacy.html"], [390, "/privacy.html"]]) {
    const page = await open(browser, { width: w, url: BASE + url, name: "M2" });
    await settle(page);
    const r = await page.evaluate(measureContrast);
    if (w === 390 && url === "/") {
      await page.evaluate(() => document.getElementById("mobile-menu").showModal());
      r.menu = await page.evaluate(measureContrast);
      if (r.menu.fails.length) r.fails.push(...r.menu.fails);
    }
    detail[`${w}${url}`] = { checked: r.checked, skipped: r.skipped, min: r.min, fails: r.fails };
    pass = pass && r.fails.length === 0;
    await closePage(page);
  }
  rec("M2", "Text contrast (4.5:1 / 3:1 large)", pass, detail);
}

// M3 and M11 share the Tab walk.
async function m3m11(browser) {
  const page = await open(browser, { width: 1440, url: BASE + "/", name: "M11" });
  await settle(page);
  const stops = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const c = window.__dc.parse(cs.outlineColor);
      const bg = window.__dc.bgOf(el.parentElement);
      return {
        d: window.__dc.desc(el),
        focusVisible: el.matches(":focus-visible"),
        width: parseFloat(cs.outlineWidth),
        style: cs.outlineStyle,
        skip: el.classList.contains("skip-link"),
        ratio: c && bg ? window.__dc.ratio(window.__dc.over(c, bg), bg) : null,
      };
    });
    stops.push(s);
  }
  const real = stops.filter(Boolean);
  const noRing = real.filter((s) => !s.focusVisible || s.width < 2 || s.style === "none").map((s) => s.d);
  const lowRing = real.filter((s) => s.ratio !== null && s.ratio < 3).map((s) => `${s.d} ${s.ratio.toFixed(2)}`);
  // Input borders (non-text boundary).
  const fields = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".contact-social__field :is(input, select, textarea)")) {
      const cs = getComputedStyle(el);
      const c = window.__dc.parse(cs.borderBottomColor);
      const own = window.__dc.parse(cs.backgroundColor);
      const bg = window.__dc.bgOf(el.parentElement);
      const bw = parseFloat(cs.borderBottomWidth);
      out.push({ d: window.__dc.desc(el), bw, ratio: c && bg ? window.__dc.ratio(window.__dc.over(c, bg), bg) : null, own: own && own.a });
    }
    return out;
  });
  const lowField = fields.filter((f) => f.bw < 1 || f.ratio === null || f.ratio < 3).map((f) => `${f.d} ${f.ratio && f.ratio.toFixed(2)}`);
  rec("M3", "Non-text contrast (focus ring, input border) >= 3:1", lowRing.length === 0 && lowField.length === 0 && fields.length > 0, {
    focusStops: real.length, lowRing, minRing: Math.min(...real.map((s) => s.ratio ?? 99)).toFixed(2), fields: fields.length, lowField,
  });
  const firstIsSkip = real.length > 0 && real[0].skip;
  await closePage(page);

  // Mobile menu: opens with focus inside, Esc closes.
  const mp = await open(browser, { width: 390, height: 844, url: BASE + "/", name: "M11m" });
  await mp.click(".site-header__menu-btn");
  await mp.waitForTimeout(200);
  const inside = await mp.evaluate(() => document.getElementById("mobile-menu").contains(document.activeElement));
  await mp.keyboard.press("Escape");
  await mp.waitForTimeout(200);
  const closed = await mp.evaluate(() => !document.getElementById("mobile-menu").open);
  await closePage(mp);
  const pass = firstIsSkip && noRing.length === 0 && real.length >= 10 && inside && closed;
  rec("M11", "Keyboard: skip link first, ring >= 2px on every stop, menu focus/Esc", pass, {
    stops: real.length, firstIsSkip, noRing, menuFocusInside: inside, menuClosesOnEsc: closed,
  });
}

async function m4m5(browser) {
  const measure = async (w, h, whiteHero) => {
    const page = await open(browser, { width: w, height: h, url: "about:blank", name: "M4" });
    if (whiteHero) {
      await page.route(/assets\/hero[^/]*\.svg/, (route) =>
        route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" preserveAspectRatio="none"><rect width="10" height="10" fill="#fff"/></svg>' }),
      );
    }
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.evaluate(installHelpers);
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: ".hero-section__heading,.hero-section__body,.hero-section .kicker{visibility:hidden!important}" });
    await page.waitForTimeout(600);
    const out = {};
    for (const [key, sel, need] of [["heading", ".hero-section__heading", 3], ["body", ".hero-section__body", 4.5]]) {
      const box = await page.locator(sel).boundingBox();
      if (!box) { out[key] = { skipped: "no hero" }; continue; }
      const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.width, w), height: Math.min(box.height, h - Math.max(0, box.y)) };
      const png = (await page.screenshot({ clip })).toString("base64");
      const r = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b64;
        await img.decode();
        const cv = document.createElement("canvas");
        cv.width = img.width; cv.height = img.height;
        const cx = cv.getContext("2d");
        cx.drawImage(img, 0, 0);
        const d = cx.getImageData(0, 0, cv.width, cv.height).data;
        const ls = [];
        for (let i = 0; i < d.length; i += 4) ls.push(window.__dc.lum({ r: d[i], g: d[i + 1], b: d[i + 2] }));
        ls.sort((a, b) => b - a);
        const top = ls.slice(0, Math.max(1, Math.floor(ls.length * 0.05)));
        const L = top.reduce((a, b) => a + b, 0) / top.length;
        return 1.05 / (L + 0.05);
      }, png);
      out[key] = { ratio: Number(r.toFixed(2)), need, ok: r >= need };
    }
    await closePage(page);
    return out;
  };
  const real = {}, worst = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    real[w] = await measure(w, h, false);
    worst[w] = await measure(w, h, true);
  }
  const ok = (o) => Object.values(o).every((v) => Object.values(v).every((x) => x.skipped || x.ok));
  rec("M4", "Hero text contrast vs photo (top-5% brightness)", ok(real), real);
  rec("M5", "Hero worst case (all-white photo)", ok(worst), worst);
}

async function m6(browser) {
  const detail = {};
  let pass = true;
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, ignoreHTTPSErrors: true });
    await ctx.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: "layout-shift", buffered: true });
    });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "load" });
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += 250) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(600);
    const cls = await page.evaluate(() => window.__cls);
    detail[w] = Number(cls.toFixed(4));
    pass = pass && cls <= 0.05;
    await ctx.close();
  }
  rec("M6", "CLS <= 0.05 while scrolling to the bottom", pass, detail);
}

async function m7(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(() => {
    window.__lcp = null;
    new PerformanceObserver((l) => {
      const e = l.getEntries().pop();
      window.__lcp = { t: e.startTime, tag: e.element && e.element.tagName, cls: e.element && e.element.className, inHero: !!(e.element && e.element.closest && e.element.closest(".hero-section")) };
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => ({ lcp: window.__lcp, fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime }));
  await ctx.close();
  const gap = r.lcp && r.fcp ? r.lcp.t - r.fcp : null;
  const isHeroEl = !!(r.lcp && r.lcp.inHero && (r.lcp.tag === "IMG" || r.lcp.tag === "H1"));
  rec("M7", "LCP <= 2.5s (CPU x4, 390x844), hero element, FCP->LCP <= 300ms", !!r.lcp && r.lcp.t <= 2500 && isHeroEl && gap !== null && gap <= 300, {
    lcpMs: r.lcp && Math.round(r.lcp.t), fcpMs: r.fcp && Math.round(r.fcp), gapMs: gap && Math.round(gap), element: r.lcp && `${r.lcp.tag}.${r.lcp.cls}`,
  });
}

async function m8(browser) {
  const page = await open(browser, { width: 1440, url: BASE + "/", name: "M8" });
  await settle(page);
  const times = await page.evaluate(() => {
    const out = [];
    const tabs = [...document.querySelectorAll(".gallery__tab")];
    for (const t of tabs.slice(1).concat(tabs[0])) {
      const s = performance.now();
      t.click();
      out.push(Number((performance.now() - s).toFixed(2)));
    }
    return out;
  });
  await closePage(page);
  rec("M8", "Gallery tab click: synchronous handler < 50ms", times.length > 0 && Math.max(...times) < 50, { ms: times });
}

async function m9(browser) {
  const page = await open(browser, { width: 1440, url: BASE + "/", reduced: true, name: "M9" });
  const r = await page.evaluate(() => ({
    reveal: [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length,
    embers: getComputedStyle(document.querySelector(".hero-section__embers")).display,
    animations: document.getAnimations().length,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  await closePage(page);
  rec("M9", "prefers-reduced-motion: no motion", r.reveal === 0 && r.embers === "none" && r.animations === 0 && r.scrollBehavior === "auto", r);
}

async function m10(browser) {
  const page = await open(browser, { width: 1440, url: BASE + "/", js: false, name: "M10" });
  const r = await page.evaluate(() => {
    const c = /rgba?\(([^)]+)\)/.exec(getComputedStyle(document.querySelector(".site-header")).backgroundColor)[1].split(",").map(Number);
    return {
      hidden: [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length,
      total: document.querySelectorAll("[data-reveal]").length,
      headerAlpha: c[3] === undefined ? 1 : c[3],
    };
  });
  await closePage(page);
  rec("M10", "JS disabled: content visible, header opaque", r.total > 0 && r.hidden === 0 && r.headerAlpha >= 0.8, r);
}

async function m12(browser) {
  const page = await open(browser, { width: 390, height: 844, url: BASE + "/", name: "M12" });
  await settle(page);
  const r = await page.evaluate(measureTargets);
  await closePage(page);
  rec("M12", "Tap targets >= 44x44 at 390px", r.fails.length === 0, r);
}

async function m13(browser) {
  const detail = {};
  let pass = true;
  for (const [w, url] of [[1440, "/"], [390, "/"], [390, "/privacy.html"]]) {
    const page = await open(browser, { width: w, url: BASE + url, name: "M13" });
    await settle(page);
    const r = await page.evaluate(measureTextSizes, LABEL_OK);
    detail[`${w}${url}`] = r;
    pass = pass && r.fails.length === 0;
    await closePage(page);
  }
  rec("M13", "Min font size: text >= 12px, p/li >= 14px (labels exempt)", pass, detail);
}

function m14() {
  const real = consoleErrors.filter((e) => !/fonts\.(googleapis|gstatic)\.com/.test(e.url + e.text));
  const ignored = consoleErrors.length - real.length;
  rec("M14", "No console errors / pageerror (Google Fonts network errors excepted)", real.length === 0, { errors: real.slice(0, 10), ignoredFontErrors: ignored });
}

async function m15(browser) {
  const page = await open(browser, { width: 1440, url: BASE + "/", name: "M15" });
  await settle(page);
  await page.evaluate(() => (document.documentElement.style.scrollBehavior = "auto"));
  await page.evaluate(() => document.getElementById("events").scrollIntoView());
  await page.waitForTimeout(600);
  const r = await page.evaluate(() =>
    document.getAnimations().filter((a) => a.playState === "running" && a.effect.getComputedTiming().iterations === Infinity).map((a) => (a.effect.target ? a.effect.target.className : "?")),
  );
  await closePage(page);
  rec("M15", "Infinite animations paused while hero is off-screen", r.length === 0, { running: r.slice(0, 5), count: r.length });
}

async function m16(browser) {
  const { renderPreviewHtml, TEMPLATE_KEYS } = await import(pathToFileURL(path.join(repoRoot, "editor/src/lib/render.js")).href);
  const read = (p) => readFileSync(path.join(repoRoot, p), "utf8");
  const templates = Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, read(`src/_includes/${k}`)]));
  const data = () => ({
    home: JSON.parse(read("site-data/pages/home.json")),
    site: JSON.parse(read("site-data/site.json")),
    candles: JSON.parse(read("site-data/candles.json")),
    events: JSON.parse(read("site-data/events.json")),
  });
  const css = read("src/style.css");
  const siteJs = read("src/site.js");
  const dbl = (v) => (typeof v === "string" ? v + v : Array.isArray(v) ? v.map(dbl) : v);
  const cases = {
    "a hero hidden": (d) => { d.home.sections.find((s) => s.type === "hero").visible = false; },
    "b order reversed": (d) => { d.home.sections.reverse(); },
    "c align center": (d) => { d.home.sections.forEach((s) => (s.style.align = "center")); },
    "d align right": (d) => { d.home.sections.forEach((s) => (s.style.align = "right")); },
    "e profile image right": (d) => { d.home.sections.find((s) => s.type === "image-text").props.imagePosition = "right"; },
    "f text bg accent": (d) => { d.home.sections.filter((s) => s.type === "text").forEach((s) => (s.style.bg = { type: "token", value: "accent" })); },
    "g long heading + double text": (d) => {
      d.home.sections.find((s) => s.type === "hero").props.heading = ["灯りは手当てそして静かな", "夜のはじまりに火を灯す", "ほどけていくものがある"];
      for (const s of d.home.sections) for (const k of ["body", "paragraphs", "note", "subheading", "instagramNote"]) if (s.props[k] !== undefined) s.props[k] = dbl(s.props[k]);
      d.candles = JSON.parse(JSON.stringify(d.candles), (k, v) => (k === "note" ? dbl(v) : v));
      d.events = JSON.parse(JSON.stringify(d.events), (k, v) => (["body", "place"].includes(k) ? dbl(v) : v));
    },
    "h no events": (d) => { d.events = []; },
    "i all sections bg accent": (d) => { d.home.sections.filter((s) => s.type !== "hero").forEach((s) => (s.style.bg = { type: "token", value: "accent" })); },
  };
  const detail = {};
  let pass = true;
  for (const [name, mutate] of Object.entries(cases)) {
    const d = data();
    mutate(d);
    d.site.site.baseUrl = BASE;
    const html = renderPreviewHtml({ ...d, templates, css, siteJs });
    const row = {};
    for (const w of [390, 1440]) {
      const page = await open(browser, { width: w, html, name: `M16 ${name}` });
      await settle(page);
      const o = await page.evaluate(measureOverflow);
      const c = await page.evaluate(measureContrast);
      let fit = null;
      if (name.startsWith("g")) {
        fit = await page.evaluate(() => {
          const h = document.querySelector(".hero-section__heading"), hs = document.querySelector(".hero-section");
          const a = h.getBoundingClientRect(), b = hs.getBoundingClientRect();
          return { inside: a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5, heading: [a.width, a.height].map(Math.round), hero: [b.width, b.height].map(Math.round) };
        });
      }
      const ok = o.scrollWidth <= o.vw && o.bad.length === 0 && c.fails.length === 0 && (!fit || fit.inside);
      row[w] = ok ? { ok, minContrast: c.min, ...(fit ? { fit } : {}) } : { ok, overflow: o.bad.length ? o : undefined, contrastFails: c.fails, fit };
      pass = pass && ok;
      await closePage(page);
    }
    detail[name] = row;
  }
  rec("M16", "Resilience to edited data (preview HTML): overflow, contrast, console", pass, detail);
}

function m17() {
  const size = (p) => statSync(path.join(repoRoot, p)).size;
  const cssNow = size("src/style.css");
  const cssBase = Number(process.env.STYLE_CSS_BASE_BYTES) || Buffer.byteLength(execSync("git show HEAD:src/style.css", { cwd: repoRoot }));
  const js = size("src/site.js");
  const svgs = readdirSync(path.join(repoRoot, "src/assets")).filter((f) => f.endsWith(".svg")).map((f) => [f, size("src/assets/" + f)]);
  const bigSvg = svgs.filter(([, b]) => b > 4096).map(([f, b]) => `${f} ${b}`);
  rec("M17", "Size: style.css growth <= 14KB, site.js <= 5KB, each SVG <= 4KB", cssNow - cssBase <= 14 * 1024 && js <= 5 * 1024 && bigSvg.length === 0, {
    styleCssBytes: cssNow, styleCssBaseBytes: cssBase, styleCssGrowth: cssNow - cssBase, siteJsBytes: js, svgs: Object.fromEntries(svgs), bigSvg,
  });
}

function m18() {
  if (!WITH_TESTS) return rec("M18", "Existing tests (skipped: pass --with-tests; run npm run build first)", true, { skipped: true });
  try {
    const out = execSync("npm test 2>&1", { cwd: repoRoot, encoding: "utf8", maxBuffer: 1 << 26 });
    const g = (k) => Number((new RegExp(`# ${k} (\\d+)`).exec(out) || [])[1]);
    rec("M18", "npm test", g("fail") === 0, { tests: g("tests"), pass: g("pass"), fail: g("fail") });
  } catch (e) {
    rec("M18", "npm test", false, { error: String(e.stdout || e).slice(-600) });
  }
}

function m19() {
  const css = readFileSync(path.join(repoRoot, "src/style.css"), "utf8");
  const bad = [];
  for (const m of css.matchAll(/(?<![-\w])font-size\s*:\s*([^;}]+)/g)) {
    const v = m[1].trim();
    if (!/var\(--fs-/.test(v) && v !== "inherit") bad.push(`font-size: ${v}`);
  }
  for (const m of css.matchAll(/(?<![-\w])font\s*:\s*([^;}]+)/g)) if (/\d(px|rem|em)\b/.test(m[1])) bad.push(`font: ${m[1].trim()}`);
  for (const m of css.matchAll(/(?<![-\w])border-radius\s*:\s*([^;}]+)/g)) {
    const rest = m[1].replace(/var\(--radius-[\w-]+\)/g, "").replace(/\b0\b/g, "").replace(/[/\s]/g, "").replace(/!important/, "");
    if (rest && rest !== "inherit") bad.push(`border-radius: ${m[1].trim()}`);
  }
  rec("M19", "style.css: font-size / border-radius only via tokens", bad.length === 0, { violations: bad.slice(0, 10), count: bad.length });
}

// ---- screenshots -----------------------------------------------------------------------
async function shots(browser) {
  const files = [];
  const shot = async (page, name, opts = {}) => {
    const f = path.join(OUT, name);
    await page.screenshot({ path: f, ...opts });
    files.push(f);
  };
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const page = await open(browser, { width: w, height: h, url: "about:blank", name: "shots" });
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.evaluate(installHelpers);
    await page.waitForTimeout(300);
    await shot(page, `first-${w}-t0.3s.png`);
    await page.waitForTimeout(2200);
    await shot(page, `first-${w}-t2.5s.png`);
    await settle(page);
    await shot(page, `full-${w}.png`, { fullPage: true });
    await page.evaluate(() => (document.documentElement.style.scrollBehavior = "auto"));
    await page.evaluate(() => document.getElementById("events").scrollIntoView());
    await page.waitForTimeout(500);
    await shot(page, `mid-events-${w}.png`);
    await page.evaluate(() => document.getElementById("gallery").scrollIntoView());
    await page.click(".gallery__tab:nth-child(2)");
    await page.waitForTimeout(400);
    await shot(page, `gallery-filtered-${w}.png`);
    if (w === 390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click(".site-header__menu-btn");
      await page.waitForTimeout(600);
      await shot(page, "menu-390.png");
    }
    await closePage(page);
    const pv = await open(browser, { width: w, height: h, url: BASE + "/privacy.html", name: "shots" });
    await settle(pv);
    await shot(pv, `privacy-${w}.png`, { fullPage: true });
    await closePage(pv);
  }
  const small = await open(browser, { width: 320, height: 568, url: BASE + "/", name: "shots" });
  await small.waitForTimeout(2500);
  await shot(small, "first-320x568.png");
  await closePage(small);
  return files.map((f) => path.basename(f));
}

// ---- main ------------------------------------------------------------------------------
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--ignore-certificate-errors"],
});
let screenshots = [];
try {
  const fontsOk = wanted("M0") ? await m0(browser) : true;
  if (!fontsOk) {
    console.error("M0 failed: typography scoring is invalid without the web fonts; stopping.");
  } else {
    const steps = [
      ["M1", m1], ["M2", m2], ["M3", m3m11], ["M4", m4m5], ["M6", m6], ["M7", m7], ["M8", m8], ["M9", m9], ["M10", m10], ["M12", m12], ["M13", m13], ["M15", m15], ["M16", m16],
    ];
    for (const [id, fn] of steps) if (wanted(id) || (id === "M3" && wanted("M11")) || (id === "M4" && wanted("M5"))) await fn(browser);
    if (wanted("M17")) m17();
    if (wanted("M18")) m18();
    if (wanted("M19")) m19();
    if (ONLY.size === 0) screenshots = await shots(browser);
    if (wanted("M14")) m14();
  }
} finally {
  await browser.close();
}
const ids = Object.keys(results).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
const summary = { base: BASE, results: Object.fromEntries(ids.map((k) => [k, results[k]])), screenshots };
writeFileSync(path.join(OUT, "design-check.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
const failed = ids.filter((k) => !results[k].pass && !results[k].advisory);
if (failed.length || !results.M0?.pass) {
  console.error("FAILED: " + failed.join(", "));
  process.exit(1);
}

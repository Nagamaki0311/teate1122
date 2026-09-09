import { useEffect, useRef, useState } from "react";
import { renderPreviewHtml } from "../lib/render.js";

import baseNjk from "../../../src/_includes/base.njk?raw";
import heroNjk from "../../../src/_includes/sections/hero.njk?raw";
import textNjk from "../../../src/_includes/sections/text.njk?raw";
import imageTextNjk from "../../../src/_includes/sections/image-text.njk?raw";
import candleGridNjk from "../../../src/_includes/sections/candle-grid.njk?raw";
import eventsNjk from "../../../src/_includes/sections/events.njk?raw";
import galleryNjk from "../../../src/_includes/sections/gallery.njk?raw";
import contactSocialNjk from "../../../src/_includes/sections/contact-social.njk?raw";
import siteCss from "../../../src/style.css?raw";
import siteJsRaw from "../../../src/site.js?raw";

const TEMPLATES = {
  "base.njk": baseNjk,
  "sections/hero.njk": heroNjk,
  "sections/text.njk": textNjk,
  "sections/image-text.njk": imageTextNjk,
  "sections/candle-grid.njk": candleGridNjk,
  "sections/events.njk": eventsNjk,
  "sections/gallery.njk": galleryNjk,
  "sections/contact-social.njk": contactSocialNjk,
};

const DEBOUNCE_MS = 150;

// Renders the *real* site (real .njk templates, real style.css, real
// site.js — see lib/render.js) into a same-origin srcDoc iframe, so the
// draft is previewed exactly as it will actually look: reveal-on-scroll
// fades, gallery tab filtering, and the true responsive layout all work,
// which a React re-creation of the markup could not reproduce faithfully
// (see docs/decisions.md D-024 §3).
export default function Preview({ home, site, candles, events, pendingImages, scrollToSectionId }) {
  const iframeRef = useRef(null);
  const [srcDoc, setSrcDoc] = useState("");
  const debounceRef = useRef(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        scrollYRef.current = iframeRef.current?.contentWindow?.scrollY ?? 0;
      } catch {
        scrollYRef.current = 0;
      }
      const objectUrls = {};
      for (const entry of Object.values(pendingImages || {})) {
        objectUrls[entry.assetFile] = entry.objectUrl;
      }
      setSrcDoc(
        renderPreviewHtml({ home, site, candles, events, templates: TEMPLATES, css: siteCss, siteJs: siteJsRaw, objectUrls }),
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [home, site, candles, events, pendingImages]);

  function handleLoad() {
    try {
      iframeRef.current?.contentWindow?.scrollTo(0, scrollYRef.current);
    } catch {
      // cross-origin or not-yet-ready — nothing to restore
    }
  }

  // When a section sheet is opened, bring that section into view inside the
  // preview so the person can see what they're editing.
  useEffect(() => {
    if (!scrollToSectionId) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.document.getElementById(scrollToSectionId)?.scrollIntoView({ block: "start" });
    } catch {
      // preview not loaded yet — best effort only
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToSectionId, srcDoc]);

  return (
    <iframe
      ref={iframeRef}
      className="preview-frame"
      title="プレビュー"
      srcDoc={srcDoc}
      onLoad={handleLoad}
    />
  );
}

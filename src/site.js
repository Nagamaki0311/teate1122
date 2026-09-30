(function () {
  "use strict";

  // Fade-up reveal for [data-reveal] elements as they scroll into view.
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-in", "");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      // Stagger siblings that reveal together: 0/90/180/270ms by position among [data-reveal] siblings.
      var i = 0;
      for (var s = el.previousElementSibling; s; s = s.previousElementSibling) {
        if (s.hasAttribute("data-reveal")) i++;
      }
      el.style.setProperty("--reveal-delay", (i % 4) * 90 + "ms");
      io.observe(el);
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.setAttribute("data-in", "");
    });
  }

  // Hero on-screen state: pause its infinite animations while off-screen, and (when the hero
  // is the first section) turn the transparent header solid once the hero has scrolled away.
  var hero = document.querySelector(".hero-section");
  var header = document.querySelector(".site-header");
  if (hero && "IntersectionObserver" in window) {
    var first = hero.parentElement.firstElementChild === hero;
    new IntersectionObserver(
      function (entries) {
        var on = entries[0].isIntersecting;
        hero.toggleAttribute("data-embers-paused", !on);
        if (first && header) header.toggleAttribute("data-solid", !on);
      },
      { rootMargin: "-" + (header ? header.offsetHeight : 0) + "px 0px 0px 0px" }
    ).observe(hero);
  }

  // Candle carousel (narrow screens): focusable only while it can actually scroll, so keyboard users can scroll it.
  var candleList = document.querySelector(".candle-grid__list");
  if (candleList) {
    var syncScroll = function () {
      if (candleList.scrollWidth > candleList.clientWidth + 1) candleList.tabIndex = 0;
      else candleList.removeAttribute("tabindex");
    };
    syncScroll();
    window.addEventListener("resize", syncScroll);
  }

  // Events: the build sorts upcoming/past by build date, so re-sort by the
  // viewer's local today. Cards (upcoming form) and archive rows (past form)
  // both exist for every upcoming event; only visibility is toggled.
  var d = new Date();
  var today =
    d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  var shown = 0;
  document.querySelectorAll(".events__card").forEach(function (card) {
    card.hidden = card.getAttribute("data-date") < today;
    if (!card.hidden) shown++;
  });
  document.querySelectorAll(".events__archive-row").forEach(function (row) {
    var wasHidden = row.hidden;
    row.hidden = row.getAttribute("data-date") >= today;
    if (wasHidden && !row.hidden) row.setAttribute("data-in", "");
  });
  var empty = document.querySelector(".events__empty");
  if (empty) empty.hidden = shown > 0;

  // Gallery category tabs: show/hide items, no page reload.
  var tabs = document.querySelectorAll(".gallery__tab");
  var items = document.querySelectorAll(".gallery__item");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var filter = tab.getAttribute("data-gallery-filter");
      tabs.forEach(function (t) {
        t.setAttribute("aria-pressed", String(t === tab));
      });
      items.forEach(function (item) {
        item.hidden = filter !== "all" && item.getAttribute("data-category") !== filter;
      });
    });
  });
})();

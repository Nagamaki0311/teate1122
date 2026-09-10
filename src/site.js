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
      io.observe(el);
    });
  } else {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.setAttribute("data-in", "");
    });
  }

  // Pause the hero ember animation while the hero is off-screen.
  var hero = document.querySelector(".hero-section");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      hero.toggleAttribute("data-embers-paused", !entries[0].isIntersecting);
    }).observe(hero);
  }

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

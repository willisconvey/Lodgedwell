/* Lodgedwell — site interactions */
(function () {
  "use strict";

  /* ---- Header shadow + mobile menu ---- */
  var header = document.querySelector(".site-header");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var toggle = document.querySelector(".nav-toggle");
  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("menu-visible");
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("menu-visible");
        document.body.classList.remove("nav-open");
      });
    });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var open = item.classList.toggle("open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
      a.style.maxHeight = open ? a.scrollHeight + "px" : null;
    });
  });

  /* ---- Animated counters ---- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var prefix = el.getAttribute("data-prefix") || "";
        var dec = (el.getAttribute("data-count").split(".")[1] || "").length;
        var start = null, dur = 1400;
        var tick = function (ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = (target * eased).toFixed(dec);
          el.textContent = prefix + Number(val).toLocaleString("en-AU") + suffix;
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = prefix + target.toLocaleString("en-AU") + suffix;
        };
        requestAnimationFrame(tick);
        cObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ---- Get started: form tabs ---- */
  var tabs = document.querySelectorAll("[data-form-tab]");
  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var id = tab.getAttribute("data-form-tab");
        tabs.forEach(function (t) { t.classList.toggle("active", t === tab); });
        document.querySelectorAll("[data-form-panel]").forEach(function (panel) {
          panel.hidden = panel.getAttribute("data-form-panel") !== id;
        });
      });
    });
    // Deep link: #sell or #buy opens the right tab
    var hash = (location.hash || "").replace("#", "");
    if (hash === "sell" || hash === "buy") {
      var match = document.querySelector('[data-form-tab="' + hash + '"]');
      if (match) match.click();
    }
  }

  /* ---- Hero dashboard: animated settlement tracker ---- */
  (function () {
    var tracker = document.querySelector(".hero .tracker");
    if (!tracker) return;
    var steps = Array.prototype.slice.call(tracker.querySelectorAll(".tracker-step"));
    if (!steps.length) return;
    var bar = document.querySelector(".hero .mock-progress > i");
    var badge = document.querySelector(".hero .mock-badge");

    var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    var CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    var DOT   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/></svg>';

    function render(active, settled) {
      steps.forEach(function (step, i) {
        var dot = step.querySelector(".tracker-dot");
        step.classList.remove("done", "current", "pending");
        if (settled || i < active) {
          step.classList.add("done");
          if (dot) dot.innerHTML = CHECK;
        } else if (i === active) {
          step.classList.add("current");
          if (dot) dot.innerHTML = CLOCK;
        } else {
          step.classList.add("pending");
          if (dot) dot.innerHTML = DOT;
        }
      });
      var last = steps.length - 1;
      var pct = settled ? 100 : (last > 0 ? Math.round((active / last) * 78 + 12) : 100);
      if (bar) bar.style.width = pct + "%";
      if (badge) {
        badge.textContent = settled ? "Settled" : "On track";
        badge.classList.toggle("is-settled", !!settled);
      }
    }

    // Reduced motion: hold a sensible mid-progress state, no looping.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      render(2, false);
      return;
    }

    var seq = [], k;
    for (k = 0; k < steps.length; k++) seq.push({ active: k, settled: false });
    seq.push({ active: steps.length - 1, settled: true }); // all complete
    var idx = 0;
    render(seq[0].active, seq[0].settled);
    setInterval(function () {
      idx = (idx + 1) % seq.length;
      render(seq[idx].active, seq[idx].settled);
    }, 1900);
  })();

  /* ---- Footer year ---- */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();

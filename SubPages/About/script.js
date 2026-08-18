/* ============================================================
   ANANTA STREET — SCROLL VIDEO ENGINE (v2)
   ------------------------------------------------------------
   - No frame extraction, no ImageBitmap cache, no canvas.
   - Videos are re-encoded all-keyframe, so currentTime seeks
     are instant and exact.
   - One shared rAF loop, lerped playhead = smooth scrubbing.
   - Lazy loading: a video only downloads when it gets close
     to the viewport. Intro loads immediately.
   ============================================================ */

const CONFIG = {
  // How much scrolling each section gets (in vh, on top of the 100vh sticky screen)
  scrollPerSection: 260,
  // Playhead smoothing. Lower = smoother/heavier lag, higher = snappier.
  smoothing: 0.14,
  // Don't touch currentTime for deltas smaller than this (seconds)
  minSeekDelta: 0.003,
  // Start downloading a video when it is this many screens away
  preloadMargin: 1.25,
  // Hard cap on how long the loader may stay up
  loaderTimeout: 6000,
};

const sections = [];
let rafRunning = false;

/* ------------------------------------------------------------
   One scroll-driven video section
------------------------------------------------------------ */
class ScrubVideo {
  constructor(section, index) {
    this.section = section;
    this.index = index;
    this.src = section.dataset.video;

    this.isIntro = Number(section.dataset.autoplay || 0) > 0;
    this.autoplaySeconds = Number(section.dataset.autoplay || 0);

    this.video = section.querySelector("video:not(.extractor)");
    this.canvas = section.querySelector("canvas");

    this.duration = 0;
    this.ready = false;
    this.requested = false;
    this.introDone = !this.isIntro;

    this.current = 0;   // smoothed playhead
    this.target = 0;    // where scroll says we should be

    if (!this.video || !this.src) return;

    this.setup();
  }

  setup() {
    // The canvas is dead weight now — the <video> paints itself.
    if (this.canvas) this.canvas.style.display = "none";

    // Kill the old spacer; we size the section directly.
    const spacer = this.section.querySelector(".scroll-spacer");
    if (spacer) spacer.style.display = "none";

    this.section.style.height = `${100 + CONFIG.scrollPerSection}vh`;

    const v = this.video;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = false;
    v.autoplay = false;
    v.controls = false;
    v.playsInline = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "true");
    // Nothing downloads until we say so.
    v.preload = "none";

    Object.assign(v.style, {
      display: "block",
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      zIndex: "1",
    });

    // Any leftover second <video> from the old two-element intro hack.
    const extractor = this.section.querySelector("video.extractor");
    if (extractor) extractor.remove();

    v.addEventListener("loadedmetadata", () => {
      this.duration = v.duration || 0;
    });

    v.addEventListener("loadeddata", () => {
      this.ready = true;
      this.section.classList.add("video-ready");
      if (this.isIntro) {
        onIntroReady();
        this.playIntro();
      } else {
        try { v.currentTime = 0; } catch (e) {}
      }
    });

    v.addEventListener("error", () => {
      console.error("Video failed:", this.src, v.error);
      this.section.classList.add("video-error");
      if (this.isIntro) onIntroReady(); // never trap the user behind the loader
    });

    // Intro downloads now; the rest wait until they're near the viewport.
    if (this.isIntro) {
      this.request();
    } else {
      this.observe();
    }
  }

  request() {
    if (this.requested) return;
    this.requested = true;
    this.video.preload = "auto";
    this.video.src = this.src;
    this.video.load();
  }

  observe() {
    const margin = `${Math.round(CONFIG.preloadMargin * 100)}%`;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            this.request();
            io.disconnect();
          }
        });
      },
      { rootMargin: `${margin} 0px ${margin} 0px` }
    );
    io.observe(this.section);
  }

  /* Intro plays normally for N seconds, then hands over to scroll */
  async playIntro() {
    const v = this.video;
    const stopAt = Math.min(this.autoplaySeconds, this.duration || this.autoplaySeconds);

    const finish = () => {
      if (this.introDone) return;
      try { v.pause(); } catch (e) {}
      this.current = this.target = v.currentTime || 0;
      this.introDone = true;
    };

    try {
      await v.play();
    } catch (e) {
      // Autoplay blocked (or no decode) — hand straight over to scroll.
      finish();
      return;
    }

    const startedAt = performance.now();

    const watch = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      // Wall clock is the safety net: if playback never actually advances
      // (blocked autoplay, background tab, throttling) we still hand over.
      if (
        v.currentTime >= stopAt ||
        v.ended ||
        this.userScrolled ||
        elapsed >= stopAt + 0.5
      ) {
        finish();
        return;
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  }

  /* Where should the playhead be, given scroll position? */
  computeTarget() {
    const rect = this.section.getBoundingClientRect();
    const scrollLength = this.section.offsetHeight - window.innerHeight;
    if (scrollLength <= 0) return 0;

    const scrolled = -rect.top;
    let progress = scrolled / scrollLength;
    progress = Math.min(Math.max(progress, 0), 1);

    const dur = this.duration || 0;

    // The intro keeps whatever the autoplay already covered, then scrubs the rest.
    if (this.isIntro) {
      const start = Math.min(this.autoplaySeconds, dur);
      return start + progress * Math.max(dur - start, 0);
    }
    return progress * dur;
  }

  /* Is this section anywhere near the screen? */
  isActive() {
    const rect = this.section.getBoundingClientRect();
    return rect.bottom > -window.innerHeight && rect.top < window.innerHeight * 2;
  }

  update() {
    if (!this.ready || !this.introDone || !this.duration) return;

    if (!this.isActive()) {
      // A fast jump-scroll can skip a section entirely. Park it on the correct
      // end frame so it never shows a stale first frame when scrolled back to.
      const rect = this.section.getBoundingClientRect();
      const parked = rect.top < 0 ? this.duration - 0.001 : 0;
      if (Math.abs(this.current - parked) > 0.01) {
        this.current = this.target = parked;
        if (!this.video.seeking) {
          try { this.video.currentTime = parked; } catch (e) {}
        }
      }
      return;
    }

    this.target = this.computeTarget();

    // Ease the playhead toward the target instead of snapping to it.
    this.current += (this.target - this.current) * CONFIG.smoothing;

    const delta = Math.abs(this.current - this.video.currentTime);
    if (delta < CONFIG.minSeekDelta) return;
    if (this.video.seeking) return; // don't queue seeks on top of each other

    try {
      this.video.currentTime = Math.min(Math.max(this.current, 0), this.duration - 0.001);
    } catch (e) {}
  }
}

/* ------------------------------------------------------------
   Single shared rAF loop for every section
------------------------------------------------------------ */
let tickCount = 0;

function tick() {
  tickCount++;
  for (let i = 0; i < sections.length; i++) {
    // One misbehaving section must never kill the loop for the others.
    try { sections[i].update(); } catch (e) {}
  }
  requestAnimationFrame(tick);
}

function startLoop() {
  if (rafRunning) return;
  rafRunning = true;
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------
   Loader — tied to the intro being genuinely ready
------------------------------------------------------------ */
let loaderHidden = false;

function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;

  const loader = document.getElementById("site-loader");
  const curtain = document.getElementById("curtain");
  if (!loader) return;

  loader.classList.add("exiting");
  setTimeout(() => {
    loader.style.display = "none";
    if (curtain) curtain.classList.add("open");
  }, 1000);
}

function onIntroReady() {
  // small floor so the loader animation doesn't just flash
  const elapsed = Date.now() - bootTime;
  setTimeout(hideLoader, Math.max(0, 900 - elapsed));
}

const bootTime = Date.now();

/* ------------------------------------------------------------
   Boot
------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const isTouch = matchMedia("(hover: none)").matches;
  document.body.classList.add(isTouch ? "mobile-device" : "desktop-device");

  document.querySelectorAll(".scroll-video").forEach((section, i) => {
    sections.push(new ScrubVideo(section, i));
  });

  // Once the user scrolls, cut the intro short.
  window.addEventListener(
    "scroll",
    () => {
      const intro = sections.find((s) => s.isIntro);
      if (intro) intro.userScrolled = true;
    },
    { once: true, passive: true }
  );

  startLoop();

  // Debug handle (harmless in production)
  window.ANANTA = {
    CONFIG,
    sections,
    get ticks() { return tickCount; },
    debug: () => sections.map((s) => ({
      src: s.src,
      ready: s.ready,
      requested: s.requested,
      introDone: s.introDone,
      duration: s.duration,
      active: s.isActive ? s.isActive() : null,
      target: s.target,
      current: s.current,
      t: s.video ? s.video.currentTime : null,
    })),
  };

  // Absolute fallback so the page is never stuck behind the loader.
  setTimeout(hideLoader, CONFIG.loaderTimeout);

  /* ---------- text reveals ---------- */
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
        entry.target.classList.toggle("active", entry.isIntersecting);
      });
    },
    { threshold: 0.2 }
  );

  document
    .querySelectorAll(".reveal, .reveal-toggle, .section-title, .section-description")
    .forEach((el) => observer.observe(el));

  /* ---------- amenities stagger ---------- */
  const staggerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        document.querySelectorAll(".feature-card").forEach((item, index) => {
          setTimeout(() => item.classList.add("active"), index * 100);
        });
        staggerObserver.disconnect();
      });
    },
    { threshold: 0.2 }
  );

  const amenities = document.querySelector(".amenities-section");
  if (amenities) staggerObserver.observe(amenities);

  /* ---------- intro split text ---------- */
  const title = document.querySelector(".intro-title .layer-back") || document.querySelector(".intro-title");
  if (title && !title.dataset.split) {
    title.dataset.split = "1";
    const text = title.textContent.trim();
    title.textContent = "";
    text.split("").forEach((char, index) => {
      const span = document.createElement("span");
      span.textContent = char === " " ? " " : char;
      span.style.display = "inline-block";
      span.style.opacity = "0";
      span.style.animation = `fadeInUp 0.6s ease forwards`;
      span.style.animationDelay = `${index * 0.05}s`;
      title.appendChild(span);
    });
  }

  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .scroll-video canvas { display: none !important; }
    .scroll-video video  { display: block !important; }
  `;
  document.head.appendChild(style);

  if (typeof AOS !== "undefined") AOS.init({ duration: 1000, once: false });

  /* ---------- 3D parallax hero (pointer devices only) ---------- */
  if (!isTouch) {
    const hero = document.getElementById("hero3D");
    if (hero) {
      document.addEventListener("mousemove", (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 10;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        hero.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
      });
      document.addEventListener("mouseleave", () => {
        hero.style.transform = "rotateX(0deg) rotateY(0deg)";
      });
    }
  }
});

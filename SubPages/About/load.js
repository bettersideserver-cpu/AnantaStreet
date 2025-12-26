const AUTOPLAY_SECONDS = 1.5; // ← CHANGE THIS (seconds)
const sections = document.querySelectorAll(".scroll-video");
let previewReadyCount = 0;

function hideLoader() {
  const loader = document.getElementById("page-loader");
  loader.style.opacity = "0";
  setTimeout(() => loader.remove(), 600);
}

class ScrollVideoSection {
  constructor(section) {
    this.autoEndFrame = 0;
    this.section = section;
    this.isAuto = section.dataset.autoplay === "true";

    this.canvas = section.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.video = section.querySelector("video");

    this.src = section.dataset.video;
    this.duration = +section.dataset.duration;
    this.fps = +section.dataset.fps;
    this.sampleEvery = 2;

    this.frames = [];
    this.framesReady = false;
    this.isExtracting = false;

    this.init();
  }

  init() {
    this.section.style.height =
      `calc(100vh + ${this.duration * 100}vh)`;

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.video.src = this.src;
    this.video.load();

    this.video.addEventListener("loadedmetadata", async () => {
      // PREVIEW FRAME ONLY
      this.video.currentTime = 0;
      await new Promise(r => (this.video.onseeked = r));

      this.frames[0] = await createImageBitmap(this.video);
      this.drawFrame(0);

      previewReadyCount++;
      if (previewReadyCount === sections.length) {
        hideLoader();
      }

      if (this.isAuto) {
        setTimeout(() => this.playAuto(), 800);
      }
    });

    window.addEventListener("scroll", () => this.onScroll());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  async extractFrames() {
    if (this.framesReady || this.isExtracting) return;
    this.isExtracting = true;

    const total = Math.floor((this.duration * this.fps) / this.sampleEvery);

    for (let i = 1; i < total; i++) {
      this.video.currentTime = (i * this.sampleEvery) / this.fps;
      await new Promise(r => (this.video.onseeked = r));
      this.frames[i] = await createImageBitmap(this.video);
    }

    this.framesReady = true;
  }

  async playAuto() {
    await this.extractFrames();

    // 🔥 FADE DIM ON FIRST VIDEO AUTOPLAY
    const dim = this.section.querySelector('.video-dim-reveal');
    if (dim) {
      requestAnimationFrame(() => {
        dim.style.opacity = '0';
      });
    }

    // 🔥 START TITLE REVEAL
    playTitleReveal();

    const maxFrames = Math.floor(AUTOPLAY_SECONDS * this.fps);
    let frame = 0;
    const interval = 1000 / this.fps;

    const play = () => {
      if (frame >= maxFrames) {
        this.autoEndFrame = frame;
        this.isAuto = false;
        return;
      }
      this.drawFrame(frame++);
      setTimeout(play, interval);
    };

    play();
  }




  onScroll() {
    if (this.isAuto) return;

    this.extractFrames(); // fire & forget

    const top = this.section.offsetTop;
    const len = this.section.offsetHeight - innerHeight;

    const progress = Math.min(
      Math.max((scrollY - top) / len, 0),
      1
    );

    const totalFrames = this.frames.length - 1;
    const start = this.autoEndFrame || 0;
    const remaining = totalFrames - start;

    if (remaining <= 0) return;

    // ✅ EASE-OUT (cinematic)
    const eased = progress * (2 - progress);

    const index = start + Math.floor(eased * remaining);
    this.drawFrame(index);
  }


  drawFrame(i) {
    const frame = this.frames[i];
    if (!frame) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(frame, 0, 0, innerWidth, innerHeight);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  sections.forEach(sec => new ScrollVideoSection(sec));
});
const title = document.querySelector('.reveal-title');
const letters = title.querySelectorAll('span');

// assign stagger index
letters.forEach((span, i) => {
  span.style.setProperty('--i', i);
});

// function playTitle() {
//   title.classList.remove('hide');

//   // hide after visible
//   setTimeout(() => {
//     title.classList.add('hide');
//   }, 2600);
// }

/* =========================
   START DELAY (IMPORTANT)
========================= */

// delay before first reveal (ms)
const START_DELAY = 1500; // ← change this

setTimeout(() => {
  //playTitle();
}, START_DELAY);

/* OPTIONAL LOOP */
// setInterval(playTitle, 5000);
function playTitleReveal() {
  const title = document.querySelector('.reveal-title');
  if (!title) return;

  // reset (important for refresh)
  title.classList.remove('hide');

  title.querySelectorAll('span').forEach(span => {
    span.style.animation = 'none';
    span.offsetHeight; // force reflow
    span.style.animation = '';
  });
}

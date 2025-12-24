class ScrollVideoSection {
  constructor(section) {
    this.section = section;
    this.canvas = section.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.video = section.querySelector("video");

    this.video.crossOrigin = "anonymous";

    this.src = section.dataset.video;
    this.duration = parseFloat(section.dataset.duration);
    this.fps = parseInt(section.dataset.fps);
    this.sampleEvery = 2;

    this.totalFrames = Math.floor(
      (this.duration * this.fps) / this.sampleEvery
    );

    this.frames = [];
    this.ready = false;

    this.setup();
  }

  setup() {
    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.video.src = this.src;
    this.video.load();

    this.video.addEventListener("loadedmetadata", async () => {
      await this.extractFrames();
      this.ready = true;
      this.drawFrame(0);
    });

    window.addEventListener("scroll", () => this.onScroll());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  async extractFrames() {
    for (let i = 0; i < this.totalFrames; i++) {
      this.video.currentTime = (i * this.sampleEvery) / this.fps;

      await new Promise(resolve => {
        this.video.onseeked = resolve;
      });

      const bitmap = await createImageBitmap(this.video);
      this.frames.push(bitmap);
    }
  }

  onScroll() {
    if (!this.ready) return;

    const scrollTop = window.scrollY;
    const sectionTop = this.section.offsetTop;
    const scrollLength =
      this.section.offsetHeight - window.innerHeight;

    const progress = Math.min(
      Math.max((scrollTop - sectionTop) / scrollLength, 0),
      1
    );

    const index = Math.floor(progress * (this.frames.length - 1));
    this.drawFrame(index);
  }

  drawFrame(index) {
    if (!this.frames[index]) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(
      this.frames[index],
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".scroll-video").forEach(section => {
    new ScrollVideoSection(section);
  });
});

// scroll-decode.js (replace entire file with this)

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// CONFIG - tune these to trade memory vs smoothness
const TARGET_FPS = 60;           // target logical FPS for scrub
const SAMPLE_EVERY_NTH = 2;      // capture 1 frame out of N frames while preprocessing (2 => half density)
const DOWNSCALE_FACTOR = 1;      // downscale factor for cached bitmaps (2 => half width/height -> 1/4 memory)
const MAX_CACHE_FRAMES = 1200;   // safety cap on frames to avoid OOM

// Sensitivity configs (tweak these)
const SCROLL_INTENSITY = 1.0;  // >1 makes scrubbing more intense
const SCROLL_CURVE = 0.6;      // <1 ramps early, >1 compresses early
const PLAYBACK_SCROLL_SCALE = 2000; // px per second of video (increases scrollable distance)

let cachedBitmaps = []; // ImageBitmap[]
let duration = 0;
let capturing = false;

// Fetch + load blob then metadata
async function loadVideoBlob(path = 'video.mp4') {
    try {
        const r = await fetch(path);
        if (!r.ok) throw new Error('Fetch failed: ' + r.status);
        const ab = await r.arrayBuffer();
        const blob = new Blob([ab], { type: 'video/mp4' });
        video.src = URL.createObjectURL(blob);

        await new Promise((resolve, reject) => {
            function onMeta() { cleanup(); resolve(); }
            function onErr(e) { cleanup(); reject(e); }
            function cleanup() {
                video.removeEventListener('loadedmetadata', onMeta);
                video.removeEventListener('error', onErr);
            }
            video.addEventListener('loadedmetadata', onMeta);
            video.addEventListener('error', onErr);
        });

        duration = video.duration;
        console.log('Loaded metadata. duration:', duration);

        // set scroll length now that we know duration
        setScrollLengthBasedOnVideo();

        return true;
    } catch (e) {
        console.error('video load error', e);
        return false;
    }
}

function setScrollLengthBasedOnVideo() {
    const desiredHeight = Math.max(window.innerHeight + duration * PLAYBACK_SCROLL_SCALE, 3000);
    document.documentElement.style.height = desiredHeight + 'px';
    document.body.style.height = desiredHeight + 'px';
}

// Pre-capture frames by playing the video hidden once.
// This uses requestVideoFrameCallback (if available) for frame-perfect capture.
// It downsamples each captured frame to lower resolution using an offscreen canvas then createImageBitmap() to store it.
async function captureFrames() {
    if (capturing) return;
    capturing = true;
    cachedBitmaps = [];

    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const logicalTotalFrames = Math.floor(duration * TARGET_FPS);
    const sampleEvery = Math.max(1, SAMPLE_EVERY_NTH);
    const estimatedFrames = Math.min(Math.ceil(logicalTotalFrames / sampleEvery), MAX_CACHE_FRAMES);

    console.log('Will capture (estimated) frames:', estimatedFrames);

    // Offscreen canvas for downscaling (use regular canvas if OffscreenCanvas unsupported)
    const oc = (typeof OffscreenCanvas !== 'undefined')
        ? new OffscreenCanvas(Math.floor(vw / DOWNSCALE_FACTOR), Math.floor(vh / DOWNSCALE_FACTOR))
        : (function () {
            const c = document.createElement('canvas');
            c.width = Math.floor(vw / DOWNSCALE_FACTOR);
            c.height = Math.floor(vh / DOWNSCALE_FACTOR);
            return c;
        })();
    oc.width = Math.floor(vw / DOWNSCALE_FACTOR);
    oc.height = Math.floor(vh / DOWNSCALE_FACTOR);
    const ocCtx = oc.getContext('2d');

    let captureCount = 0;
    let frameIndex = 0;

    // Play video muted to allow rVFC to run
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0;

    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        await video.play();
        await new Promise((resolve) => {
            function onFrame(now, metadata) {
                if (frameIndex % sampleEvery === 0) {
                    ocCtx.clearRect(0, 0, oc.width, oc.height);
                    ocCtx.drawImage(video, 0, 0, vw, vh, 0, 0, oc.width, oc.height);

                    // use transferToImageBitmap for OffscreenCanvas, fallback to createImageBitmap for regular canvas
                    const maybeBitmap = (typeof OffscreenCanvas !== 'undefined' && oc.transferToImageBitmap)
                        ? oc.transferToImageBitmap()
                        : createImageBitmap(oc);

                    cachedBitmaps.push(maybeBitmap);
                    captureCount++;
                }

                frameIndex++;

                if (captureCount >= estimatedFrames || frameIndex >= logicalTotalFrames) {
                    video.pause();
                    resolve();
                    return;
                }
                video.requestVideoFrameCallback(onFrame);
            }
            video.requestVideoFrameCallback(onFrame);
        });

        // Resolve any promises returned by createImageBitmap
        cachedBitmaps = await Promise.all(cachedBitmaps);
        console.log('Captured frames:', cachedBitmaps.length);
    } else {
        // fallback using seeking (slower)
        console.warn('requestVideoFrameCallback not supported; using seek fallback (slower).');
        const total = Math.floor(duration * TARGET_FPS);
        for (let i = 0; i < total; i += sampleEvery) {
            const t = (i / TARGET_FPS);
            await new Promise((res) => {
                const onSeek = async () => {
                    video.removeEventListener('seeked', onSeek);
                    ocCtx.clearRect(0, 0, oc.width, oc.height);
                    ocCtx.drawImage(video, 0, 0, vw, vh, 0, 0, oc.width, oc.height);
                    const bm = await createImageBitmap(oc);
                    cachedBitmaps.push(bm);
                    res();
                };
                video.addEventListener('seeked', onSeek);
                video.currentTime = Math.min(t, duration);
            });
            if (cachedBitmaps.length >= MAX_CACHE_FRAMES) break;
        }
        console.log('Captured (seek fallback) frames:', cachedBitmaps.length);
    }

    capturing = false;
}

// CONFIG: no easing, linear mapping
// remove SCROLL_CURVE entirely or ignore it

function indexFromScroll() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  let frac = maxScroll <= 0 ? 0 : (window.scrollY / maxScroll);
  frac = Math.min(Math.max(frac, 0), 1);

  if (!cachedBitmaps.length) return 0;
  const idx = Math.floor(frac * (cachedBitmaps.length - 1));
  return Math.max(0, Math.min(cachedBitmaps.length - 1, idx));
}


// draw frame
function drawCached(index) {
    if (!cachedBitmaps.length) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }
    const bm = cachedBitmaps[index];
    if (!bm) return;

    const cw = canvas.width, ch = canvas.height;
    const bw = bm.width, bh = bm.height;
    const videoAspect = bw / bh;
    const canvasAspect = cw / ch;
    let sx = 0, sy = 0, sw = bw, sh = bh;
    if (videoAspect > canvasAspect) {
        const desiredW = bh * canvasAspect;
        sx = (bw - desiredW) / 2;
        sw = desiredW;
    } else {
        const desiredH = bw / canvasAspect;
        sy = (bh - desiredH) / 2;
        sh = desiredH;
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(bm, sx, sy, sw, sh, 0, 0, cw, ch);
}

// Throttle drawing with rAF
let pending = false;
function onScrollRAF() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
        const idx = indexFromScroll();
        drawCached(idx);
        pending = false;
    });
}
window.addEventListener('scroll', onScrollRAF, { passive: true });

// Kick off on user gesture (required by many browsers)
async function start() {
    if (cachedBitmaps.length) {
        drawCached(indexFromScroll());
        return;
    }
    const ok = await loadVideoBlob('video.mp4');
    if (!ok) return;
    captureFrames().then(() => {
        console.log('Frame capture finished; total cached:', cachedBitmaps.length);
        drawCached(indexFromScroll());
    });
}

window.addEventListener('click', start, { once: true });
window.addEventListener('touchstart', start, { once: true });
window.addEventListener('scroll', () => { if (!cachedBitmaps.length) start(); }, { once: true, passive: true });

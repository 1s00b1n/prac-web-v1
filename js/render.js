import { DEFAULTS, TIMINGS } from './config.js';

export function createRenderer({ canvas, video }) {
  const ctx = canvas.getContext('2d');
  const offCanvas = document.createElement('canvas');
  const offCtx = offCanvas.getContext('2d');

  let width = 0, height = 0;
  let skinGrid = [];
  let spacing = 10;
  let fontSize = 10;
  let artScale = DEFAULTS.artScaleBase;

  // video draw metrics
  let videoStartX = 0, videoStartY = 0, videoDrawWidth = 0, videoDrawHeight = 0;

  let animStartTime = null;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    offCanvas.width = width;
    offCanvas.height = height;

    const scale = Math.min(width / DEFAULTS.baseWidth, 1);
    artScale = 0.4 + (1 - scale) * 1.0;
    spacing = Math.max(8, Math.floor(14 * scale));
    fontSize = Math.max(8, Math.floor(14 * scale));

    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  }

  function updateGrid() {
    if (!video || !video.videoWidth) return;

    const videoRatio = video.videoWidth / video.videoHeight;

    const maxWidth = Math.max(width, height * 0.5) * artScale;
    const maxHeight = Math.max(height, width * 0.5) * artScale;

    let drawWidth, drawHeight;

    if (maxWidth / maxHeight > videoRatio) {
      drawHeight = maxHeight;
      drawWidth = maxHeight * videoRatio;
    } else {
      drawWidth = maxWidth;
      drawHeight = maxWidth / videoRatio;
    }

    const startX = (width - drawWidth) / 2;
    const startY = (height - drawHeight) / 2;

    videoStartX = startX;
    videoStartY = startY;
    videoDrawWidth = drawWidth;
    videoDrawHeight = drawHeight;

    offCtx.clearRect(0, 0, width, height);
    offCtx.drawImage(video, startX, startY, drawWidth, drawHeight);
    const imageData = offCtx.getImageData(0, 0, width, height).data;

    skinGrid = [];

    for (let y = startY; y < startY + drawHeight; y += spacing) {
      for (let x = startX; x < startX + drawWidth; x += spacing) {
        const pixelX = Math.floor(x);
        const pixelY = Math.floor(y);

        if (pixelX < 0 || pixelX >= width || pixelY < 0 || pixelY >= height) continue;

        const index = (pixelY * width + pixelX) * 4;
        const r = imageData[index];
        const g = imageData[index + 1];
        const b = imageData[index + 2];
        const a = imageData[index + 3];

        if (a === 0) continue;

        let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        skinGrid.push({ x: pixelX, y: pixelY, brightness, r, g, b });
      }
    }
  }

  function _drawBoxLabel(boxX, boxY, boxW, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "13px 'Intel One Mono', sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";

    const textWidth = ctx.measureText(DEFAULTS.boxText).width;
    const textHeight = 15;
    const padding = 1;

    ctx.fillStyle = DEFAULTS.boxColor;
    ctx.fillRect(
      boxX + boxW - textWidth - padding,
      boxY - textHeight - padding,
      textWidth + padding * 2,
      textHeight + padding
    );

    ctx.fillStyle = "#000000";
    ctx.fillText(DEFAULTS.boxText, boxX + boxW, boxY);
    ctx.restore();
  }

  function drawBoundingBoxAnimated(timestamp) {
    if (videoDrawWidth === 0 || videoDrawHeight === 0) return;

    if (animStartTime === null) animStartTime = timestamp || performance.now();
    const elapsed = (timestamp || performance.now()) - animStartTime;

    const fX = videoStartX + videoDrawWidth * DEFAULTS.boxXRatio;
    const fY = videoStartY + videoDrawHeight * DEFAULTS.boxYRatio;
    const fW = videoDrawWidth * DEFAULTS.boxWidthRatio;
    const fH = videoDrawHeight * DEFAULTS.boxHeightRatio;

    const sW = videoDrawWidth * DEFAULTS.smallBoxWidthRatio;
    const sH = videoDrawHeight * DEFAULTS.smallBoxHeightRatio;

    ctx.save();
    ctx.strokeStyle = DEFAULTS.boxColor;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'square';

    const T1 = TIMINGS.P0;
    const T2 = T1 + TIMINGS.P1;
    const T3 = T2 + TIMINGS.P2;
    const T4 = T3 + TIMINGS.P3;

    if (elapsed < T1) {
      const t = elapsed / TIMINGS.P0;
      const tE = 1 - Math.pow(1 - t, 2);
      const curW = sW * tE;
      const curH = sH * tE;
      ctx.strokeRect(fX, fY, curW, curH);

    } else if (elapsed < T2) {
      ctx.strokeRect(fX, fY, sW, sH);

    } else if (elapsed < T3) {
      const t = (elapsed - T2) / TIMINGS.P2;
      const tE = 1 - Math.pow(1 - t, 2);
      const curW = sW + (fW - sW) * tE;
      const curH = sH + (fH - sH) * tE;
      ctx.strokeRect(fX, fY, curW, curH);

    } else if (elapsed < T4) {
      const t = (elapsed - T3) / TIMINGS.P3;
      ctx.strokeRect(fX, fY, fW, fH);
      _drawBoxLabel(fX, fY, fW, Math.min(t, 1));

    } else {
      ctx.strokeRect(fX, fY, fW, fH);
      _drawBoxLabel(fX, fY, fW, 1.0);
    }

    ctx.restore();
  }

  function draw(timestamp) {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      updateGrid();
    }

    ctx.fillStyle = '#F3F3F3';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < skinGrid.length; i++) {
      let cell = skinGrid[i];
      let charIndex = Math.floor(cell.brightness * (DEFAULTS.densityChars.length - 1));
      if (charIndex < 0) charIndex = 0;
      if (charIndex >= DEFAULTS.densityChars.length) charIndex = DEFAULTS.densityChars.length - 1;

      ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
      ctx.fillText(DEFAULTS.densityChars[charIndex], cell.x, cell.y);
    }

    drawBoundingBoxAnimated(timestamp);
  }

  function getVideoMetrics() {
    return {
      videoStartX,
      videoStartY,
      videoDrawWidth,
      videoDrawHeight
    };
  }

  return {
    resize,
    updateGrid,
    draw,
    getVideoMetrics
  };
}

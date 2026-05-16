import { createRenderer } from './render.js';

const canvas = document.getElementById('asciiCanvas');
const video = document.getElementById('videoElement');

const renderer = createRenderer({ canvas, video });

let _initialized = false;
function init() {
  if (_initialized) return;
  _initialized = true;
  renderer.resize();
  window.addEventListener('resize', renderer.resize);

  video.play().then(() => {
    requestAnimationFrame(loop);
  }).catch((error) => {
    console.error('비디오 재생 오류:', error);
    window.addEventListener('click', () => {
      video.play();
      requestAnimationFrame(loop);
    }, { once: true });
  });

  canvas.addEventListener('click', function (event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const metrics = renderer.getVideoMetrics();
    const bX = metrics.videoStartX + metrics.videoDrawWidth * 0.53;
    const bY = metrics.videoStartY + metrics.videoDrawHeight * 0.21;
    const bW = metrics.videoDrawWidth * 0.16;
    const bH = metrics.videoDrawHeight * 0.23;

    if (clickX >= bX && clickX <= bX + bW &&
        clickY >= bY && clickY <= bY + bH) {
      console.log('바운딩 박스 영역이 클릭되었습니다.');
      alert('버튼 클릭 작동');
    }
  });
}

function loop(timestamp) {
  renderer.draw(timestamp);
  requestAnimationFrame(loop);
}

video.addEventListener('loadedmetadata', init);
// Fallback: if metadata doesn't arrive (some file:// or slow loads), initialize after short delay
setTimeout(() => {
  if (!_initialized) init();
}, 500);

/* =========================================================
   00 音效 / 音乐
   ---------------------------------------------------------
   全部用 WebAudio 现场合成，不需要任何音频文件，file:// 打开也有声音。

   为什么第一行要做「解锁」：
   浏览器的规矩是「用户第一次点/按之前不许出声」，
   所以 AudioContext 一开始是 suspended，第一次按键或点击时才 resume。

   想换成真音频文件：把下面的 _tone 换成 new Audio('音频/跳跃.mp3').play() 即可，
   文件名放进 ASSET_FILES（见 03_assets.js）统一预加载更稳。
   ========================================================= */

const AUDIO_VOLUME = 0.25;    // 0 ~ 1，嫌吵就调小或直接设 0
/* 背景音乐音量（相对总音量）。BGM 只走这个系数，不会盖过音效 */
const BGM_VOLUME   = 0.38;

let muted     = false;
let _actx     = null;         // AudioContext（懒创建）
let _master   = null;         // 总音量节点
let _noiseBuf = null;         // 白噪声缓冲，给死亡音效当素材

/* 第一次交互时调用，把声音解锁。重复调用没有副作用。 */
function audioUnlock() {
  try {
    if (!_actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      _actx   = new AC();
      _master = _actx.createGain();
      _master.gain.value = AUDIO_VOLUME;
      _master.connect(_actx.destination);
    }
    if (_actx.state === 'suspended') _actx.resume();
  } catch (e) { /* 极老的浏览器：没声音也能玩，静默跳过 */ }
  // 声音一解锁，就把还没起来的 BGM 拉起来（浏览器要求先有用户交互）
  bgmKick();
}

/* 按 M 静音 / 取消静音 */
function toggleMute() {
  muted = !muted;
  if (_master) _master.gain.value = muted ? 0 : AUDIO_VOLUME;
  if (bgmEl) bgmEl.muted = muted;
  return muted;
}

/* =========================================================
   背景音乐：四首随机循环
   ---------------------------------------------------------
   · 页面一进来就先选一首随机播；放完自动换下一首（换的时候避免和上一首重复）
   · 「随机」但不会连着两次同一首
   · 浏览器不许自动出声，所以第一次点击/按键时（audioUnlock）才真的响
   · 音量走 BGM_VOLUME，比音效轻
   ========================================================= */
const BGM_LIST = ['audio/dfy1.mp3', 'audio/dfy2.mp3', 'audio/dfy3.mp3', 'audio/dfy4.mp3'];

let bgmEl       = null;
let bgmIdx      = -1;
let bgmStarted  = false;

function bgmPickNext() {
  if (BGM_LIST.length === 1) return 0;
  let i;
  do { i = Math.floor(Math.random() * BGM_LIST.length); } while (i === bgmIdx);
  return i;
}

function bgmPlay() {
  if (!bgmEl) return;
  bgmIdx = bgmPickNext();
  bgmEl.src = BGM_LIST[bgmIdx];
  bgmEl.volume = BGM_VOLUME;
  bgmEl.muted = muted;
  const p = bgmEl.play();
  if (p && p.catch) p.catch(() => { /* 还没解锁，等 audioUnlock 再拉起来 */ });
}

function bgmInit() {
  if (bgmEl) return;
  bgmEl = new Audio();
  bgmEl.loop = false;                 // 一首放完换下一首，所以不 loop
  bgmEl.preload = 'auto';
  bgmEl.addEventListener('ended', bgmPlay);
  bgmEl.addEventListener('error', () => {
    // 某个文件坏了就跳过它，别卡住
    setTimeout(bgmPlay, 1500);
  });
  bgmPlay();
}

/* 由 audioUnlock 调用：解锁后如果还没响，就拉起来 */
function bgmKick() {
  if (!bgmEl) { bgmInit(); return; }
  if (bgmStarted) return;
  const p = bgmEl.play();
  if (p && p.then) p.then(() => { bgmStarted = true; }).catch(() => {});
}

/* 页面加载完就选一首（此时多半是静音的，等交互后才响） */
bgmInit();


/* =========================================================
   竖屏时的「横屏」按钮：全屏 + 尝试锁定横屏
   ---------------------------------------------------------
   为什么必须做成按钮：浏览器要求全屏和屏幕方向锁定
   都发生在**用户手势**里（点一下），所以没法自动做。

   Android Chrome：能真的锁成横屏。
   iOS Safari：根本没有 screen.orientation.lock，
               所以退化成「进全屏 + 提示你手动横过来」。
   ========================================================= */
function rotateSupported() {
  return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
}

/* 取屏幕方向对象。
   ★ 一定要用 typeof 保护：有些环境（老浏览器、无头测试）根本没有 screen 这个全局，
     直接写 screen.orientation 会抛 ReferenceError，把整个脚本带崩。 */
function orientationObj() {
  try {
    if (typeof screen === 'undefined') return null;
    return screen.orientation || null;
  } catch (e) { return null; }
}

function requestLandscape() {
  const el = document.documentElement;
  const fsReq = el.requestFullscreen || el.webkitRequestFullscreen;
  const p = fsReq ? fsReq.call(el) : null;
  const after = () => {
    try {
      const o = orientationObj();
      if (o && typeof o.lock === 'function') o.lock('landscape').catch(() => {});
    } catch (e) { /* iOS 等不支持，忽略 */ }
    updateRotateUI();
  };
  if (p && p.then) p.then(after).catch(after);
  else after();
}

/* 显示/隐藏按钮和提示：
   · 竖着 + 触摸设备 + 支持全屏 → 显示按钮
     （Android Chrome 点它能真的锁横屏；iOS 上会退化成「全屏 + 提示你手动横过来」，
       iOS 也算「支持全屏」，所以按钮照样给 —— 竖屏时画幅最窄，最需要它）
   · 只有连全屏都不支持时，才不显示（点了也没用）
   · 已经锁成横屏、但手机还竖着拿 → 显示「把手机横过来」提示 */
function updateRotateUI() {
  const btn  = document.getElementById('rotateBtn');
  const hint = document.getElementById('rotateHint');
  if (!btn || !hint) return;

  const portrait = isNarrowViewport();
  const touch = isTouchDevice();

  const showBtn = portrait && touch && rotateSupported();
  btn.classList.toggle('show', showBtn);
  btn.classList.toggle('hidden', !showBtn);

  let lockedLandscape = false;
  try {
    const o = orientationObj();
    if (o && typeof o.type === 'string') lockedLandscape = o.type.indexOf('landscape') === 0;
  } catch (e) { /* 忽略 */ }
  hint.classList.toggle('hidden', !(lockedLandscape && portrait));
}

function initRotateButton() {
  const btn  = document.getElementById('rotateBtn');
  const hint = document.getElementById('rotateHint');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    SFX.click && SFX.click();
    requestLandscape();
  });
  if (hint) hint.addEventListener('click', () => hint.classList.add('hidden'));

  addEventListener('resize', updateRotateUI);
  addEventListener('orientationchange', () => setTimeout(updateRotateUI, 300));
  document.addEventListener('fullscreenchange', () => setTimeout(updateRotateUI, 150));
  document.addEventListener('webkitfullscreenchange', () => setTimeout(updateRotateUI, 150));
  const o = orientationObj();
  if (o && o.addEventListener) o.addEventListener('change', updateRotateUI);
  updateRotateUI();
}

initRotateButton();

/* =========================================================
   触屏小提示：手机上第一次开始游戏时，标出「跳 / 滑铲」的分界
   ========================================================= */
const TOUCH_HINT_KEY = 'whale_run_touchhint_v1';

/* 是不是「手指操作」的设备。
   只看 maxTouchPoints 会把带触摸屏的笔记本也算进来，
   所以优先用媒体查询 (hover: none) and (pointer: coarse)：
   这一条描述的正是「主输入方式没有悬停能力、而且是粗指针」，也就是手机/平板。 */
function isTouchDevice() {
  try {
    if (window.matchMedia) {
      if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
      // 明确是精细指针 + 能悬停（鼠标）-> 不是触屏设备
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
    }
  } catch (e) { /* 忽略 */ }
  try {
    if (navigator.maxTouchPoints > 0) return true;
    if ('ontouchstart' in window) return true;
  } catch (e) { /* 忽略 */ }
  return false;
}

/* 宽高比：横屏窄窗口也算「手机式」布局，用来决定要不要显示横屏按钮 */
function isNarrowViewport() {
  try {
    return window.innerWidth < window.innerHeight;
  } catch (e) { return false; }
}

/* 只在触摸设备 + 没看过 + 游戏真正开始时调一次 */
function maybeShowTouchHint() {
  if (!isTouchDevice()) return;
  try { if (localStorage.getItem(TOUCH_HINT_KEY)) return; } catch (e) { /* 忽略 */ }

  const box = document.getElementById('touchHint');
  if (!box) return;

  // 分界线的位置：按画布实际矩形算，和 08_input.js 的判定完全一致
  const rect = document.getElementById('c').getBoundingClientRect();
  const canvasBottom = rect.top + rect.height;
  const lineY = rect.top + rect.height * (typeof TOUCH_DUCK_LINE !== 'undefined' ? TOUCH_DUCK_LINE : 0.66);

  const line = box.querySelector('.touchHintLine');
  const bottom = box.querySelector('.touchHintBottom');
  if (line) line.style.top = lineY + 'px';
  if (bottom) bottom.style.top = (lineY + 14) + 'px';

  box.classList.remove('hidden');
  try { localStorage.setItem(TOUCH_HINT_KEY, '1'); } catch (e) { /* 忽略 */ }
  setTimeout(() => box.classList.add('hidden'), 3600);
}

/* =========================================================
   主菜单上的 BGM 音量滑块
   ---------------------------------------------------------
   拖动即时生效，数值存在 localStorage，下次进来还是这个音量。
   ========================================================= */
const BGM_VOL_KEY = 'whale_run_bgm_vol_v1';

function bgmVolumeGet() {
  try {
    const v = parseFloat(localStorage.getItem(BGM_VOL_KEY));
    if (isFinite(v) && v >= 0 && v <= 1) return v;
  } catch (e) { /* 忽略 */ }
  return BGM_VOLUME;
}

function bgmVolumeSet(v) {
  v = Math.max(0, Math.min(1, v));
  if (bgmEl) {
    bgmEl.volume = v;
    // 音量拖到 0 就顺手静音，拖回来再恢复
    if (v === 0) { bgmEl.muted = true; }
    else if (!muted) { bgmEl.muted = false; }
  }
  try { localStorage.setItem(BGM_VOL_KEY, String(v)); } catch (e) { /* 忽略 */ }
  return v;
}

function bgmVolumeBind() {
  const slider = document.getElementById('bgmVolume');
  const numEl  = document.getElementById('bgmVolumeNum');
  const iconEl = document.getElementById('bgmIcon');
  if (!slider) return;

  const start = bgmVolumeGet();
  slider.value = String(Math.round(start * 100));
  if (numEl) numEl.textContent = Math.round(start * 100) + '%';
  bgmVolumeSet(start);

  const onInput = () => {
    const v = bgmVolumeSet(parseInt(slider.value, 10) / 100);
    if (numEl) numEl.textContent = Math.round(v * 100) + '%';
    if (iconEl) iconEl.textContent = v === 0 ? '🔇' : (v < 0.35 ? '🔉' : '🎵');
    audioUnlock();          // 拖滑块也算一次交互，顺便把声音解锁
  };
  slider.addEventListener('input', onInput);
  slider.addEventListener('change', onInput);
}

bgmVolumeBind();

/* ---------------------------------------------------------
   基础发声单元
   --------------------------------------------------------- */
function _tone(freq, dur, type = 'square', vol = 0.3, slideTo = null) {
  if (muted || !_actx || !_master) return;
  const t    = _actx.currentTime;
  const osc  = _actx.createOscillator();
  const gain = _actx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);          // 快速起音，避免「咔」声
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);   // 自然衰减

  osc.connect(gain);
  gain.connect(_master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function _noise(dur = 0.35, vol = 0.35) {
  if (muted || !_actx || !_master) return;
  if (!_noiseBuf) {
    const n = Math.floor(_actx.sampleRate * dur);
    _noiseBuf = _actx.createBuffer(1, n, _actx.sampleRate);
    const d = _noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const t     = _actx.currentTime;
  const src   = _actx.createBufferSource();
  const filt  = _actx.createBiquadFilter();
  const gain  = _actx.createGain();

  src.buffer = _noiseBuf;
  filt.type  = 'lowpass';
  filt.frequency.setValueAtTime(1400, t);
  filt.frequency.exponentialRampToValueAtTime(140, t + dur);

  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(filt); filt.connect(gain); gain.connect(_master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* ---------------------------------------------------------
   音频文件音效（不是现场合成的那些）
   ---------------------------------------------------------
   预加载成 Audio 元素，播放时 clone 一份，这样连点也不会互相打断。
   ========================================================= */
const SFX_FILES = {
  victory: 'audio/victory.mp3',   // 买到白饭时的胜利音效（已剪掉开头空白）
};

const _sfxEls = {};
for (const k in SFX_FILES) {
  const a = new Audio(SFX_FILES[k]);
  a.preload = 'auto';
  _sfxEls[k] = a;
}

function playSfxFile(key, vol = 0.5) {
  if (muted) return;
  const base = _sfxEls[key];
  if (!base) return;
  try {
    const a = base.cloneNode();
    a.volume = Math.max(0, Math.min(1, vol));
    a.play().catch(() => { /* 还没解锁就静默跳过 */ });
  } catch (e) { /* 忽略 */ }
}

/* ---------------------------------------------------------
   给玩法调用的音效（名字对应发生的事，改音色就改这里）
   --------------------------------------------------------- */
const SFX = {
  jump()   { _tone(430, 0.13, 'square',   0.22, 760); },   // 起跳：往上滑
  djump()  { _tone(600, 0.15, 'square',   0.22, 980); },   // 二段跳：再高一点
  coin()   { _tone(1180, 0.09, 'triangle', 0.28, 1660); },  // 吃鲸元券
  land()   { _tone(180, 0.07, 'sine',     0.16); },        // 落地
  die()    { _noise(0.38, 0.3); _tone(340, 0.42, 'sawtooth', 0.2, 70); },
  revive() { _tone(520, 0.10, 'triangle', 0.26, 700);       // 复活：三连上行
             setTimeout(() => _tone(660, 0.10, 'triangle', 0.26, 880), 90);
             setTimeout(() => _tone(880, 0.22, 'triangle', 0.26, 1180), 180); },
  click()  { _tone(760, 0.06, 'square', 0.18); },           // 按钮
  smash()  { _noise(0.18, 0.32); _tone(200, 0.12, 'square', 0.22, 60); },  // 铁盆撞碎障碍
  buy()    { _tone(660, 0.08, 'triangle', 0.24, 990);
             setTimeout(() => _tone(990, 0.14, 'triangle', 0.24, 1320), 80); },  // 购买成功
  victory(){ playSfxFile('victory', 0.65); },   // 买到白饭：放 victory.mp3
};

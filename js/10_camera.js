/* =========================================================
   10 画幅自适应 + 相机 + 背景视差 + 昼夜
   ========================================================= */

let rsTimer = null;

/* =========================================================
   画幅自适应
   ---------------------------------------------------------
   目标：逻辑高度固定 BASE_H(600)，逻辑宽度按窗口比例走，这样
   所有写死的数值（重力、跳跃高度、地面线 120 等）在手机上照样成立。

   ★ 为什么手机上要留边：
     竖屏窗口比例约 0.46（390×844）。如果让画布铺满整屏，
     逻辑宽度只有 600 × 0.46 ≈ 277 —— 前面来什么都看不清。
     但画布本身不可能比窗口还宽，所以只能「等比缩放 + 留边」：
       · 先按窗口比例算逻辑宽度；
       · 太窄就把逻辑宽度托到 BASE_H × MIN_ASPECT；
       · 用「等比缩放」把这块逻辑画面塞进窗口（不能分别缩放，否则变形），
         塞不满的地方留边，用和天空同色的底填掉。
     竖屏手机上会上下留一点边，换来的是看得清前面；横屏/桌面铺满。

   MIN_ASPECT 想调：
     0.55 → 竖屏留边少一点；0.70 → 可视更宽、边更多
   ========================================================= */
const MIN_ASPECT = 0.55;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const vw  = Math.max(1, window.innerWidth);
  const vh  = Math.max(1, window.innerHeight);

  // 逻辑尺寸：高度恒定，宽度按窗口比例、但托一个下限
  H = BASE_H;
  W = BASE_H * vw / vh;
  if (W < BASE_H * MIN_ASPECT) W = BASE_H * MIN_ASPECT;

  // 等比缩放（取小的那个），保证画面不变形，且一定塞得进窗口
  const s = Math.min(vw / W, vh / H);

  const cw = W * s, ch = H * s;

  cvs.width  = Math.round(cw * dpr);
  cvs.height = Math.round(ch * dpr);
  cvs.style.width  = cw + 'px';
  cvs.style.height = ch + 'px';

  ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  ctx.imageSmoothingEnabled = true;

  GY       = H - 120;
  SCREEN_X = W * 0.18;

  // 刘海 / 药丸屏的安全区：换算成逻辑单位，HUD 用得上
  updateSafeInsets(s);
}

/* 把 CSS 里的 env(safe-area-inset-*) 读出来，换算成游戏的逻辑单位 */
let SAFE_TOP = 0, SAFE_LEFT = 0, SAFE_RIGHT = 0, SAFE_BOTTOM = 0;
function updateSafeInsets(scale) {
  try {
    const cs = getComputedStyle(document.documentElement);
    const px = (name) => parseFloat(cs.getPropertyValue(name)) || 0;
    const s = scale || 1;
    SAFE_TOP    = px('--sat') / s;
    SAFE_LEFT   = px('--sal') / s;
    SAFE_RIGHT  = px('--sar') / s;
    SAFE_BOTTOM = px('--sab') / s;
  } catch (e) {
    SAFE_TOP = SAFE_LEFT = SAFE_RIGHT = SAFE_BOTTOM = 0;
  }
}

/* 窗口尺寸 / 转屏 / 手机地址栏收放，都要重算
   （手机上滚动或转屏时 innerHeight 会变，用 timeout 合并一下免得连续重排） */
function scheduleResize(delay) {
  clearTimeout(rsTimer);
  rsTimer = setTimeout(resize, delay || 120);
}

addEventListener('resize', () => scheduleResize(120));
addEventListener('orientationchange', () => scheduleResize(260));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => scheduleResize(180));
}


/* =========================================================
   工具
   ========================================================= */
function wrapWorldToScreen(worldX, camX, span) {
  const total = W + span * 2;
  return ((worldX - camX) % total + total) % total - span;
}

function seeded01(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/* #RRGGBB 颜色线性插值 */
function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r  = Math.round(ar + (br - ar) * t);
  const g  = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}


/* =========================================================
   背景 + 昼夜
   ========================================================= */
function drawBackground() {
  const horizon = H * 0.50;

  /* ---- 昼夜系数：0 = 白天，1 = 夜晚 ---- */
  let nightAmount = 0;
  if (dayTime >= 0.35 && dayTime < 0.5) {
    nightAmount = (dayTime - 0.35) / 0.15;
  } else if (dayTime >= 0.5 && dayTime < 0.85) {
    nightAmount = 1;
  } else if (dayTime >= 0.85) {
    nightAmount = 1 - (dayTime - 0.85) / 0.15;
  }
  nightAmount = clamp(nightAmount, 0, 1);

  /* ---- 视角偏移时的顶部兜底 ---- */
  if (viewOffset > 0) {
    ctx.fillStyle = lerpColor('#4f9fd4', '#0b1535', nightAmount);
    ctx.fillRect(0, -viewOffset - 4, W, viewOffset + 6);
  }

  /* ---- 天空 ---- */
  const skyTopC = lerpColor('#4f9fd4', '#0b1535', nightAmount);
  const skyMidC = lerpColor('#8ec9e8', '#1a2850', nightAmount);
  const skyLowC = lerpColor('#dff0fa', '#2a3a68', nightAmount);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
  skyGrad.addColorStop(0,    skyTopC);
  skyGrad.addColorStop(0.65, skyMidC);
  skyGrad.addColorStop(1,    skyLowC);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizon);

  /* ---- 太阳 / 月亮 ---- */
  drawCelestial(horizon, nightAmount);

  /* ---- 云 ---- */
  drawClouds(horizon, nightAmount);

  /* ---- 远山 ---- */
  drawFarHills(horizon, nightAmount);

  /* ---- 大海 ---- */
  const seaTopC    = lerpColor('#3d92c2', '#08172e', nightAmount);
  const seaBottomC = lerpColor('#1b5b85', '#030814', nightAmount);

  const seaGrad = ctx.createLinearGradient(0, horizon, 0, GY);
  seaGrad.addColorStop(0, seaTopC);
  seaGrad.addColorStop(1, seaBottomC);
  ctx.fillStyle = seaGrad;
  ctx.fillRect(0, horizon, W, GY - horizon);

  /* 30% 灰滤镜 */
  ctx.fillStyle = 'rgba(128, 128, 128, .30)';
  ctx.fillRect(0, horizon, W, GY - horizon);

  /* 海面条纹 */
  const seaSpan  = 240;
  const seaWorld = cam * 0.35;
  const startI   = Math.floor(seaWorld / seaSpan) - 1;
  const endI     = Math.ceil((seaWorld + W) / seaSpan) + 1;
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let i = startI; i <= endI; i++) {
    const bx = i * seaSpan - seaWorld;
    for (let j = 0; j < 6; j++) {
      const y = horizon + 14 + j * 14;
      if (y > GY - 4) break;
      ctx.fillRect(bx + j * 30, y, 48, 3);
    }
  }

  /* ---- 雾层 ---- */
  ctx.fillStyle = `rgba(190, 220, 240, ${0.25 * (1 - nightAmount * 0.5)})`;
  ctx.fillRect(0, 0, W, horizon + 40);

  /* ---- 夜晚整体滤镜 ---- */
  if (nightAmount > 0) {
    ctx.fillStyle = `rgba(10, 20, 50, ${nightAmount * 0.35})`;
    ctx.fillRect(0, 0, W, GY);
  }
}


/* =========================================================
   太阳 / 月亮
   ---------------------------------------------------------
   太阳：dayTime 0 → 0.5 时，从屏幕右侧升起 → 弧线 → 落到左侧
   月亮：dayTime 0.5 → 1.0 时，同样的方式从右到左
   ========================================================= */
function drawCelestial(horizon, nightAmount) {
  /* ---- 太阳 ---- */
  if (dayTime < 0.5) {
    const sunT = dayTime * 2;                       // 0 → 1
    const sunX = W * (1 - sunT);                    // 从右往左
    const arcH = Math.sin(sunT * Math.PI);          // 0 → 1 → 0
    const sunY = horizon - arcH * 200 - 30;

    let alpha = 1;
    if (dayTime < 0.03) alpha = dayTime / 0.03;
    else if (dayTime > 0.47) alpha = (0.5 - dayTime) / 0.03;
    alpha = clamp(alpha, 0, 1);

    if (alpha > 0.01) {
      ctx.globalAlpha = alpha;
      drawSun(sunX, sunY);
      ctx.globalAlpha = 1;
    }
  }

  /* ---- 月亮 ---- */
  if (dayTime >= 0.5) {
    const moonT = (dayTime - 0.5) * 2;              // 0 → 1
    const moonX = W * (1 - moonT);
    const arcH  = Math.sin(moonT * Math.PI);
    const moonY = horizon - arcH * 180 - 30;

    let alpha = 1;
    if (moonT < 0.05) alpha = moonT / 0.05;
    else if (moonT > 0.95) alpha = (1 - moonT) / 0.05;
    alpha = clamp(alpha, 0, 1);

    if (alpha > 0.01) {
      ctx.globalAlpha = alpha;
      drawMoon(moonX, moonY);
      ctx.globalAlpha = 1;
    }
  }
}

function drawSun(x, y) {
  // 光晕
  const glow = ctx.createRadialGradient(x, y, 0, x, y, SUN_R * 2.5);
  glow.addColorStop(0,   'rgba(255, 230, 130, .85)');
  glow.addColorStop(0.5, 'rgba(255, 200, 80, .35)');
  glow.addColorStop(1,   'rgba(255, 200, 80, 0)');
  ctx.beginPath();
  ctx.arc(x, y, SUN_R * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // 本体（有素材用素材，没素材用金色圆）
  if (SPR.sun && SPR.sun.complete && SPR.sun.naturalWidth > 0) {
    const sw = SUN_R * 2;
    const sh = sw * SPR.sun.naturalHeight / SPR.sun.naturalWidth;
    ctx.drawImage(SPR.sun, x - sw / 2, y - sh / 2, sw, sh);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, SUN_R, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe680';
    ctx.fill();
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawMoon(x, y) {
  // 冷光晕
  const glow = ctx.createRadialGradient(x, y, 0, x, y, MOON_R * 2.5);
  glow.addColorStop(0,   'rgba(220, 235, 255, .7)');
  glow.addColorStop(0.5, 'rgba(180, 210, 255, .25)');
  glow.addColorStop(1,   'rgba(180, 210, 255, 0)');
  ctx.beginPath();
  ctx.arc(x, y, MOON_R * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  if (SPR.moon && SPR.moon.complete && SPR.moon.naturalWidth > 0) {
    const mw = MOON_R * 2;
    const mh = mw * SPR.moon.naturalHeight / SPR.moon.naturalWidth;
    ctx.drawImage(SPR.moon, x - mw / 2, y - mh / 2, mw, mh);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, MOON_R, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f4ff';
    ctx.fill();
    ctx.strokeStyle = '#a8bcd8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 小坑
    ctx.fillStyle = 'rgba(160,180,210,.5)';
    ctx.beginPath();
    ctx.arc(x - 8, y - 6, 6, 0, Math.PI * 2);
    ctx.arc(x + 7, y + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}


/* =========================================================
   云 / 远山
   ========================================================= */
function _sceneryReady(img) {
  return img && !img._none && !img._fail &&
         img.complete && img.naturalWidth > 0;
}

function _drawScenery(img, cx, baseY, targetW) {
  if (!_sceneryReady(img)) return false;
  const ratio = img.naturalHeight / img.naturalWidth;
  const w = targetW;
  const h = w * ratio;
  ctx.drawImage(img, cx - w / 2, baseY - h, w, h);
  return true;
}

function isScenerySpot(i, seed) {
  const P = 21;
  const cycle  = Math.floor(i / P);
  const target = 3 + Math.floor(seeded01(cycle * 3.1 + seed) * 4);
  return (i - cycle * P) === target;
}

/* 云 */
function drawClouds(horizon, nightAmount) {
  const span   = 480;
  const worldX = cam * 0.05;
  const startI = Math.floor(worldX / span) - 1;
  const endI   = Math.ceil((worldX + W) / span) + 1;

  // 云色随昼夜变暗
  const cloudC = nightAmount > 0
    ? `rgba(${Math.round(255 - 90 * nightAmount)}, ${Math.round(255 - 80 * nightAmount)}, ${Math.round(255 - 60 * nightAmount)}, .85)`
    : COL.cloudColor;

  for (let i = startI; i <= endI; i++) {
    const bx = i * span - worldX;
    const by = horizon * 0.18 + seeded01(i * 1.7) * 120;

    // 第一朵
    if (isScenerySpot(i, 0.5)) {
      if (_sceneryReady(CLOUD_IMG)) {
        ctx.globalAlpha = 0.8;
        _drawScenery(CLOUD_IMG, bx + 25, by + 14, 150);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(255, 40, 40, .9)';
        drawCloud(bx, by);
      }
    } else {
      ctx.fillStyle = cloudC;
      drawCloud(bx, by);
    }

    // 第二朵
    if (isScenerySpot(i, 1.5)) {
      if (_sceneryReady(CLOUD_IMG)) {
        ctx.globalAlpha = 0.8;
        _drawScenery(CLOUD_IMG, bx + 225, by + 48, 150);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(255, 40, 40, .9)';
        drawCloud(bx + 200, by + 34);
      }
    } else {
      ctx.fillStyle = cloudC;
      drawCloud(bx + 200, by + 34);
    }
  }
}

function drawCloud(x, y) {
  ctx.beginPath();
  ctx.arc(x,      y,      22, 0, Math.PI * 2);
  ctx.arc(x + 22, y - 10, 28, 0, Math.PI * 2);
  ctx.arc(x + 50, y,      24, 0, Math.PI * 2);
  ctx.arc(x + 25, y + 10, 24, 0, Math.PI * 2);
  ctx.fill();
}

/* 远山 */
function drawFarHills(horizon, nightAmount) {
  const span   = 340;
  const worldX = cam * 0.15;
  const startI = Math.floor(worldX / span) - 1;
  const endI   = Math.ceil((worldX + W) / span) + 1;

  for (let i = startI; i <= endI; i++) {
    const sx = i * span - worldX;
    const r  = 80 + Math.floor(seeded01(i * 3.1) * 3) * 40;
    const op = 0.5 + seeded01(i * 5.7) * 0.4;

    if (isScenerySpot(i, 2.5)) {
      if (_sceneryReady(HILL_IMG)) {
        ctx.globalAlpha = 0.6;
        _drawScenery(HILL_IMG, sx, horizon + 6, r * 2.4);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(255, 40, 40, .95)';
        ctx.beginPath();
        ctx.arc(sx, horizon + 6, r, Math.PI, 0);
        ctx.fill();
      }
      continue;
    }

    // 山色也随昼夜变暗
    const rr = Math.round(82  * (1 - nightAmount * 0.65));
    const gg = Math.round(125 * (1 - nightAmount * 0.65));
    const bb = Math.round(125 * (1 - nightAmount * 0.65));
    ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${op.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, horizon + 6, r, Math.PI, 0);
    ctx.fill();
  }
}
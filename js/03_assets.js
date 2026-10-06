/* =========================================================
   03 素材清单 / 加载
   ========================================================= */

const ASSET_FILES = {
  player    : '鲸鲸酷跑_素材/处理后/玩家_跑1.png',
  pet       : '鲸鲸酷跑_素材/用户.png',
  pot       : '',
  potBottom : '鲸鲸酷跑_素材/铁盆（下部分）.png',
  potTop    : '鲸鲸酷跑_素材/铁盆（上部分）.png',
  coin      : '鲸鲸酷跑_素材/处理后/鲸元券.png',
  wall1     : '鲸鲸酷跑_素材/处理后/高墙1.png',
  wall2     : '鲸鲸酷跑_素材/处理后/高墙2.png',
  wall3     : '鲸鲸酷跑_素材/处理后/高墙3.png',
  wall4     : '鲸鲸酷跑_素材/处理后/高墙4.png',
  wall5     : '鲸鲸酷跑_素材/处理后/高墙5.png',
  barn1     : '鲸鲸酷跑_素材/处理后/藤壶1.png',
  barn2     : '鲸鲸酷跑_素材/处理后/藤壶2.png',
  barn3     : '鲸鲸酷跑_素材/处理后/藤壶3.png',
  barn4     : '鲸鲸酷跑_素材/处理后/藤壶4.png',
  barn5     : '鲸鲸酷跑_素材/处理后/藤壶5.png',
  holed     : '鲸鲸酷跑_素材/处理后/洞墙_透明.png',
  ground    : '',
  sun       : '鲸鲸酷跑_素材/处理后/太阳.png',
  moon      : '鲸鲸酷跑_素材/处理后/月亮.png',
  monster   : '鲸鲸酷跑_素材/处理后/怪物.png',
  bullet    : '鲸鲸酷跑_素材/处理后/藤壶子弹.png',
  playerDuck: '鲸鲸酷跑_素材/处理后/滑铲_透明.png',
  playerRun2: '鲸鲸酷跑_素材/处理后/玩家_跑2.png',
  playerRun3: '鲸鲸酷跑_素材/处理后/玩家_跑3.png',
  playerRun4: '鲸鲸酷跑_素材/处理后/玩家_跑4.png',
};

/* 广告图：暂时只放 4 张（第 5 位先不显示）。
   想恢复第 5 个位置，往数组里再补一条路径、并给 AD_LINKS 补一条即可。

   ★ 这几张是照片，存成 JPEG：同样像素下比 PNG 小 5～8 倍。
     PNG 是无损格式，拿来存照片纯属浪费流量（手机首屏尤其明显）。 */
const AD_IMAGES = [
  '鲸鲸酷跑_素材/广告1.jpg',
  '鲸鲸酷跑_素材/广告2.jpg',
  '鲸鲸酷跑_素材/广告3.jpg',
  '鲸鲸酷跑_素材/广告4.jpg',
];

/* 广告图与 AD_LINKS 一一对应：填了链接的，广告下方才会出现「了解更多 →」。
   留空 → 不显示跳转按钮。 */
const AD_LINKS = [
  'https://yfuwd.github.io/battle-with-barnacle/',   // 广告1
  'https://yfuwd.github.io/Barnacle-Invasion/',      // 广告2
  '',                                                // 广告3：不挂链接
  '',                                                // 广告4：不挂链接
];

const ASSET_STATUS = {};

/* =========================================================
   加载进度
   ---------------------------------------------------------
   为什么要这个：
     素材是异步加载的，以前是「发完请求立刻进游戏」。
     电脑宽带几秒就下完，看不出问题；手机要下好几 MB，
     前十几秒看到的全是程序画的色块和占位图 ——
     看起来就像「素材加载失败了」。
   现在的规矩：
     每张图「加载成功」或「加载失败」都算一次「有结果」，
     全部有结果（或者超时兜底）之后才放行进游戏。
   ========================================================= */
const LOAD_MIN_MS     = 450;    // 加载界面最短显示时长，避免一闪而过
const LOAD_TIMEOUT_MS = 15000;  // 兜底：某张图卡住也不能永远等下去

let ASSET_TOTAL = 0;            // 这轮要等的图片总数
let ASSET_DONE  = 0;            // 已经有结果的张数
let _loadStartedAt = 0;
let _loadFinished  = false;
let _loadCallbacks = [];

function assetProgress() {
  return ASSET_TOTAL > 0 ? Math.min(1, ASSET_DONE / ASSET_TOTAL) : 1;
}

function _assetSettle() {
  ASSET_DONE++;
  updateLoadUI();
  if (ASSET_DONE >= ASSET_TOTAL) _finishLoad();
}

function _finishLoad() {
  if (_loadFinished) return;
  _loadFinished = true;

  // 太快加载完会让加载界面一闪而过，反而像闪屏，至少显示 LOAD_MIN_MS
  const wait = Math.max(0, LOAD_MIN_MS - (Date.now() - _loadStartedAt));
  setTimeout(() => {
    const cbs = _loadCallbacks;
    _loadCallbacks = [];
    for (const cb of cbs) {
      try { cb(); } catch (e) { console.error(e); }
    }
  }, wait);
}

/* 素材就绪后执行 cb；已经就绪就立刻（走同一个最短时长）执行 */
function whenAssetsReady(cb) {
  if (_loadFinished) {
    const wait = Math.max(0, LOAD_MIN_MS - (Date.now() - _loadStartedAt));
    setTimeout(cb, wait);
  } else {
    _loadCallbacks.push(cb);
  }
}

function updateLoadUI() {
  const bar = document.getElementById('loadBar');
  const txt = document.getElementById('loadText');
  const pct = Math.round(assetProgress() * 100);

  if (bar) bar.style.width = pct + '%';
  if (txt) {
    txt.textContent = (ASSET_TOTAL > 0 && ASSET_DONE >= ASSET_TOTAL)
      ? '准备开始…'
      : '素材加载中 ' + ASSET_DONE + ' / ' + ASSET_TOTAL;
  }
}

function hideLoadOverlay() {
  const el = document.getElementById('loadOverlay');
  if (el) el.classList.add('hidden');
}

/* 把一张图的「加载完 / 加载失败」记进进度里 */
function trackAsset(img) {
  ASSET_TOTAL++;
  img.addEventListener('load',  _assetSettle, { once: true });
  img.addEventListener('error', _assetSettle, { once: true });
}

function loadAssets() {
  _loadStartedAt = Date.now();
  ASSET_TOTAL    = 0;
  ASSET_DONE     = 0;
  _loadFinished  = false;

  for (const key of Object.keys(ASSET_FILES)) {
    const src = ASSET_FILES[key];

    if (!src) { ASSET_STATUS[key] = 'none'; continue; }

    const img = new Image();
    ASSET_STATUS[key] = 'loading';
    img.onload  = () => { ASSET_STATUS[key] = 'ok';   SPR[key] = img; };
    img.onerror = () => { ASSET_STATUS[key] = 'fail'; SPR[key] = null; };
    trackAsset(img);
    img.src = src;
    SPR[key] = img;
  }

  loadRiceImage();
  loadSceneryImages();
  preloadUiImages();

  /* 广告图【不】在这里加载。
     它们只有死亡弹广告时才用得上，首屏就拉会跟角色贴图抢带宽，
     手机上尤其明显。真正要弹的时候再调 ensureAdImage()。 */

  updateLoadUI();

  // 一张要等的都没有（比如素材清单被清空）就别卡着，直接放行
  if (ASSET_TOTAL === 0) _finishLoad();

  setTimeout(() => {
    if (!_loadFinished) {
      console.warn('[素材] 等太久了，先放行进游戏，剩下的图加载好会自动补上');
      _finishLoad();
    }
  }, LOAD_TIMEOUT_MS);
}

/* =========================================================
   广告图：按需加载
   ---------------------------------------------------------
   AD_IMGS 是稀疏数组，索引和 AD_IMAGES 一一对应：
   没请求过的位置是 undefined，请求过的才是 Image。
   ========================================================= */
const AD_IMGS = [];

function ensureAdImage(idx) {
  const src = AD_IMAGES[idx];
  if (!src) return null;

  let img = AD_IMGS[idx];
  if (!img) {
    img = new Image();
    img.onerror = () => { img._fail = true; };
    img.src = src;
    AD_IMGS[idx] = img;
  }
  return img;
}

const RICE_IMAGE = '鲸鲸酷跑_素材/胜利CG.jpg';
/* 界面上（商店卡片、道具按钮、死亡弹窗、HUD）要用的素材 */
const POT_IMAGE   = '鲸鲸酷跑_素材/铁盆.png';              // 整只盆，形状更完整
const COIN_IMAGE  = '鲸鲸酷跑_素材/处理后/鲸元券.png';     // 去白底 + 描边后的鲸元券
const RICE_ICON   = '鲸鲸酷跑_素材/白饭.png';             // 商店「白饭」卡片要用的那张
const RICE_IMG = new Image();
function loadRiceImage() {
  if (!RICE_IMAGE) { RICE_IMG._none = true; return; }
  RICE_IMG.onerror = () => { RICE_IMG._fail = true; };
  trackAsset(RICE_IMG);
  RICE_IMG.src = RICE_IMAGE;
}

const HILL_IMAGE  = '鲸鲸酷跑_素材/处理后/山.png';
const CLOUD_IMAGE = '鲸鲸酷跑_素材/处理后/云.png';
const MENU_IMAGE  = '鲸鲸酷跑_素材/处理后/主界面_透明.png';

const HILL_IMG  = new Image();
const CLOUD_IMG = new Image();
const MENU_IMG  = new Image();
function loadSceneryImages() {
  if (!HILL_IMAGE)  HILL_IMG._none  = true;
  else { trackAsset(HILL_IMG);  HILL_IMG.src  = HILL_IMAGE; }

  if (!CLOUD_IMAGE) CLOUD_IMG._none = true;
  else { trackAsset(CLOUD_IMG); CLOUD_IMG.src = CLOUD_IMAGE; }

  if (!MENU_IMAGE)  MENU_IMG._none  = true;
  else { trackAsset(MENU_IMG);  MENU_IMG.src  = MENU_IMAGE; }
}

/* 商店卡片 / 道具按钮那几张是用 CSS background-image 贴的，
   浏览器不会等它们。这里先建 Image 拉一遍：
     ① 算进进度条；
     ② 预热 HTTP 缓存 —— 一打开商店图标就是好的，不会先空一下。 */
function preloadUiImages() {
  for (const src of [POT_IMAGE, RICE_ICON, COIN_IMAGE]) {
    if (!src) continue;
    const img = new Image();
    trackAsset(img);
    img.src = src;
  }
}

function reportAssets() {
  const bad = Object.keys(ASSET_STATUS).filter(k => ASSET_STATUS[k] === 'fail');
  if (bad.length) {
    console.warn('[素材] 下面这些图片没加载出来，已回退成色块：',
      bad.map(k => k + ' → ' + ASSET_FILES[k]).join('　'));
  }
}

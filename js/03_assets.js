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
   想恢复第 5 个位置，往数组里再补一条路径、并给 AD_LINKS 补一条即可。 */
const AD_IMAGES = [
  '鲸鲸酷跑_素材/广告1.png',
  '鲸鲸酷跑_素材/广告2.png',
  '鲸鲸酷跑_素材/广告3.png',
  '鲸鲸酷跑_素材/广告4.png',
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

function loadAssets() {
  for (const key of Object.keys(ASSET_FILES)) {
    const src = ASSET_FILES[key];
    const img = new Image();

    if (!src) { ASSET_STATUS[key] = 'none'; continue; }

    ASSET_STATUS[key] = 'loading';
    img.onload  = () => { ASSET_STATUS[key] = 'ok';   SPR[key] = img; };
    img.onerror = () => { ASSET_STATUS[key] = 'fail'; SPR[key] = null; };
    img.src = src;
    SPR[key] = img;
  }
  loadAdImages();
  loadRiceImage();
  loadSceneryImages();
}

const AD_IMGS = [];
function loadAdImages() {
  for (const src of AD_IMAGES) {
    if (!src) { AD_IMGS.push(null); continue; }
    const img = new Image();
    img.onerror = () => { img._fail = true; };
    img.src = src;
    AD_IMGS.push(img);
  }
}

const RICE_IMAGE = '鲸鲸酷跑_素材/胜利CG.png';
/* 界面上（商店卡片、道具按钮、死亡弹窗、HUD）要用的素材 */
const POT_IMAGE   = '鲸鲸酷跑_素材/铁盆.png';              // 整只盆，形状更完整
const COIN_IMAGE  = '鲸鲸酷跑_素材/处理后/鲸元券.png';     // 去白底 + 描边后的鲸元券
const RICE_ICON   = '鲸鲸酷跑_素材/白饭.png';             // 商店「白饭」卡片要用的那张
const RICE_IMG = new Image();
function loadRiceImage() {
  if (!RICE_IMAGE) { RICE_IMG._none = true; return; }
  RICE_IMG.onerror = () => { RICE_IMG._fail = true; };
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
  else              HILL_IMG.src    = HILL_IMAGE;

  if (!CLOUD_IMAGE) CLOUD_IMG._none = true;
  else              CLOUD_IMG.src   = CLOUD_IMAGE;

  if (!MENU_IMAGE)  MENU_IMG._none  = true;
  else              MENU_IMG.src    = MENU_IMAGE;
}

function reportAssets() {
  const bad = Object.keys(ASSET_STATUS).filter(k => ASSET_STATUS[k] === 'fail');
  if (bad.length) {
    console.warn('[素材] 下面这些图片没加载出来，已回退成色块：',
      bad.map(k => k + ' → ' + ASSET_FILES[k]).join('　'));
  }
}
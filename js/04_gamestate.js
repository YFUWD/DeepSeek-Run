/* =========================================================
   04 全局状态 + 存档 + 重置
   ========================================================= */

/* ---------------- 界面元素 ---------------- */
const overlay       = document.getElementById('overlay');
const overlayTitle  = document.getElementById('overlayTitle');
const btnRetry      = document.getElementById('btnRetry');
const btnAd         = document.getElementById('btnAd');
const adOverlay     = document.getElementById('adOverlay');
const adImageBox    = document.getElementById('adImageBox');
const adImageLabel  = document.getElementById('adImageLabel');
const adCountdown   = document.getElementById('adCountdown');
const btnShop       = document.getElementById('btnShop');
const shopOverlay   = document.getElementById('shopOverlay');
const btnShopClose  = document.getElementById('btnShopClose');
const totalCoinNum  = document.getElementById('totalCoinNum');

/* ---------------- 运行时状态 ---------------- */
let state = 'playing';

let player;
let obstacles = [];
let coins     = [];
let pits      = [];
let platforms = [];

let cam       = 0;
let spawnX    = 0;
let score     = 0;
let best      = 0;

let speed     = SPD;
let lastT     = 0;

let duckHeld    = false;
let coyoteTimer = 0;
let jumpBuffer  = 0;

let hasRevived  = false;
let invTimer    = 0;
let adTimer     = 0;

let scoreSaved  = 0;

let coinsCollected = 0;
let totalCoins     = 0;

let ironPotsOwned  = 0;
let riceOwned      = 0;
let ironPotActive  = false;

/* ---- 地块等级 ---- */
let groundLevel = 0;
let levelTimer  = 0;

/* ---- 平台推挤与恢复状态 ---- */
let wasPushed    = false;
let isRecovering = false;

/* ---- 死亡地点 / 挡路的平台（复活时用来决定从哪继续） ---- */
let dieX = 0;                 // 死的时候玩家在哪个 x
let dieY = 0;                 // 死的时候玩家脚底在哪
let blockedPlatform = null;   // 最近一次把玩家挡住的平台
let blockedSeg      = null;   // 那个平台上挡路的实心段（含坑洞切分后的信息）

/* ---- 鲸元券海 ---- */
let nextCoinSeaScore = COIN_SEA_TRIGGER_STEP;
let coinSeaPhase     = 'none';
let coinSeaTimer     = 0;
let coinSeaTriggerCount = 0;
let coinSeaLeft      = 0;

/* ---- 坡事件状态 ---- */
let slopeActive = false;
let slopeStage  = 0;
let slopeTimer  = 0;

/* ---- 宠物「用户」 ---- */
let petX = 0;
let petY = 0;
let petT = 0;
const PET_NAME = '用户';

/* ---- 主菜单视角偏移 ---- */
let viewOffset = 240;
const MENU_VIEW_OFFSET = 240;

/* ---- 昼夜循环 ---- */
let dayTime = 0.15;   // 0~1，0.15 = 白天中段，太阳偏右

/* ---------------- 造一个人物对象 ---------------- */
function makePlayer() {
  return {
    x: 120,
    y: GY,
    vy: 0,
    jumps: 0,
    onGround: true,
    duck: false,
    rot: 0,
  };
}

/* =========================================================
   重置一局
   ========================================================= */
function reset() {
  player    = makePlayer();
  obstacles = [];
  coins     = [];
  pits      = [];
  platforms = [];

  cam      = player.x - SCREEN_X;
  spawnX   = 700;
  score    = 0;
  speed    = SPD;
  lastT    = 0;

  duckHeld    = false;
  coyoteTimer = 0;
  jumpBuffer  = 0;

  hasRevived = false;
  invTimer   = 0;
  adTimer    = 0;
  scoreSaved = 0;

  coinsCollected = 0;

  groundLevel = 0;
  levelTimer  = rnd(LEVEL_DUR_MIN, LEVEL_DUR_MAX) * 60;

  wasPushed    = false;
  isRecovering = false;

  dieX = player.x;
  dieY = player.y;
  blockedPlatform = null;

  nextCoinSeaScore = COIN_SEA_TRIGGER_STEP;
  coinSeaPhase     = 'none';
  coinSeaTimer     = 0;
  coinSeaTriggerCount = 0;
  coinSeaLeft      = 0;

  slopeActive = false;
  slopeStage  = 0;
  slopeTimer  = 0;

  ironPotActive = false;
  if (typeof refreshPotButton === 'function') refreshPotButton();

  // 宠物「用户」
  petX = player.x + 60;
  petY = player.y - 100;
  petT = 0;

  // 昼夜：每局都从白天中段开始
  dayTime = 0.15;
}

/* =========================================================
   分数存档
   ========================================================= */
function updateBest() {
  if (score > best) {
    best = score;
    if (Math.floor(best / 10) > scoreSaved) {
      scoreSaved = Math.floor(best / 10);
      saveBest(best);
    }
  }
}
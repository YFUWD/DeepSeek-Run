/* =========================================================
   01 基础配置：物理参数 / 颜色 / 素材槽位
   ========================================================= */

const cvs = document.getElementById('c');
const ctx = cvs.getContext('2d');

const BASE_H = 600;
let W  = 0;
let H  = BASE_H;
let GY = 0;
let SCREEN_X = 0;

/* =========================================================
   物理参数
   ========================================================= */
const GRAV_UP    = 0.65;
const GRAV_DOWN  = 0.95;
const JUMPV      = -13;
const FAST_FALL  = 16;

const SPD        = 3.8;
const SPD_MAX    = 16;
/* 每帧加速量。速度拉满所需时间 = (SPD_MAX - SPD) / SPD_ACC，
   要缩短 30% 就把旧值 0.0008 除以 0.7 → 0.00114。
   （原约 254 秒 → 现在约 178 秒） */
const SPD_ACC    = 0.00114;

const COYOTE     = 6;
const BUFFER     = 8;

const INVULN_TIME = 300;
const AD_SECONDS  = 5;

/* =========================================================
   触屏操作
   ---------------------------------------------------------
   点上半屏跳、按住下半屏滑铲。这条线原来在 0.7（下面 30%），
   竖屏手机上下面那一块太矮不好按，放宽到 0.66。
   ========================================================= */
const TOUCH_DUCK_LINE = 0.66;

/* =========================================================
   昼夜循环
   ========================================================= */
const DAY_LENGTH = 90 * 60;    // 一个完整昼夜 = 90 秒
const SUN_R      = 46;         // 太阳半径
const MOON_R     = 34;         // 月亮半径

/* =========================================================
   素材槽位
   ========================================================= */
const SPR = {
  player    : null,
  pet       : null,
  pot       : null,   // 一整只铁盆（上+下已对齐拼合）
  potBottom : null,
  potTop    : null,
  coin      : null,
  wall1     : null,
  wall2     : null,
  wall3     : null,
  wall4     : null,
  wall5     : null,
  barn1     : null,
  barn2     : null,
  barn3     : null,
  barn4     : null,
  barn5     : null,
  holed     : null,
  ground    : null,
  sun       : null,
  moon      : null,
  monster   : null,   // 怪物本体
  bullet    : null,   // 藤壶子弹
  playerDuck: null,   // 滑铲（趴下）姿态
  playerRun2: null,   // 跑步动画第 2 帧
  playerRun3: null,   // 跑步动画第 3 帧
  playerRun4: null,   // 跑步动画第 4 帧
};

/* =========================================================
   素材的显示尺寸（只影响画面，不影响碰撞盒）
   ========================================================= */
const PLAYER_SPRITE_H = 56;   // 人物贴图绘制高度（= PL_H，脚底对齐）
const WALL_ROTATE     = true; // 高墙素材是横躺铅笔 → 画的时候转 90°
const POT_WIDTH_RATIO = 1.05;  // 铁盆宽度 = 人物宽度 × 这个值
/* 铁盆两半各自的「高 / 宽」，按素材原图比例填（上部分 1013×457，下部分 1007×342） */
const POT_TOP_H_RATIO    = 457 / 1013;
const POT_BOTTOM_H_RATIO = 342 / 1007;
/* 铁盆左上角相对「脚底中心」的 y：负数是往上。两半共用这个锚点。
   -56 是扫出来的：盆顶扣在头顶、盆沿卡在额头（不挡眼睛），脸完整露出来 */
const POT_Y = -56;
/* 盆身（下半）只画这个 y 以下的部分，免得把脸糊住 */
const POT_BOTTOM_CLIP_Y = -30;
const COIN_SPRITE_W   = 26;   // 鲸元券贴图宽度（按原图比例算高）
const COIN_GLOW_R     = 30;   // 鲸元券金色光圈半径
const COIN_GLOW_A     = 0.30; // 光圈中心不透明度（半透明金色）
const MONSTER_SPRITE_W = 68;  // 怪物贴图宽度
const RUN_FRAME_STEP  = 0.05; // 跑步动画每帧推进多少（越小腿摆得越慢）
/* 滑铲贴图的宽度 = 高度 × 这个值（比原图比例略放宽一点，趴着才不显小） */
const DUCK_W_RATIO    = 1.35;
/* 滑铲整体缩放：1.20 = 比上一版放大 20% */
const DUCK_SCALE      = 1.20;
/* 滑铲贴图「直接压扁」的倍数：1.2 = 高度压到原来的 1/1.2（宽度按比例一起变），
   只影响画面，不影响碰撞盒。想更扁就调大。 */
const DUCK_SQUASH     = 1.20;
/* 铁盆「盆顶 / 盆身」的分层裁切线（占整只盆高度的比例）。
   铁盆_完整.png = 上部分(盆顶,高452) 直接叠 下部分(盆身,高341)，共 793。
   裁切线取在盆沿那条亮带中间，两层都能盖住，看不出接缝。 */
const POT_RIM_RATIO   = 440 / 793;

/* 跑步动画帧序号（0 = 静态的 玩家_跑1.png） */
let runFrame = 0;

const COL = {
  skyTop:     '#4f9fd4',
  skyMid:     '#8ec9e8',
  skyLow:     '#dff0fa',
  seaTop:     '#3d92c2',
  seaBottom:  '#1b5b85',
  hillColor:  'rgba(82, 125, 125, .6)',
  cloudColor: 'rgba(255,255,255,.85)',
  dirt:       '#8b5a2b',
  dirtDark:   '#5c3a1a',
  grass:      '#3aa655',
  grassDark:  '#236b36',
  pit:        '#3a2410',
  pitDeep:    '#1a0f06',
  sky:        '#8ec9e8',
  skyBlock:   'rgba(255,255,255,.05)',
  ground:     '#5a3a1f',
  groundLine: '#3a2410',
  player:     '#ffd166',
  coin:       '#ffcc00',
  wall:       '#ef476f',
  barn:       '#06d6a0',
  holed:      '#8b5e3c',
  txt:        '#e8eefc',
  invuln:     'rgba(255,209,102,.75)',
};

/* =========================================================
   关卡生成参数
   ========================================================= */
const BARN_R   = 15;
const BARN_GAP = 10;

const PLAT_H          = [0, 60, 120, 180];
const LEVEL_DUR_MIN   = 5;
const LEVEL_DUR_MAX   = 15;
const PLAT_MIN_W      = 450;
const PLAT_MAX_W      = 800;
const PLAT_CHANCE     = 0.35;
const PUSH_BACK_SPEED = 1.5;
const PLAT_OBST_CHANCE = 0.4;
/* 障碍密度：2.3 = 比原来多约 30%（按「每 1000 像素出现多少处障碍」标定的；
   实测 ×2.2 是 +28.4%、×2.3 约 +31%）。
   同时作用在两处（见 06_obstacles.js）：
     · 独立障碍出现的概率   0.10 → 0.10 × 2.3（上限 0.9）
     · 障碍之间的间距       除以 2.3
   想再密一点就调大，回到原始密度就设 1.0。 */
const OBST_DENSITY = 2.3;
const HOLED_SAFE_GAP   = 380;
const PIT_ON_PLAT_CHANCE = 0.35;
const PIT_ON_PLAT_MIN_W  = 70;
const PIT_ON_PLAT_MAX_W  = 110;

const SPAWN_AHEAD   = 1600;
const RECYCLE_BEHIND = 200;

const OBSTACLE_W = {
  wall:  36,     // 高墙（铅笔）宽度
  holed: 68,     // 洞墙（藤蔓）【画面】宽度：飘字贴在它的左边
  /* 洞墙的【碰撞盒】宽度。
     藤蔓贴图尖端实际只有 5~10px 粗，原来整条 68px 都算碰撞，明显和画面对不上。
     这里按量到的尖端宽度来，碰撞盒会居中落在藤蔓中间。 */
  holedHit: 12,
  holedGap: 32,
};

/* =========================================================
   洞墙（藤蔓）左边的魂技飘字
   ========================================================= */
const VINE_TEXT_1    = '第二魂技';
const VINE_TEXT_2    = '寄生！';
const VINE_TEXT_SIZE = 26;    // 字号
const VINE_TEXT_GAP  = 14;    // 文字右端离藤蔓左边多少像素
const VINE_TEXT_DY   = 180;   // 第一行在屏幕上的 y（洞墙是从屏幕顶垂下来的，别贴顶）

const COIN_R = 10;
const COIN_DX = 36;

/* =========================================================
   复活规则
   ========================================================= */
const REVIVE_CLEAR_BACK  = 80;
const REVIVE_CLEAR_AHEAD = 520;
/* 复活时如果被高地层挡住过，就站到台子上；这里控制两个距离（像素）：
   · SNAP_AHEAD：人站在死亡点的前方多远（会落在屏幕偏左，看得见前面）
   · SNAP_MAX  ：平台离死亡点最远超过这个数就不挪，改为原地站起来 */
const REVIVE_SNAP_AHEAD = 150;
const REVIVE_SNAP_MAX   = 900;

/* =========================================================
   存档 key 与商店
   ========================================================= */
const BEST_KEY = 'whale_run_best_v1';
const COIN_KEY = 'whale_run_coins_v1';
const POT_KEY  = 'whale_run_pots_v1';
const RICE_KEY = 'whale_run_rice_v1';

const PRICE_POT  = 50;
const PRICE_RICE = 1000;

/* =========================================================
   怪物子弹的粉红色外圈
   ========================================================= */
const BULLET_RING_COLOR = '#ff6ec7';   // 粉色描边
const BULLET_RING_W     = 3;           // 描边粗细
const BULLET_RING_GLOW  = 1.9;         // 外圈柔光半径 = 子弹半径 × 这个值
const BULLET_RING_ALPHA = 0.55;        // 柔光强度

/* =========================================================
   鲸元券海
   ========================================================= */
const COIN_SEA_TRIGGER_STEP  = 500;
const COIN_SEA_TRANSITION    = 3 * 60;
const COIN_SEA_DURATIONS     = [4 * 60, 7 * 60, 10 * 60];
const COIN_SEA_COLS          = 10;
const COIN_SEA_REVIVE_OFFSET = 100;

/* =========================================================
   坡
   ========================================================= */
const SLOPE_SEQUENCE     = [0, 1, 2, 3, 2, 1, 0];
const SLOPE_STAGE_FRAMES = 1.5 * 60;
const SLOPE_CHANCE       = 0.3;

/* =========================================================
   怪物与藤壶子弹
   ========================================================= */
const MONSTER_INTERVAL_MIN  = 30 * 60;
const MONSTER_INTERVAL_MAX  = 50 * 60;
const MONSTER_DURATION      = 20 * 60;   // 怪物一出场活 20 秒
const MONSTER_R             = 34;
const MONSTER_FIRE_DELAY    = 60;
const MONSTER_FIRE_INTERVAL = 90;
const MONSTER_SCREEN_X      = 90;
const MONSTER_BULLET_SPEED  = 2.6;
const MONSTER_BULLET_R      = 8;
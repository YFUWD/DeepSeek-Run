/* =========================================================
   16 商店 / 购买 / 铁盆使用 / 白饭界面 / 开场菜单
   ========================================================= */

const SHOP_ITEMS = {
  pot:  { name: '铁盆', price: PRICE_POT,  get owned() { return ironPotsOwned; } },
  rice: { name: '白饭', price: PRICE_RICE, get owned() { return riceOwned; } },
};

let currentBuyItem = null;

/* ---------------- DOM ---------------- */
const buyOverlay    = document.getElementById('buyOverlay');
const buyTitle      = document.getElementById('buyTitle');
const buyPrice      = document.getElementById('buyPrice');
const buyMsg        = document.getElementById('buyMsg');
const btnBuyCancel  = document.getElementById('btnBuyCancel');
const btnBuyConfirm = document.getElementById('btnBuyConfirm');
const itemPot       = document.getElementById('itemPot');
const itemRice      = document.getElementById('itemRice');
const potOwnedEl    = document.getElementById('potOwned');
const riceOwnedEl   = document.getElementById('riceOwned');
const shopCoinsNum  = document.getElementById('shopCoinsNum');
const potButton     = document.getElementById('potButton');
const potButtonCount= document.getElementById('potButtonCount');

const riceOverlay     = document.getElementById('riceOverlay');
const riceImageBox    = document.getElementById('riceImageBox');
const riceImageLabel  = document.getElementById('riceImageLabel');
const btnRiceContinue = document.getElementById('btnRiceContinue');


/* =========================================================
   把素材贴到界面元素上（商店卡片 / 道具按钮）
   ---------------------------------------------------------
   CSS 里原来是渐变画的占位图，这里换成真素材。
   元素取不到就静默跳过，不影响玩。
   ========================================================= */
function applyUiImages() {
  const set = (el, url) => {
    if (!el || !url) return;
    el.style.backgroundImage = `url(${url})`;
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center';
    // 标记一下「这里已经贴了真素材」，CSS 里据此关掉占位渐变和 ::after 圆斑
    el.dataset.img = '1';
  };

  set(document.querySelector('.shopIconPot'), POT_IMAGE);
  set(document.querySelector('.shopIconRice'), RICE_ICON);   // 商店卖的是白饭，用白饭素材
  set(document.querySelector('.potDot'), POT_IMAGE);
  set(document.querySelector('.totalCoinIcon'), COIN_IMAGE);

  // 所有「鲸元券」小图标（商店价格 / 商店余额 / 购买弹窗 / 死亡弹窗）统一换成票券素材
  document.querySelectorAll('.coinDot').forEach(el => set(el, COIN_IMAGE));

  // 换了真图就不要原来那圈 CSS 画的边框/高光了
  ['.shopIconPot', '.shopIconRice', '.potDot'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.style.boxShadow = 'none';
  });
}

applyUiImages();


/* =========================================================
   铁盆按钮刷新
   ========================================================= */
function refreshPotButton() {
  if (!potButton) return;
  const show = ironPotsOwned > 0 || ironPotActive;
  potButtonCount.textContent = String(ironPotsOwned);
  potButton.classList.toggle('active', ironPotActive);
  potButton.classList.toggle('hidden', !show);
}


/* =========================================================
   使用铁盆
   ========================================================= */
function useIronPot() {
  if (state !== 'playing') return;
  if (ironPotActive) return;
  if (ironPotsOwned <= 0) return;

  ironPotsOwned--;
  saveCount(POT_KEY, ironPotsOwned);
  ironPotActive = true;
  SFX.click();
  refreshPotButton();
}


/* =========================================================
   商店 UI
   ========================================================= */
function openShop() {
  shopOverlay.classList.remove('hidden');
  refreshShopUI();
}

function refreshShopUI() {
  if (potOwnedEl)  potOwnedEl.textContent  = String(ironPotsOwned);
  if (riceOwnedEl) riceOwnedEl.textContent = String(riceOwned);
  if (shopCoinsNum) shopCoinsNum.textContent = String(totalCoins);
}

function openBuyDialog(key) {
  currentBuyItem = key;
  const item = SHOP_ITEMS[key];
  buyTitle.textContent = item.name;
  buyPrice.textContent = String(item.price);

  const enough = totalCoins >= item.price;
  buyMsg.textContent = enough ? '' : '鲸元券不足';
  btnBuyConfirm.disabled = !enough;

  buyOverlay.classList.remove('hidden');
}


/* =========================================================
   确认购买
   ========================================================= */
function confirmBuy() {
  if (!currentBuyItem) return;
  const item = SHOP_ITEMS[currentBuyItem];
  if (totalCoins < item.price) return;

  totalCoins -= item.price;
  saveTotalCoins(totalCoins);

  const wasRice = (currentBuyItem === 'rice');

  if (currentBuyItem === 'pot') {
    ironPotsOwned++;
    saveCount(POT_KEY, ironPotsOwned);
  } else if (currentBuyItem === 'rice') {
    riceOwned++;
    saveCount(RICE_KEY, riceOwned);
  }

  SFX.buy();
  buyOverlay.classList.add('hidden');
  refreshShopUI();
  refreshPotButton();

  if (wasRice) showRiceOverlay();
}


/* =========================================================
   白饭成功界面
   ========================================================= */
/* 把胜利 CG 画到白饭弹窗里。
   图片没到位就显示「加载中…」—— 以前这里会露出
   「大肥鱼图片（素材插入位置）」这句开发时的备注，成品里不该出现。 */
function ricePaint() {
  const has = (typeof RICE_IMG !== 'undefined') && RICE_IMG;
  const ready = has && !RICE_IMG._none && !RICE_IMG._fail &&
                RICE_IMG.complete && RICE_IMG.naturalWidth > 0;

  if (ready) {
    riceImageBox.style.backgroundImage = `url(${RICE_IMAGE})`;
    riceImageBox.style.aspectRatio = RICE_IMG.naturalWidth + ' / ' + RICE_IMG.naturalHeight;
    riceImageLabel.style.display = 'none';
  } else {
    riceImageBox.style.backgroundImage = 'none';
    riceImageBox.style.aspectRatio = '';
    riceImageLabel.style.display = 'block';
    riceImageLabel.textContent = (has && RICE_IMG._fail) ? '胜利 CG 加载失败' : '加载中…';
  }
}

/* CG 晚一步加载好的话，补画一次（弹窗开着才有意义） */
if (typeof RICE_IMG !== 'undefined') {
  const riceAgain = () => {
    if (riceOverlay && !riceOverlay.classList.contains('hidden')) ricePaint();
  };
  RICE_IMG.addEventListener('load',  riceAgain);
  RICE_IMG.addEventListener('error', riceAgain);
}

function showRiceOverlay() {
  if (!riceOverlay) return;

  /* 买白饭 = 通关胜利，放 victory 音效（开头空白已在生成时剪掉） */
  SFX.victory();

  ricePaint();
  riceOverlay.classList.remove('hidden');
}


/* =========================================================
   事件绑定
   ========================================================= */
itemPot.addEventListener('click', () => { SFX.click(); openBuyDialog('pot'); });
itemRice.addEventListener('click', () => { SFX.click(); openBuyDialog('rice'); });

btnBuyCancel.addEventListener('click', () => {
  SFX.click();
  buyOverlay.classList.add('hidden');
});

btnBuyConfirm.addEventListener('click', confirmBuy);

potButton.addEventListener('click', useIronPot);

if (btnRiceContinue) {
  btnRiceContinue.addEventListener('click', () => {
    SFX.click();
    riceOverlay.classList.add('hidden');
    shopOverlay.classList.add('hidden');
    overlay.classList.add('hidden');
    reset();
    state = 'playing';
  });
}

/* Z 键使用铁盆 */
addEventListener('keydown', e => {
  if (e.code !== 'KeyZ') return;
  if (state !== 'playing') return;
  e.preventDefault();
  useIronPot();
});


/* =========================================================
   开场主菜单
   ========================================================= */
const INTRO_KEY = 'whale_run_intro_v1';

const menuOverlay  = document.getElementById('menuOverlay');
const btnStartGame = document.getElementById('btnStartGame');

function isFirstPlay() {
  try { return !localStorage.getItem(INTRO_KEY); }
  catch (e) { return true; }
}
function markIntroSeen() {
  try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* 忽略 */ }
}

function showMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.remove('hidden');
  state = 'menu';
}
function hideMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.add('hidden');
}

if (btnStartGame) {
  btnStartGame.addEventListener('click', () => {
    /* ★ audioUnlock 必须在这里叫一次。
       它原来只挂在键盘和画布上，点按钮走不到 ——
       结果「开始游戏」不仅没声音，AudioContext 也没建起来，
       SFX.click() 是空跑。点了按钮才算真正开始，顺手解锁。 */
    audioUnlock();

    SFX.click();
    markIntroSeen();
    hideMenu();
    reset();

    // reset 之后玩家在正常初始位置（SCREEN_X）。
    // 把相机往右挪一点，让玩家的屏幕位置变成屏幕最左侧（x = 20），
    // 这样玩家"一开始就站在屏幕左侧"，然后在 intro 里往前跑到初始位置。
    cam = player.x - 20;

    state      = 'intro';
    viewOffset = MENU_VIEW_OFFSET;

    // ★ 按开始之后隔 2 秒才起 BGM（时长见 00_audio.js 的 BGM_START_DELAY_MS）
    bgmStartCountdown();

    // 手机上第一次玩：标一下「上面跳 / 下面滑铲」的分界
    if (typeof maybeShowTouchHint === 'function') maybeShowTouchHint();
  });
}

/* 主菜单右侧配图 */
const menuImageBox   = document.getElementById('menuImageBox');
const menuImageLabel = document.getElementById('menuImageLabel');

function refreshMenuImage() {  if (!menuImageBox) return;

  if (typeof MENU_IMG !== 'undefined' &&
      MENU_IMG && !MENU_IMG._none && !MENU_IMG._fail &&
      MENU_IMG.complete && MENU_IMG.naturalWidth > 0) {
    menuImageBox.style.backgroundImage = `url(${MENU_IMAGE})`;
    if (menuImageLabel) menuImageLabel.style.display = 'none';
  } else {
    menuImageBox.style.backgroundImage = 'none';
    if (menuImageLabel) menuImageLabel.style.display = 'block';
  }
}

if (typeof MENU_IMG !== 'undefined') {
  MENU_IMG.addEventListener('load', refreshMenuImage);
  MENU_IMG.addEventListener('error', refreshMenuImage);
}
refreshMenuImage();


/* =========================================================
   Shift + R：完全重置
   ========================================================= */
addEventListener('keydown', e => {
  if (!(e.shiftKey && e.code === 'KeyR')) return;
  e.preventDefault();

  try {
    localStorage.removeItem(BEST_KEY);
    localStorage.removeItem(COIN_KEY);
    localStorage.removeItem(POT_KEY);
    localStorage.removeItem(RICE_KEY);
    localStorage.removeItem(INTRO_KEY);
  } catch (err) { /* 忽略 */ }

  best          = 0;
  scoreSaved    = 0;
  totalCoins    = 0;
  coinsCollected= 0;
  ironPotsOwned = 0;
  riceOwned     = 0;
  ironPotActive = false;

  reset();
  refreshShopUI();
  refreshPotButton();
  showMenu();

  console.log('[重置] 全部存档已清空，回到主菜单');
});
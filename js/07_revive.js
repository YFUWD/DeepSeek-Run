/* =========================================================
   07 死亡 / 广告 / 复活
   ========================================================= */


/* =========================================================
   死亡
   ========================================================= */
function die() {
  if (state !== 'playing') return;

  SFX.die();

  // 记下死在哪，复活时要靠它决定从哪继续
  dieX = player.x;
  dieY = player.y;

  totalCoins += coinsCollected;
  saveTotalCoins(totalCoins);
  coinsCollected = 0;

  if (!hasRevived) {
    state = 'dead';
    overlayTitle.textContent = '游戏结束';
    btnAd.classList.remove('hidden');
  } else {
    state = 'gameover';
    overlayTitle.textContent = '游戏结束';
    btnAd.classList.add('hidden');
  }

  if (totalCoinNum) totalCoinNum.textContent = String(totalCoins);
  overlay.classList.remove('hidden');
}


/* =========================================================
   广告
   ========================================================= */
const btnAdRevive = document.getElementById('btnAdRevive');
const adHintEl    = document.getElementById('adHint');
const adLink      = document.getElementById('adLink');

let adShownIdx = -1;

/* 把广告图画进弹窗。
   图片还没到位就显示「加载中…」——
   以前这里不管三七二十一都写「加载失败」，其实只是手机上网慢还没下完，
   白吓人一跳。只有真的 onerror（图挂了）才说失败。 */
function adPaint(idx) {
  const src = AD_IMAGES[idx];
  const img = AD_IMGS[idx];
  const ready = img && !img._fail && img.complete && img.naturalWidth > 0;

  if (ready) {
    adImageBox.style.backgroundImage = `url(${src})`;
    adImageBox.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
    adImageLabel.style.display = 'none';
    return;
  }

  adImageBox.style.backgroundImage = 'none';
  adImageBox.style.aspectRatio = '';
  adImageLabel.style.display = 'block';
  adImageLabel.textContent = (img && img._fail) ? `广告图片 ${idx + 1} 加载失败` : '加载中…';
}

/* 图还没到时挂一次钩子：到了就补画一遍。
   以前只判断一次，图后面加载好了也不会重画，
   于是整个 5 秒都挂着「加载失败」。 */
function adHookImage(idx) {
  const img = AD_IMGS[idx];
  if (!img || img._hooked) return;
  img._hooked = true;
  const again = () => { if (state === 'ad' && adShownIdx === idx) adPaint(idx); };
  img.addEventListener('load',  again);
  img.addEventListener('error', again);
}

function showAd() {
  state   = 'ad';
  adTimer = AD_SECONDS * 60;

  const idx = Math.floor(Math.random() * AD_IMAGES.length);
  adShownIdx = idx;

  ensureAdImage(idx);   // 第一次弹广告时才真的去下这张（首屏少下约 2MB）
  adHookImage(idx);
  adPaint(idx);

  if (adLink) {
    const url = (typeof AD_LINKS !== 'undefined' && AD_LINKS[idx]) || '';
    if (url) {
      adLink.href = url;
      adLink.classList.remove('hidden');
    } else {
      adLink.classList.add('hidden');
    }
  }

  adCountdown.textContent = String(AD_SECONDS);
  adCountdown.classList.remove('hidden');
  if (adHintEl) {
    adHintEl.textContent = '秒后可复活';
    adHintEl.classList.remove('hidden');
  }
  if (btnAdRevive) btnAdRevive.classList.add('hidden');

  adOverlay.classList.remove('hidden');
}

function updateAd(dt) {
  if (adTimer <= 0) return;

  adTimer -= dt;
  adCountdown.textContent = String(Math.max(0, Math.ceil(adTimer / 60)));

  if (adTimer <= 0) {
    adCountdown.textContent = '0';
    if (adHintEl) adHintEl.textContent = '广告已看完';
    if (btnAdRevive) btnAdRevive.classList.remove('hidden');
  }
}


/* =========================================================
   原地复活
   ---------------------------------------------------------
   只清理「障碍物」和「坑洞」，【地层 platforms 不删】，
   这样地形保持原样、不会出现空洞。

   ★ 关键：如果玩家是「被高地层挡住、一直被往回推、最终被推出屏幕」而死的，
     光把人放回地面是没用的 —— 他会再次贴在平台侧面上，无限即死。
     所以这种情况要把人放到**挡路那块平台的顶上**，从上面继续跑。

     回到哪一块台子上是按距离算的：
       ① 挡路的那块台子（它一定就在正前方）
       ② 往前找最近的一块高地层
     距离上限由 REVIVE_SNAP_MAX 控制，太远就还是原地站起来。
   ========================================================= */
function tryReviveOnPlatform() {
  const refX = (isFinite(dieX) && dieX > 0) ? dieX : player.x;

  // 候选：挡路的那块，加上前方所有高地层，按距离近到远
  const cands = [];
  if (blockedPlatform && blockedPlatform.y < GY - 4) cands.push(blockedPlatform);
  for (const p of platforms) {
    if (p.y < GY - 4 && p.x > refX - 40 && !cands.includes(p)) cands.push(p);
  }
  cands.sort((a, b) => a.x - b.x);

  for (const p of cands) {
    const dist = p.x - refX;
    if (dist > REVIVE_SNAP_MAX) continue;

    /* 站在台面的哪个 x：能让玩家落在屏幕偏左、看得见前面 */
    let x = refX + REVIVE_SNAP_AHEAD;
    x = Math.max(x, p.x + pW() / 2 + 2);                  // 越过平台左缘
    x = Math.min(x, p.x + p.w - pW() / 2 - 2);            // 别超出右缘
    if (x <= p.x) continue;
    if (!canStandOnPlatformAt(p, x)) {
      // 这个位置不行（坑 / 被更高的台子挤住），往前挪一小段再试两次
      x = Math.max(p.x + pW() / 2 + 2, Math.min(x + 60, p.x + p.w - pW() / 2 - 2));
      if (!canStandOnPlatformAt(p, x)) continue;
    }

    player.x        = x;
    player.y        = p.y;        // 脚底落在台面上
    return true;
  }
  return false;
}

function revive() {
  hasRevived = true;

  /* 复活瞬间的「安全距离」：按当前速度折算，夹在上下限之间。
     写死距离的坑见 01_config.js 里 REVIVE_SAFE_FRAMES 那段注释。 */
  const safe = clamp(speed * REVIVE_SAFE_FRAMES, REVIVE_SAFE_MIN, REVIVE_SAFE_MAX);

  // 只清障碍和坑洞；platforms 保持不动
  obstacles = obstacles.filter(o => o.x + o.w < player.x - REVIVE_CLEAR_BACK ||
                                    o.x > player.x + safe);
  pits      = pits.filter(p => p.x + p.w < player.x - REVIVE_CLEAR_BACK ||
                               p.x > player.x + safe);

  // 先试「站到挡路那块台子顶上」；不行再退回原来的做法（站回脚下那层地面）
  const placed = tryReviveOnPlatform();
  if (!placed) {
    const standY = groundYAt(player.x + pW() / 2);
    player.y = (standY === Infinity) ? GY : standY;
  }

  player.vy       = 0;
  player.jumps    = 0;
  player.onGround = true;
  player.duck     = false;
  player.rot      = 0;
  duckHeld        = false;

  // 相机跟着人走，别让画面卡在死亡位置
  cam = player.x - SCREEN_X;

  // 复活时清掉挡路记录，免得下次复活又用同一块
  blockedPlatform = null;
  blockedSeg      = null;

  /* ★ 安全区一过就必须有东西。
     只清不补的话，如果正好清在「奖励时间」那片平地上，
     前方能一路空到大几百像素 —— 看起来就像关卡不生了。 */
  ensureSomethingAhead(safe);

  invTimer = INVULN_TIME;
  state    = 'playing';
  lastT    = 0;

  const reviveTarget = Math.floor(score) + COIN_SEA_REVIVE_OFFSET;
  nextCoinSeaScore   = Math.max(nextCoinSeaScore, reviveTarget);
  coinSeaPhase       = 'none';
  coinSeaTimer       = 0;

  SFX.revive();
}


/* =========================================================
   按钮绑定
   ========================================================= */
btnRetry.addEventListener('click', () => {
  SFX.click();
  overlay.classList.add('hidden');
  adOverlay.classList.add('hidden');
  reset();
  state = 'playing';
});

btnAd.addEventListener('click', () => {
  SFX.click();
  overlay.classList.add('hidden');
  showAd();
});

if (typeof btnShop !== 'undefined' && btnShop) {
  btnShop.addEventListener('click', () => {
    SFX.click();
    if (typeof openShop === 'function') openShop();
    else if (typeof shopOverlay !== 'undefined' && shopOverlay) {
      shopOverlay.classList.remove('hidden');
    }
  });
}
if (typeof btnShopClose !== 'undefined' && btnShopClose) {
  btnShopClose.addEventListener('click', () => {
    SFX.click();
    if (shopOverlay) shopOverlay.classList.add('hidden');
  });
}

if (btnAdRevive) {
  btnAdRevive.addEventListener('click', () => {
    SFX.click();
    adOverlay.classList.add('hidden');
    btnAdRevive.classList.add('hidden');
    revive();
  });
}
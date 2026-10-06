/* =========================================================
   08 输入：键盘 + 触屏/鼠标
   ---------------------------------------------------------
   跳跃：空格 / ↑ / W          滑铲：↓ / S（按住）
   鼠标：左键跳、右键蹲         触屏：上半屏跳、下半屏蹲
   另外：M 静音开关

   手机上「按住蹲」是靠 pointerdown / pointerup 配对的，
   指针滑出画布（pointerleave / pointercancel）也会松手，
   免得手指划出去以后人物一直趴着。
   ========================================================= */

/* ---------------- 键盘 ---------------- */
addEventListener('keydown', e => {
  audioUnlock();     // 第一次按键顺便解锁声音

  if (e.code === 'KeyM') { toggleMute(); return; }   // 静音在任何状态下都能按

  if (state !== 'playing') return;

  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    doJump();
  }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    e.preventDefault();
    duckHeld = true;
  }
  // 其它按键不改变滑铲状态（松开交给 keyup / blur 处理）
});

addEventListener('keyup', e => {
  if (e.code === 'ArrowDown' || e.code === 'KeyS') duckHeld = false;
});


/* ---------------- 鼠标 / 触屏 ---------------- */
cvs.addEventListener('contextmenu', e => e.preventDefault());   // 右键要用来蹲，别弹菜单

cvs.addEventListener('pointerdown', e => {
  e.preventDefault();
  audioUnlock();

  // 先复位一次滑铲状态，避免上一次 pointerup 丢了导致这次一按就趴下
  duckHeld = false;

  if (state !== 'playing') return;

  if (e.pointerType === 'mouse') {
    if (e.button === 2)      duckHeld = true;    // 右键蹲
    else if (e.button === 0) doJump();           // 左键跳
  } else {
    /* 触屏：按在屏幕下方（TOUCH_DUCK_LINE 以下）按住=滑铲，其余=跳。
       注意这里用 **画布** 的矩形算比例，不用 window.innerHeight ——
       手机竖屏时画布是居中、两边留边的，用窗口高度会把分界线算歪。 */
    const r  = cvs.getBoundingClientRect();
    const py = r.height > 0 ? (e.clientY - r.top) / r.height : 0.5;
    if (py > TOUCH_DUCK_LINE) duckHeld = true;
    else                      doJump();
  }
});

/* pointerup / pointercancel 改到 window 上监听，
   即使指针在 canvas 外松开，也一定能复位，不会再卡滑铲。 */
addEventListener('pointerup', e => {
  if (e.pointerType === 'mouse') {
    if (e.button === 2) duckHeld = false;
  } else {
    duckHeld = false;
  }
});

addEventListener('pointercancel', () => { duckHeld = false; });

/* 指针移出画布 / 失焦 / 切到别的标签页，都强制复位 */
cvs.addEventListener('pointerleave', () => { duckHeld = false; });
addEventListener('blur',             () => { duckHeld = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) duckHeld = false;
});

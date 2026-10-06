# 鲸鲸酷跑 · 网页版

一个纯前端的横版跑酷小游戏。跳到鲸元券上、躲开高藤壶和藤蔓、别掉进坑，
撞死了还能看广告原地复活。电脑键盘和手机触屏都能玩。

---

## 怎么打开

**本地**：直接双击 `index.html` 就能跑（不需要起服务器，`file://` 也可以）。
不过背景音乐在 `file://` 下有些浏览器会拦，想听音乐建议用下面的方式：

```bash
# 在项目目录里随便起一个静态服务器
python -m http.server 8000
# 然后浏览器打开 http://localhost:8000
```

**线上**：把整个文件夹传到 GitHub Pages / 任意静态托管即可。

---

## 发布到 GitHub Pages

1. 新建一个仓库，把这个文件夹里的**全部内容**推上去：

   ```bash
   git init
   git add .
   git commit -m "鲸鲸酷跑"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

2. 打开仓库的 **Settings → Pages**
3. **Source** 选 `Deploy from a branch`，分支选 `main`，目录选 `/ (root)`，保存
4. 等一两分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`

> 所有资源都是**相对路径**，所以放在子目录（`用户名.github.io/仓库名/`）也能正常加载。
> 文件夹里带的 `.nojekyll` 是给 GitHub Pages 用的，别删。

---

## 操作

| 电脑 | 手机 |
|---|---|
| `空格` / `↑` / `W` 跳，空中再按一次二段跳 | 点屏幕**上半部分**跳（可二段跳） |
| `↓` / `S` 按住滑铲 / 快速下落 | 按住**下半部分**滑铲 |
| `Z` 使用铁盆 | 点屏幕下方的道具按钮 |
| `M` 静音 | 主菜单里有 BGM 音量滑块 |

---

## 玩法要点

- **鲸元券**：本局吃到的会累计成「总数」，能在商店买东西
- **每 500 分**会触发一次「鲸元券海」——10 秒安全期，地上铺满三排券，没有障碍
- **商店**：铁盆（50）撞碎一个障碍；白饭（1000）买到就是通关，有胜利界面
- **死亡**：第一次可以「看广告复活」，复活会给 5 秒无敌；
  如果是被高地层挡到边缘死的，复活会直接把你放到那块台子上，不会再连死
- **怪物**：每 30~50 秒出现一次、停留 20 秒，会发射藤壶子弹；
  被子弹打到只会往回弹一下（镜头不会跟着倒退），不致命

---

## 目录结构

```
index.html              页面骨架
.nojekyll               给 GitHub Pages 用（跳过 Jekyll 处理）
css/style.css           页面样式、弹窗、触屏提示
js/
  00_audio.js           音效合成 + 背景音乐 + 音量滑块
  01_config.js          ★ 物理参数 / 颜色 / 素材槽位 / 关卡生成参数 / 各种手感开关
  02_utils.js           小工具（随机数、clamp、圆角矩形、存档读写）
  03_assets.js          ★ 素材清单（图片路径填这里）与加载
  04_gamestate.js       全局状态、reset() 重开一局
  05_player.js          人物尺寸 / 跳跃 / 重力物理
  06_obstacles.js       ★ 关卡生成、碰撞盒、吃鲸元券
  07_revive.js          死亡弹窗、广告倒计时、原地复活
  08_input.js           键盘 + 鼠标 + 触屏
  09_update.js          每帧游戏逻辑
  10_camera.js          画幅自适应（含手机竖屏留边）、相机、背景视差、昼夜
  11_render_terrain.js  地面 / 深坑 / 高台
  12_render_entity.js   鲸元券、路障、藤蔓飘字
  13_render_player.js   人物（含铁盆分层、滑铲）
  14_hud.js             分数 / 最高分 / 速度条 / 无敌倒计时
  15_main.js            draw() 总入口 + 主循环 + 怪物逻辑 + 启动
  16_shop.js            商店、购买、白饭胜利界面、开场菜单
audio/
  dfy1~dfy4.mp3         背景音乐（随机循环）
  victory.mp3           买到白饭时的胜利音效
鲸鲸酷跑_素材/          图片素材
```

---

## 想改点什么

大部分可调项都集中在 **`js/01_config.js`**：

| 想改 | 找哪个 |
|---|---|
| 跳跃高度 / 重力 / 落地手感 | `GRAV_UP` `GRAV_DOWN` `JUMPV` `FAST_FALL` |
| 跑速、加速、**速度拉满要多久** | `SPD` `SPD_MAX` `SPD_ACC` |
| **障碍密度**（空平地已经消灭，只会更密） | `OBST_DENSITY`（默认 2.3 = 比最初多 30%） |
| 障碍之间最近/最远距离 | `06_obstacles.js` 的 `nextSpawnGap()` |
| **藤蔓（洞墙）宽度 / 碰撞宽度** | `OBSTACLE_W.holed`（画面）/ `OBSTACLE_W.holedHit`（碰撞） |
| 藤蔓左边那两行字 | `VINE_TEXT_1` `VINE_TEXT_2` `VINE_TEXT_SIZE` `VINE_TEXT_GAP` `VINE_TEXT_DY` |
| **怪物出现间隔 / 存活时长** | `MONSTER_INTERVAL_MIN` `MONSTER_INTERVAL_MAX` `MONSTER_DURATION` |
| 子弹的粉红圈 | `BULLET_RING_COLOR` `BULLET_RING_W` `BULLET_RING_GLOW` `BULLET_RING_ALPHA` |
| 被子弹打到的回弹力度 / 无敌 | `15_main.js` 的 `BULLET_KNOCKBACK` `BULLET_KNOCK_FRAMES` `BULLET_HIT_IFRAME` |
| **手机竖屏画幅**（留边多少） | `10_camera.js` 的 `MIN_ASPECT` |
| 触屏「跳 / 滑铲」分界 | `TOUCH_DUCK_LINE` |
| 铁盆位置与大小 | `POT_WIDTH_RATIO` `POT_Y` `POT_BOTTOM_CLIP_Y` |
| 滑铲压扁程度 | `DUCK_SCALE` `DUCK_SQUASH` `DUCK_W_RATIO` |
| 背音乐音量 | `js/00_audio.js` 的 `BGM_VOLUME`，或直接在游戏里拖滑块 |
| 四种路障的出现比例 | `06_obstacles.js` 的 `spawnObstacleAt()` / `placeObstacleAt()` |
| 广告图 / 广告链接 | `js/03_assets.js` 的 `AD_IMAGES` / `AD_LINKS` |

### 换美术

图片都放在 `鲸鲸酷跑_素材/`，路径写在 **`js/03_assets.js` 的 `ASSET_FILES`** 里。
某个槽位留空 `''` 也能玩，会退回程序绘制的占位图形，控制台会打一行 warning。

> 素材作者说明：角色「鲸鱼娘」来自同人小游戏《大肥鱼大战西装藤壶怪》，
> **请勿商用**，也别声称是官方素材。

---

## 已知限制

- **地面贴图**目前是程序绘制的泥土+草地（没有对应素材）
- 背景音乐在 `file://` 下部分浏览器会拦（浏览器的自动播放策略），用 http 打开就正常
- 手机上竖屏会**上下留一点边**（黑边），这是故意的：不留边的话游戏可视宽度只有
  `600 × 0.46 ≈ 277`，前面来什么都看不清。想让留边少一点就调小 `MIN_ASPECT`

import { mkdtempSync, readdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const outputDir = resolve(root, "promo-output");
const videoDir = mkdtempSync(join(tmpdir(), "nightflight-ad-"));
const target = process.argv[2] || pathToFileURL(resolve(root, "index.html")).href;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_PATH || undefined
});
const context = await browser.newContext({
  viewport: { width: 720, height: 1280 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: videoDir,
    size: { width: 720, height: 1280 }
  }
});

const page = await context.newPage();
await page.route("**/api/leaderboard**", route => {
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ entries: [], rank: null })
  });
});

await page.goto(target, { waitUntil: "load" });
await page.waitForSelector("#game");

await page.evaluate(() => {
  const style = document.createElement("style");
  style.textContent = `
    html, body {
      width: 720px !important;
      height: 1280px !important;
      overflow: hidden !important;
      background: #050914 !important;
    }
    .shell {
      width: 720px !important;
      height: 1280px !important;
      display: block !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .side-panel {
      display: none !important;
    }
    .game-stage {
      width: 720px !important;
      height: 1280px !important;
      min-height: 1280px !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    canvas {
      width: 720px !important;
      height: 1280px !important;
      border-radius: 0 !important;
    }
    .dialog {
      display: none !important;
    }
    .overlay.top {
      top: 28px !important;
      left: 24px !important;
      right: 24px !important;
    }
    .overlay.bottom {
      bottom: 28px !important;
      left: 24px !important;
      right: 24px !important;
    }
    .title-lockup h1 {
      font-size: 26px !important;
    }
    .scorebox {
      min-width: 128px !important;
      background: rgba(4, 8, 18, .62) !important;
    }
    .scorebox strong {
      font-size: 34px !important;
    }
    .quick-stats {
      display: none !important;
    }
    .meter-group {
      width: 100% !important;
      background: rgba(4, 8, 18, .62) !important;
    }
    .bossbar {
      top: 118px !important;
      width: 642px !important;
      background: rgba(4, 8, 18, .72) !important;
    }
    .ad-vignette {
      position: fixed;
      inset: 0;
      z-index: 9000;
      pointer-events: none;
      background:
        linear-gradient(180deg, rgba(3, 7, 14, .78), transparent 28%, transparent 62%, rgba(3, 7, 14, .82)),
        radial-gradient(circle at 50% 46%, transparent 18%, rgba(4, 8, 18, .35) 72%);
    }
    .ad-copy {
      position: fixed;
      z-index: 9999;
      left: 34px;
      right: 34px;
      top: 170px;
      display: grid;
      gap: 14px;
      color: white;
      font-family: "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
      text-align: center;
      pointer-events: none;
      text-shadow: 0 5px 22px rgba(0, 0, 0, .85);
    }
    .ad-kicker {
      justify-self: center;
      padding: 7px 13px;
      border: 1px solid rgba(255, 209, 102, .6);
      border-radius: 999px;
      color: #ffd166;
      background: rgba(12, 9, 3, .62);
      font-size: 20px;
      font-weight: 900;
    }
    .ad-title {
      font-size: 68px;
      line-height: .98;
      font-weight: 1000;
      letter-spacing: 0;
    }
    .ad-title strong {
      color: #4de7ff;
      font-style: normal;
    }
    .ad-subtitle {
      justify-self: center;
      max-width: 620px;
      padding: 10px 16px;
      border-radius: 10px;
      background: rgba(5, 10, 22, .7);
      color: #eff8ff;
      font-size: 27px;
      font-weight: 900;
      line-height: 1.22;
    }
    .ad-stamp {
      position: fixed;
      z-index: 9999;
      right: 30px;
      top: 42px;
      padding: 11px 14px;
      border: 2px solid rgba(121, 255, 157, .72);
      border-radius: 10px;
      color: #79ff9d;
      background: rgba(3, 12, 8, .55);
      font: 1000 22px/1 "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
      transform: rotate(4deg);
      pointer-events: none;
      box-shadow: 0 0 28px rgba(121, 255, 157, .22);
    }
    .ad-url {
      position: fixed;
      z-index: 9999;
      left: 34px;
      right: 34px;
      bottom: 72px;
      display: grid;
      gap: 10px;
      pointer-events: none;
      text-align: center;
      font-family: "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
    }
    .ad-url b {
      justify-self: center;
      padding: 13px 22px;
      border-radius: 12px;
      color: #06131c;
      background: linear-gradient(180deg, #7df5ff, #36c6ff);
      font-size: 34px;
      font-weight: 1000;
      box-shadow: 0 18px 42px rgba(54, 198, 255, .35);
    }
    .ad-url span {
      color: rgba(238, 245, 255, .88);
      font-size: 20px;
      font-weight: 800;
      text-shadow: 0 4px 18px rgba(0, 0, 0, .75);
    }
    .ad-pop {
      position: fixed;
      z-index: 9999;
      left: 46px;
      top: 840px;
      padding: 10px 14px;
      border-radius: 9px;
      color: #07111b;
      background: #ffd166;
      font: 1000 26px/1 "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
      pointer-events: none;
      transform: rotate(-5deg);
      box-shadow: 0 14px 34px rgba(255, 209, 102, .24);
    }
  `;
  document.head.append(style);

  const vignette = document.createElement("div");
  vignette.className = "ad-vignette";
  document.body.append(vignette);

  const copy = document.createElement("div");
  copy.className = "ad-copy";
  copy.innerHTML = `
    <div class="ad-kicker">刷题人专属弹幕游戏</div>
    <div class="ad-title">这不是<br><strong>普通飞机</strong></div>
    <div class="ad-subtitle">它会把 OJ 压力测试打成 Boss 战</div>
  `;
  document.body.append(copy);

  const stamp = document.createElement("div");
  stamp.className = "ad-stamp";
  stamp.textContent = "有榜单";
  document.body.append(stamp);

  const pop = document.createElement("div");
  pop.className = "ad-pop";
  pop.textContent = "冲刺穿弹";
  document.body.append(pop);

  const url = document.createElement("div");
  url.className = "ad-url";
  url.innerHTML = "<b>netflight.bitdate.date</b><span>开网页就能玩，不用下载</span>";
  document.body.append(url);

  window.__adScene = ({ kicker, title, accent, subtitle, stampText, popText, showUrl }) => {
    copy.innerHTML = `
      <div class="ad-kicker">${kicker}</div>
      <div class="ad-title">${title}<br><strong>${accent}</strong></div>
      <div class="ad-subtitle">${subtitle}</div>
    `;
    stamp.textContent = stampText;
    pop.textContent = popText;
    url.style.opacity = showUrl ? "1" : ".08";
  };
});

await page.evaluate(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const down = code => window.dispatchEvent(new KeyboardEvent("keydown", { key: code, code, bubbles: true }));
  const up = code => window.dispatchEvent(new KeyboardEvent("keyup", { key: code, code, bubbles: true }));

  localStorage.setItem("nightflight-profile", JSON.stringify({
    playerId: "ad",
    name: "ad",
    clientId: "ad-client-0001",
    bestScore: 0,
    totalScore: 0,
    runs: 0,
    bosses: 0
  }));

  startGame();
  await sleep(500);
  player.upgrades.gun = 7;
  player.upgrades.engine = 5;
  player.upgrades.dash = 8;
  player.upgrades.protocol = 5;
  player.perks.bossDamage = 4;
  player.perks.iframe = 3;
  player.energy = 100;
  score = 88000;
  updateAllUi();

  let direction = "ArrowRight";
  down(direction);
  const moveTimer = setInterval(() => {
    up(direction);
    direction = direction === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
    down(direction);
  }, 680);
  const dashTimer = setInterval(() => {
    down("Shift");
    setTimeout(() => up("Shift"), 58);
  }, 385);
  const skillTimer = setInterval(() => {
    player.energy = 100;
    down("Space");
    setTimeout(() => up("Space"), 70);
  }, 4100);
  const bossTimer = setInterval(() => {
    if (!currentBoss) {
      queueBossStory();
      setTimeout(() => beginBossEncounter(), 220);
    }
  }, 6400);

  window.__stopAdControls = () => {
    clearInterval(moveTimer);
    clearInterval(dashTimer);
    clearInterval(skillTimer);
    clearInterval(bossTimer);
    up(direction);
    up("Shift");
    up("Space");
  };
});

const scenes = [
  [0, {
    kicker: "刷题人专属弹幕游戏",
    title: "这不是",
    accent: "普通飞机",
    subtitle: "它会把 OJ 压力测试打成 Boss 战",
    stampText: "有榜单",
    popText: "冲刺穿弹",
    showUrl: false
  }],
  [2600, {
    kicker: "手残也能爽",
    title: "按住 Shift",
    accent: "直接穿弹",
    subtitle: "擦弹、冲刺、攒能量，一套循环越打越快",
    stampText: "Dash Lv.8",
    popText: "无敌窗口",
    showUrl: false
  }],
  [5600, {
    kicker: "满能量开大",
    title: "判题模式",
    accent: "清屏爆发",
    subtitle: "一键清弹幕，火力变三路，Boss 血条猛掉",
    stampText: "清屏",
    popText: "开大了",
    showUrl: false
  }],
  [9000, {
    kicker: "打完直接看名次",
    title: "排行榜",
    accent: "冲进前十",
    subtitle: "用户名保存成绩，单局高分实时冲榜",
    stampText: "Top 10",
    popText: "冲榜时刻",
    showUrl: false
  }],
  [12400, {
    kicker: "不用下载",
    title: "网页打开",
    accent: "马上开局",
    subtitle: "netflight.bitdate.date",
    stampText: "开玩",
    popText: "现在就飞",
    showUrl: true
  }]
];

for (let i = 0; i < scenes.length; i++) {
  const [at, scene] = scenes[i];
  const wait = i === 0 ? at : at - scenes[i - 1][0];
  await page.waitForTimeout(wait);
  await page.evaluate(next => window.__adScene(next), scene);
}

await page.waitForTimeout(4200);
await page.evaluate(() => window.__stopAdControls?.());
await context.close();
await browser.close();

const videos = readdirSync(videoDir).filter(name => name.endsWith(".webm"));
if (!videos.length) throw new Error(`No recorded video found in ${videoDir}`);
const source = join(videoDir, videos[0]);
const dest = join(outputDir, "nightflight-marketing-vertical.webm");
copyFileSync(source, dest);
console.log(dest);

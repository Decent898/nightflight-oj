import { mkdtempSync, readdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const outputDir = resolve(root, "promo-output");
const videoDir = mkdtempSync(join(tmpdir(), "nightflight-promo-"));
const target = process.argv[2] || pathToFileURL(resolve(root, "index.html")).href;

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_PATH || undefined
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: videoDir,
    size: { width: 1280, height: 720 }
  }
});

const page = await context.newPage();
page.on("console", msg => console.log(`[page] ${msg.text()}`));
await page.route("**/api/leaderboard**", route => {
  const request = route.request();
  if (request.method() === "POST") {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ entries: [], rank: null })
    });
  }
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ entries: [] })
  });
});

await page.goto(target, { waitUntil: "load" });
await page.waitForSelector("#game");
await page.evaluate(() => {
  const style = document.createElement("style");
  style.textContent = `
    .promo-ribbon {
      position: fixed;
      inset: auto 42px 42px 42px;
      z-index: 9999;
      display: grid;
      gap: 10px;
      color: white;
      pointer-events: none;
      font-family: "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
      text-shadow: 0 3px 18px rgba(0, 0, 0, .68);
    }
    .promo-ribbon b {
      max-width: 760px;
      font-size: 44px;
      line-height: 1.08;
      letter-spacing: 0;
    }
    .promo-ribbon span {
      max-width: 680px;
      font-size: 18px;
      color: rgba(230, 246, 255, .92);
    }
    .promo-badge {
      position: fixed;
      right: 42px;
      top: 34px;
      z-index: 9999;
      padding: 10px 14px;
      border: 1px solid rgba(125, 245, 255, .32);
      border-radius: 8px;
      background: rgba(5, 12, 24, .52);
      color: #7df5ff;
      font: 700 16px/1.2 "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
      letter-spacing: 0;
      pointer-events: none;
    }
    .promo-flash {
      position: fixed;
      inset: 0;
      z-index: 9998;
      background: radial-gradient(circle at 50% 58%, rgba(77, 231, 255, .22), rgba(255, 99, 120, .08) 36%, transparent 68%);
      pointer-events: none;
      mix-blend-mode: screen;
      animation: promoPulse 1.4s ease-in-out infinite alternate;
    }
    @keyframes promoPulse {
      from { opacity: .4; }
      to { opacity: .9; }
    }
    .shell {
      max-width: 1280px !important;
      margin: 0 !important;
    }
    .side-panel {
      display: none !important;
    }
    .game-stage {
      min-height: 720px !important;
      border-radius: 0 !important;
    }
    canvas {
      border-radius: 0 !important;
    }
  `;
  document.head.append(style);

  const badge = document.createElement("div");
  badge.className = "promo-badge";
  badge.textContent = "netflight.bitdate.date";
  document.body.append(badge);

  const glow = document.createElement("div");
  glow.className = "promo-flash";
  document.body.append(glow);

  const ribbon = document.createElement("div");
  ribbon.className = "promo-ribbon";
  ribbon.innerHTML = "<b>良乡夜航</b><span>弹幕、冲刺、Boss 压力测试，一局把 Online Judge 打成夜航。</span>";
  document.body.append(ribbon);

  window.__promoSetCaption = (title, subtitle) => {
    ribbon.innerHTML = `<b>${title}</b><span>${subtitle}</span>`;
  };
});

await page.evaluate(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const down = code => window.dispatchEvent(new KeyboardEvent("keydown", { key: code, code, bubbles: true }));
  const up = code => window.dispatchEvent(new KeyboardEvent("keyup", { key: code, code, bubbles: true }));

  localStorage.setItem("nightflight-profile", JSON.stringify({
    playerId: "promo",
    name: "promo",
    clientId: "promo-client-0001",
    bestScore: 0,
    totalScore: 0,
    runs: 0,
    bosses: 0
  }));

  if (typeof startGame === "function") startGame();
  await sleep(500);

  if (window.player) {
    player.upgrades.gun = 6;
    player.upgrades.engine = 4;
    player.upgrades.dash = 8;
    player.upgrades.protocol = 4;
    player.perks.bossDamage = 3;
    player.perks.iframe = 2;
    player.energy = 100;
  }
  if (typeof updateAllUi === "function") updateAllUi();

  let direction = "ArrowRight";
  down(direction);
  const moveTimer = setInterval(() => {
    up(direction);
    direction = direction === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
    down(direction);
  }, 850);

  const dashTimer = setInterval(() => {
    down("Shift");
    setTimeout(() => up("Shift"), 60);
  }, 390);

  const skillTimer = setInterval(() => {
    if (window.player) player.energy = 100;
    down("Space");
    setTimeout(() => up("Space"), 80);
  }, 5200);

  const bossTimer = setInterval(() => {
    if (typeof queueBossStory === "function" && typeof beginBossEncounter === "function" && !window.currentBoss) {
      queueBossStory();
      setTimeout(() => beginBossEncounter(), 300);
    }
  }, 8500);

  window.__promoStopControls = () => {
    clearInterval(moveTimer);
    clearInterval(dashTimer);
    clearInterval(skillTimer);
    clearInterval(bossTimer);
    up(direction);
    up("Shift");
    up("Space");
  };
});

const captions = [
  [0, "良乡夜航", "弹幕、冲刺、Boss 压力测试，一局把 Online Judge 打成夜航。"],
  [5200, "Shift 穿弹", "Dash Lv.8 后，连续冲刺把危险弹幕变成能量来源。"],
  [10400, "判题模式启动", "满能量清屏、爆发输出、三路火力瞬间压上去。"],
  [16200, "Boss 压力测试", "每个 Boss 都有阶段弹幕，击破还能继续改造机体。"],
  [23200, "在线排行榜", "用户名保存成绩，单局高分实时冲榜，看看谁能进 Top 10。"],
  [30000, "现在开局", "netflight.bitdate.date"]
];

for (let i = 0; i < captions.length; i++) {
  const [at, title, subtitle] = captions[i];
  const wait = i === 0 ? at : at - captions[i - 1][0];
  await page.waitForTimeout(wait);
  await page.evaluate(([nextTitle, nextSubtitle]) => {
    window.__promoSetCaption?.(nextTitle, nextSubtitle);
  }, [title, subtitle]);
}

await page.waitForTimeout(5200);
await page.evaluate(() => window.__promoStopControls?.());
await context.close();
await browser.close();

const videos = readdirSync(videoDir).filter(name => name.endsWith(".webm"));
if (!videos.length) throw new Error(`No recorded video found in ${videoDir}`);
const source = join(videoDir, videos[0]);
const dest = join(outputDir, "nightflight-promo.webm");
copyFileSync(source, dest);
console.log(dest);

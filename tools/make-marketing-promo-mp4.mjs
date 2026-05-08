import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const target = process.argv[2] || pathToFileURL(resolve(root, "index.html")).href;
const out = resolve(root, "promo-output", "nightflight-marketing-vertical.mp4");

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_PATH || undefined,
  args: ["--autoplay-policy=no-user-gesture-required"]
});
const page = await browser.newPage({
  viewport: { width: 720, height: 1280 },
  deviceScaleFactor: 1
});

await page.route("**/api/leaderboard**", route => {
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      entries: [
        { playerId: "ACMaster", score: 986420, elapsed: 412, bosses: 6 },
        { playerId: "NightPilot", score: 821770, elapsed: 365, bosses: 5 },
        { playerId: "BITer", score: 734510, elapsed: 338, bosses: 5 },
        { playerId: "SampleHunter", score: 612240, elapsed: 291, bosses: 4 },
        { playerId: "NoWA", score: 588020, elapsed: 276, bosses: 4 }
      ],
      rank: 3
    })
  });
});

await page.goto(target, { waitUntil: "load" });
await page.waitForSelector("#game");

const payload = await page.evaluate(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const down = code => window.dispatchEvent(new KeyboardEvent("keydown", { key: code, code, bubbles: true }));
  const up = code => window.dispatchEvent(new KeyboardEvent("keyup", { key: code, code, bubbles: true }));

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
    .side-panel, .dialog {
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
    .title-lockup h1 { font-size: 26px !important; }
    .scorebox {
      min-width: 128px !important;
      background: rgba(4, 8, 18, .62) !important;
    }
    .scorebox strong { font-size: 34px !important; }
    .quick-stats { display: none !important; }
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
    .ad-title strong { color: #4de7ff; font-style: normal; }
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
    .ad-vignette, .ad-copy, .ad-stamp, .ad-pop, .ad-url {
      display: none !important;
    }
  `;
  document.head.append(style);

  const scenes = [
    [0, {
      kicker: "刷题人专属弹幕游戏",
      title: "这不是",
      accent: "普通飞机",
      subtitle: "它会把 OJ 压力测试打成 Boss 战",
      stampText: "有榜单",
      popText: "冲刺穿弹",
      showUrl: false,
      shot: "intro"
    }],
    [2600, {
      kicker: "手残也能爽",
      title: "按住 Shift",
      accent: "直接穿弹",
      subtitle: "擦弹、冲刺、攒能量，一套循环越打越快",
      stampText: "Dash Lv.8",
      popText: "无敌窗口",
      showUrl: false,
      shot: "dash"
    }],
    [5600, {
      kicker: "满能量开大",
      title: "判题模式",
      accent: "清屏爆发",
      subtitle: "一键清弹幕，火力变三路，Boss 血条猛掉",
      stampText: "清屏",
      popText: "开大了",
      showUrl: false,
      shot: "skill"
    }],
    [9000, {
      kicker: "打完直接看名次",
      title: "排行榜",
      accent: "冲进前十",
      subtitle: "用户名保存成绩，单局高分实时冲榜",
      stampText: "Top 10",
      popText: "冲榜时刻",
      showUrl: false,
      shot: "leaderboard"
    }],
    [12400, {
      kicker: "不用下载",
      title: "网页打开",
      accent: "马上开局",
      subtitle: "netflight.bitdate.date",
      stampText: "开玩",
      popText: "现在就飞",
      showUrl: true,
      shot: "cta"
    }]
  ];
  let currentScene = scenes[0][1];
  const sceneStart = performance.now();
  let currentSceneStart = sceneStart;

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
  await sleep(300);
  player.upgrades.gun = 7;
  player.upgrades.engine = 5;
  player.upgrades.dash = 8;
  player.upgrades.protocol = 5;
  player.perks.bossDamage = 4;
  player.perks.iframe = 3;
  player.energy = 100;
  player.x = W * 0.5;
  player.y = H * 0.76;
  score = 88000;
  nextMilestoneIndex = C.upgradeMilestones.length;
  updateAllUi();
  queueBossStory();
  setTimeout(() => beginBossEncounter(), 180);

  const pathStart = performance.now();
  pointer.active = true;
  let autopilotFrame = 0;
  function cinematicAutopilot() {
    if (state === "playing" && player) {
      const t = (performance.now() - pathStart) / 1000;
      pointer.active = true;
      pointer.x = clamp(W * 0.5 + Math.sin(t * 2.25) * W * 0.30 + Math.sin(t * 5.2) * W * 0.06, 40, W - 40);
      pointer.y = clamp(H * 0.74 + Math.cos(t * 1.72) * H * 0.11, 95, H - 48);
    }
    autopilotFrame = requestAnimationFrame(cinematicAutopilot);
  }
  cinematicAutopilot();
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
      setTimeout(() => beginBossEncounter(), 180);
    }
  }, 6400);
  const actionTimer = setInterval(() => {
    if (state !== "playing" || !player) return;
    if (currentScene.shot === "skill") {
      player.energy = 100;
      skillTime = Math.max(skillTime, 1.2);
      flash = Math.max(flash, 0.08);
    }
    if (currentScene.shot === "dash") {
      player.dashCooldown = 0;
      if (player.dash <= 0.02) triggerDash();
    }
    if ((currentScene.shot === "intro" || currentScene.shot === "skill") && !currentBoss && !pendingBossTemplate) {
      queueBossStory();
      setTimeout(() => beginBossEncounter(), 160);
    }
  }, 180);

  // Warm up before recording so the first visible frame already has movement.
  await sleep(1200);
  currentScene = scenes[0][1];
  currentSceneStart = performance.now();

  const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E")
    ? "video/mp4;codecs=avc1.42E01E"
    : "video/mp4";
  await document.fonts?.ready;
  const gameCanvas = document.getElementById("game");
  const recordCanvas = document.createElement("canvas");
  recordCanvas.width = 720;
  recordCanvas.height = 1280;
  recordCanvas.style.cssText = "position:fixed;inset:0;z-index:2147483647;width:720px;height:1280px";
  document.body.append(recordCanvas);
  const recordCtx = recordCanvas.getContext("2d", { alpha: false });

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function drawTextCenter(text, x, y, font, color, shadow = true) {
    recordCtx.save();
    recordCtx.font = font;
    recordCtx.textAlign = "center";
    recordCtx.textBaseline = "middle";
    if (shadow) {
      recordCtx.shadowColor = "rgba(0,0,0,.86)";
      recordCtx.shadowBlur = 22;
      recordCtx.shadowOffsetY = 5;
    }
    recordCtx.fillStyle = color;
    recordCtx.fillText(text, x, y);
    recordCtx.restore();
  }

  function ease(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function shotFor(scene, t) {
    const pulse = Math.sin(t * 2.1) * 0.02;
    if (scene.shot === "dash") return { sx: 80, sy: 560, sw: 560, sh: 560, zoom: 1.08 + pulse };
    if (scene.shot === "skill") return { sx: 110, sy: 250, sw: 500, sh: 650, zoom: 1.04 + pulse };
    if (scene.shot === "leaderboard") return { sx: 0, sy: 0, sw: 720, sh: 1280, zoom: 1 };
    if (scene.shot === "cta") return { sx: 40, sy: 360, sw: 640, sh: 720, zoom: 1.02 + pulse };
    return { sx: 0, sy: 0, sw: 720, sh: 1280, zoom: 1 };
  }

  function drawGameShot(scene, t, transition) {
    if (scene.shot === "leaderboard") {
      recordCtx.drawImage(gameCanvas, 0, 0, 720, 1280);
      return;
    }
    const shot = shotFor(scene, t);
    const z = shot.zoom;
    const sw = shot.sw / z;
    const sh = shot.sh / z;
    const sx = shot.sx + (shot.sw - sw) / 2;
    const sy = shot.sy + (shot.sh - sh) / 2;
    const destY = scene.shot === "intro" ? 0 : 118;
    const destH = scene.shot === "intro" ? 1280 : 850;
    recordCtx.drawImage(gameCanvas, sx, sy, sw, sh, 0, destY, 720, destH);
    if (transition > 0) {
      recordCtx.fillStyle = `rgba(77,231,255,${transition * 0.12})`;
      recordCtx.fillRect(0, destY, 720, destH);
    }
  }

  function drawBottomCaption(scene, y = 990) {
    recordCtx.save();
    roundRect(recordCtx, 60, y, 600, 70, 12);
    recordCtx.fillStyle = "rgba(5,10,22,.78)";
    recordCtx.fill();
    recordCtx.restore();
    drawTextCenter(scene.subtitle, 360, y + 35, "900 26px Microsoft YaHei, sans-serif", "#eff8ff");
  }

  function drawLeaderboardFeature(t) {
    const panelX = 52;
    const panelY = 278;
    const panelW = 616;
    const panelH = 594;
    recordCtx.save();
    roundRect(recordCtx, panelX, panelY, panelW, panelH, 22);
    recordCtx.fillStyle = "rgba(7,14,28,.88)";
    recordCtx.fill();
    recordCtx.strokeStyle = "rgba(77,231,255,.42)";
    recordCtx.lineWidth = 2;
    recordCtx.stroke();
    recordCtx.restore();

    drawTextCenter("实时 Top 10", 360, 332, "1000 42px Microsoft YaHei, sans-serif", "#7df5ff");
    drawTextCenter("用户名保存成绩，下一次回来继续冲榜", 360, 374, "800 20px Microsoft YaHei, sans-serif", "rgba(238,245,255,.82)");

    const rows = [
      ["#1", "ACMaster", "986,420", "Boss 6"],
      ["#2", "NightPilot", "821,770", "Boss 5"],
      ["#3", "你", "734,510", "Boss 5"],
      ["#4", "SampleHunter", "612,240", "Boss 4"],
      ["#5", "NoWA", "588,020", "Boss 4"]
    ];
    rows.forEach((row, index) => {
      const y = 424 + index * 76;
      const highlight = index === 2 || (Math.floor(t * 2) % 2 === 0 && index === 0);
      recordCtx.save();
      roundRect(recordCtx, 86, y, 548, 56, 12);
      recordCtx.fillStyle = highlight ? "rgba(255,209,102,.20)" : "rgba(255,255,255,.055)";
      recordCtx.fill();
      recordCtx.strokeStyle = highlight ? "rgba(255,209,102,.56)" : "rgba(255,255,255,.08)";
      recordCtx.lineWidth = 1.5;
      recordCtx.stroke();
      recordCtx.restore();
      recordCtx.save();
      recordCtx.textBaseline = "middle";
      recordCtx.font = "1000 22px Microsoft YaHei, sans-serif";
      recordCtx.fillStyle = highlight ? "#ffd166" : "#9aadc2";
      recordCtx.fillText(row[0], 110, y + 28);
      recordCtx.fillStyle = "#eef5ff";
      recordCtx.fillText(row[1], 170, y + 28);
      recordCtx.textAlign = "right";
      recordCtx.fillStyle = "#4de7ff";
      recordCtx.fillText(row[2], 520, y + 28);
      recordCtx.font = "800 16px Microsoft YaHei, sans-serif";
      recordCtx.fillStyle = "rgba(238,245,255,.68)";
      recordCtx.fillText(row[3], 614, y + 28);
      recordCtx.restore();
    });

    recordCtx.save();
    recordCtx.globalAlpha = 0.96;
    roundRect(recordCtx, 132, 820, 456, 54, 999);
    recordCtx.fillStyle = "rgba(121,255,157,.16)";
    recordCtx.fill();
    recordCtx.strokeStyle = "rgba(121,255,157,.42)";
    recordCtx.stroke();
    recordCtx.restore();
    drawTextCenter("本局结束自动提交榜单", 360, 847, "900 22px Microsoft YaHei, sans-serif", "#79ff9d");
  }

  let raf = 0;
  function composite() {
    const now = performance.now();
    const localT = (now - currentSceneStart) / 1000;
    const transition = 1 - ease(Math.min(1, localT / 0.45));
    recordCtx.fillStyle = "#050914";
    recordCtx.fillRect(0, 0, 720, 1280);
    drawGameShot(currentScene, localT, transition);

    const topGrad = recordCtx.createLinearGradient(0, 0, 0, 390);
    topGrad.addColorStop(0, currentScene.shot === "leaderboard" ? "rgba(3,7,14,.92)" : "rgba(3,7,14,.82)");
    topGrad.addColorStop(1, "rgba(3,7,14,0)");
    recordCtx.fillStyle = topGrad;
    recordCtx.fillRect(0, 0, 720, 390);
    const bottomGrad = recordCtx.createLinearGradient(0, 760, 0, 1280);
    bottomGrad.addColorStop(0, "rgba(3,7,14,0)");
    bottomGrad.addColorStop(1, "rgba(3,7,14,.86)");
    recordCtx.fillStyle = bottomGrad;
    recordCtx.fillRect(0, 760, 720, 520);

    if (currentScene.shot === "leaderboard") drawLeaderboardFeature(localT);

    recordCtx.save();
    roundRect(recordCtx, 250, 174, 220, 46, 23);
    recordCtx.fillStyle = "rgba(12,9,3,.66)";
    recordCtx.fill();
    recordCtx.strokeStyle = "rgba(255,209,102,.78)";
    recordCtx.lineWidth = 2;
    recordCtx.stroke();
    recordCtx.restore();
    drawTextCenter(currentScene.kicker, 360, 197, "900 20px Microsoft YaHei, sans-serif", "#ffd166");

    if (currentScene.shot === "intro") {
      recordCtx.save();
      roundRect(recordCtx, 112, 228, 496, 152, 18);
      recordCtx.fillStyle = "rgba(3, 7, 14, .44)";
      recordCtx.fill();
      recordCtx.restore();
      drawTextCenter(currentScene.title, 360, 280, "1000 68px Microsoft YaHei, sans-serif", "#ffffff");
      drawTextCenter(currentScene.accent, 360, 350, "1000 72px Microsoft YaHei, sans-serif", "#4de7ff");
      drawBottomCaption(currentScene, 392);
    } else if (currentScene.shot !== "leaderboard") {
      drawTextCenter(currentScene.title, 360, 204, "1000 52px Microsoft YaHei, sans-serif", "#ffffff");
      drawTextCenter(currentScene.accent, 360, 262, "1000 58px Microsoft YaHei, sans-serif", "#4de7ff");
      drawBottomCaption(currentScene);
    } else {
      drawTextCenter(currentScene.title, 360, 172, "1000 52px Microsoft YaHei, sans-serif", "#ffffff");
      drawTextCenter(currentScene.accent, 360, 230, "1000 58px Microsoft YaHei, sans-serif", "#4de7ff");
    }

    recordCtx.save();
    recordCtx.translate(626, 60);
    recordCtx.rotate(4 * Math.PI / 180);
    roundRect(recordCtx, -68, -22, 136, 48, 10);
    recordCtx.fillStyle = "rgba(3,12,8,.58)";
    recordCtx.fill();
    recordCtx.strokeStyle = "rgba(121,255,157,.78)";
    recordCtx.lineWidth = 2;
    recordCtx.stroke();
    recordCtx.restore();
    drawTextCenter(currentScene.stampText, 626, 60, "1000 22px Microsoft YaHei, sans-serif", "#79ff9d");

    recordCtx.save();
    recordCtx.translate(118, 862);
    recordCtx.rotate(-5 * Math.PI / 180);
    roundRect(recordCtx, -82, -24, 164, 52, 9);
    recordCtx.fillStyle = "#ffd166";
    recordCtx.fill();
    recordCtx.restore();
    drawTextCenter(currentScene.popText, 118, 862, "1000 25px Microsoft YaHei, sans-serif", "#07111b", false);

    recordCtx.save();
    recordCtx.globalAlpha = currentScene.showUrl ? 1 : .1;
    roundRect(recordCtx, 154, 1131, 412, 73, 12);
    const urlGrad = recordCtx.createLinearGradient(154, 1131, 154, 1204);
    urlGrad.addColorStop(0, "#7df5ff");
    urlGrad.addColorStop(1, "#36c6ff");
    recordCtx.fillStyle = urlGrad;
    recordCtx.fill();
    recordCtx.restore();
    recordCtx.save();
    recordCtx.globalAlpha = currentScene.showUrl ? 1 : .1;
    drawTextCenter("netflight.bitdate.date", 360, 1168, "1000 34px system-ui, sans-serif", "#06131c", false);
    drawTextCenter("开网页就能玩，不用下载", 360, 1232, "800 20px Microsoft YaHei, sans-serif", "rgba(238,245,255,.9)");
    recordCtx.restore();

    raf = requestAnimationFrame(composite);
  }
  composite();

  const stream = recordCanvas.captureStream(60);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 7_000_000
  });
  const chunks = [];
  recorder.ondataavailable = event => {
    if (event.data?.size) chunks.push(event.data);
  };
  const done = new Promise(resolve => {
    recorder.onstop = resolve;
  });
  recorder.start(250);

  for (let i = 1; i < scenes.length; i++) {
    await sleep(scenes[i][0] - scenes[i - 1][0]);
    currentScene = scenes[i][1];
    currentSceneStart = performance.now();
  }
  await sleep(4200);
  recorder.stop();
  await done;
  stream.getTracks().forEach(track => track.stop());
  cancelAnimationFrame(raf);

  clearInterval(dashTimer);
  clearInterval(skillTimer);
  clearInterval(bossTimer);
  clearInterval(actionTimer);
  cancelAnimationFrame(autopilotFrame);
  pointer.active = false;
  up("Shift");
  up("Space");

  const blob = new Blob(chunks, { type: mimeType });
  const buffer = await blob.arrayBuffer();
  const bytes = Array.from(new Uint8Array(buffer));
  return { mimeType, bytes };
});

writeFileSync(out, Buffer.from(payload.bytes));
await browser.close();
console.log(`${out}\n${payload.mimeType}`);

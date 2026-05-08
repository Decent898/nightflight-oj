window.Leaderboard = (() => {
  let status = document.getElementById("leaderboardStatus");
  let list = document.getElementById("leaderboardList");
  const endpoint = "/api/leaderboard";

  mountUsernameField();
  mount();

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function render(entries) {
    if (!list) return;
    list.replaceChildren();
    entries.forEach((entry, index) => {
      const item = document.createElement("li");
      const left = document.createElement("span");
      const rank = document.createElement("b");
      const name = document.createElement("em");
      const score = document.createElement("strong");
      const meta = document.createElement("small");

      rank.textContent = `#${index + 1}`;
      name.textContent = entry.playerId || entry.name || "BITer";
      score.textContent = Math.floor(entry.score || 0).toLocaleString("zh-CN");
      meta.textContent = `${formatTime(entry.elapsed || 0)} / Boss ${entry.bosses || 0}`;

      left.append(rank, name);
      item.append(left, score, meta);
      list.append(item);
    });
  }

  async function load() {
    try {
      setStatus("\u6b63\u5728\u8bfb\u53d6\u6392\u884c\u699c...");
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = await response.json();
      render(data.entries || []);
      setStatus((data.entries || []).length ? "\u5b9e\u65f6 Top 10" : "\u6682\u65e0\u4e0a\u699c\u8bb0\u5f55");
    } catch {
      setStatus("\u6392\u884c\u699c\u6682\u65f6\u4e0d\u53ef\u7528");
    }
  }

  async function submitRun(profile, run) {
    try {
      setStatus("\u6b63\u5728\u4e0a\u4f20\u6210\u7ee9...");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: profile.clientId,
          playerId: profile.playerId || profile.name,
          name: profile.playerId || profile.name,
          score: Math.floor(run.score || 0),
          elapsed: Math.floor(run.elapsed || 0),
          bosses: Math.floor(run.bosses || 0),
          perfectDash: Math.floor(run.perfectDash || 0),
          totalScore: Math.floor(profile.totalScore || 0),
          runs: Math.floor(profile.runs || 0),
          totalBosses: Math.floor(profile.bosses || 0)
        })
      });
      if (!response.ok) throw new Error("submit failed");
      const data = await response.json();
      render(data.entries || []);
      setStatus(data.rank ? `\u5df2\u4e0a\u699c\uff0c\u5f53\u524d #${data.rank}` : "\u6210\u7ee9\u5df2\u4e0a\u4f20");
    } catch {
      setStatus("\u6210\u7ee9\u672a\u4e0a\u4f20\uff0c\u7a0d\u540e\u518d\u8bd5");
    }
  }

  async function loadProfile(playerId) {
    const id = String(playerId || "").trim();
    if (!id) return null;
    try {
      setStatus("\u6b63\u5728\u540c\u6b65 ID \u6863\u6848...");
      const response = await fetch(`${endpoint}?playerId=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("profile load failed");
      const data = await response.json();
      render(data.entries || []);
      setStatus(data.profile ? "\u5df2\u540c\u6b65 ID \u6863\u6848" : "\u8fd9\u662f\u65b0 ID");
      return data.profile || null;
    } catch {
      setStatus("ID \u6863\u6848\u6682\u65f6\u65e0\u6cd5\u540c\u6b65");
      return null;
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function mount() {
    if (status && list) return;
    const sidePanel = document.querySelector(".side-panel");
    const anchor = document.getElementById("totalScore")?.closest(".panel-row");
    if (!sidePanel || !anchor) return;

    const heading = document.createElement("h2");
    heading.textContent = "\u5728\u7ebf\u6392\u884c\u699c";
    status = document.createElement("div");
    status.id = "leaderboardStatus";
    status.className = "leaderboard-status";
    status.textContent = "\u52a0\u8f7d\u4e2d";
    list = document.createElement("ol");
    list.id = "leaderboardList";
    list.className = "leaderboard-list";
    anchor.after(heading, status, list);
  }

  function mountUsernameField() {
    const input = document.getElementById("pilotName");
    const label = input?.closest(".field")?.querySelector("span");
    if (!input || !label) return;
    label.textContent = "\u7528\u6237\u540d";
    input.maxLength = 32;
    input.placeholder = "your-name";
  }

  load();
  return { load, loadProfile, submitRun };
})();

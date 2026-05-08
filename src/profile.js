window.ProfileStore = (() => {
  const key = "liangxiang-night-flight-profile-v3";
  const fallback = {
    clientId: "",
    playerId: "",
    name: "BITer",
    bestScore: 0,
    totalScore: 0,
    runs: 0,
    bosses: 0
  };
  const profilesKey = `${key}-profiles`;

  function load() {
    try {
      const profile = { ...fallback, ...JSON.parse(localStorage.getItem(key) || "{}") };
      if (!profile.clientId) {
        profile.clientId = createClientId();
        save(profile);
      }
      return profile;
    } catch {
      const profile = { ...fallback, clientId: createClientId() };
      save(profile);
      return profile;
    }
  }

  function save(profile) {
    localStorage.setItem(key, JSON.stringify(profile));
    const playerId = normalizePlayerId(profile.playerId);
    if (playerId) {
      const profiles = loadProfiles();
      profiles[playerId.toLowerCase()] = { ...profile, playerId, name: playerId };
      localStorage.setItem(profilesKey, JSON.stringify(profiles));
    }
  }

  function commitRun(profile, run) {
    const next = {
      ...profile,
      playerId: run.playerId || profile.playerId || "",
      name: run.playerId || run.name || profile.playerId || profile.name || fallback.name,
      bestScore: Math.max(profile.bestScore || 0, run.score || 0),
      totalScore: (profile.totalScore || 0) + Math.floor(run.score || 0),
      runs: (profile.runs || 0) + 1,
      bosses: (profile.bosses || 0) + (run.bosses || 0)
    };
    save(next);
    return next;
  }

  function rankFor(totalScore) {
    const ranks = window.GameContent.ranks;
    let current = ranks[0];
    let next = ranks[1] || null;
    for (let i = 0; i < ranks.length; i++) {
      if (totalScore >= ranks[i].min) {
        current = ranks[i];
        next = ranks[i + 1] || null;
      }
    }
    const progress = next ? (totalScore - current.min) / (next.min - current.min) : 1;
    return { current, next, progress: Math.max(0, Math.min(1, progress)) };
  }

  function loadById(playerId, current = {}) {
    const id = normalizePlayerId(playerId);
    if (!id) return { ...fallback, ...current, playerId: "" };
    const cached = loadProfiles()[id.toLowerCase()];
    return cached
      ? { ...fallback, ...cached, playerId: id, name: id }
      : { ...fallback, clientId: current.clientId || createClientId(), name: id, playerId: id };
  }

  function mergeRemote(profile, remote) {
    if (!remote) return profile;
    return {
      ...profile,
      playerId: normalizePlayerId(remote.playerId || profile.playerId),
      name: normalizePlayerId(remote.playerId || profile.playerId) || remote.name || profile.name || fallback.name,
      bestScore: Math.max(profile.bestScore || 0, remote.bestScore || 0),
      totalScore: Math.max(profile.totalScore || 0, remote.totalScore || 0),
      runs: Math.max(profile.runs || 0, remote.runs || 0),
      bosses: Math.max(profile.bosses || 0, remote.bosses || 0)
    };
  }

  function normalizePlayerId(value) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .slice(0, 32);
  }

  function loadProfiles() {
    try {
      return JSON.parse(localStorage.getItem(profilesKey) || "{}");
    } catch {
      return {};
    }
  }

  function createClientId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replace(/-/g, "");
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  }

  return { load, save, commitRun, rankFor, loadById, mergeRemote, normalizePlayerId };
})();

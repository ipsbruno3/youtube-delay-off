/*
 * inject.js — executa no MUNDO PRINCIPAL da página (world: "MAIN").
 *
 * Só aqui temos acesso aos métodos do player do YouTube (#movie_player):
 *   getProgressState, getCurrentTime, getDuration, seekTo,
 *   setPlaybackRate, setPlaybackQuality, setPlaybackQualityRange,
 *   getAvailableQualityLevels, getPlaybackQuality...
 *
 * IMPORTANTE (atraso): em lives com DVR o `<video>.currentTime` e o
 * `<video>.seekable.end()` ficam em referenciais diferentes, o que faz o
 * atraso aparecer sempre ~do tamanho da janela de DVR (ex.: 59 min). Por isso
 * usamos `player.getProgressState()` (mesma fonte que o YouTube usa para o
 * indicador "AO VIVO"), cujos `current` e `seekableEnd` estão no MESMO
 * referencial -> atraso real correto.
 *
 * Protocolo (window.postMessage):
 *   content -> page : { source: "ydo-content", action, value }
 *   page -> content : { source: "ydo-page", type, ... }
 */
(function () {
  "use strict";

  let lockedQuality = null; // qualidade fixada (ex.: "hd720") ou null

  function getPlayer() {
    return document.getElementById("movie_player");
  }
  function getVideo() {
    return document.querySelector("#movie_player video");
  }
  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  /* ---------------- estado da live (atraso) ---------------- */

  function computeLiveInfo() {
    const player = getPlayer();
    const video = getVideo();
    if (!player || !video) return { isLive: false, hasVideo: !!video };

    const badge = player.querySelector(".ytp-live-badge");
    const isLive =
      !!badge ||
      (player.classList && player.classList.contains("ytp-live"));
    // vídeo normal (não é stream): extensão fica inativa
    if (!isLive) return { isLive: false, hasVideo: true };

    let current = null;
    let seekableEnd = null;
    let stateLiveHead = null; // isAtLiveHead direto do player, se existir

    // 1) Fonte autoritativa: getProgressState() (referencial consistente)
    try {
      if (typeof player.getProgressState === "function") {
        const st = player.getProgressState();
        if (st) {
          current = num(st.current);
          seekableEnd = num(st.seekableEnd);
          if (typeof st.isAtLiveHead === "boolean")
            stateLiveHead = st.isAtLiveHead;
        }
      }
    } catch (e) {}

    // 2) Fallback: API do player
    if (current == null) {
      try {
        current = num(player.getCurrentTime());
      } catch (e) {}
    }
    if (seekableEnd == null) {
      try {
        seekableEnd = num(player.getDuration());
      } catch (e) {}
    }

    // 3) Último recurso: elemento <video> (pode ser impreciso em DVR)
    if (current == null) current = video.currentTime || 0;
    if (seekableEnd == null) {
      if (video.seekable && video.seekable.length)
        seekableEnd = video.seekable.end(video.seekable.length - 1);
      else seekableEnd = current;
    }

    const delay = Math.max(0, seekableEnd - current);
    let atLiveHead;
    if (stateLiveHead != null) atLiveHead = stateLiveHead;
    else
      atLiveHead =
        (badge &&
          badge.classList.contains("ytp-live-badge-is-livehead")) ||
        delay <= 5;

    // Buffer e latência reais — mesma fonte do painel "Stats for Nerds".
    // Campos: buffer_health_seconds ("5.95 s") e live_latency_secs ("10.83s").
    let buffer = null;
    let latency = null;
    try {
      if (typeof player.getStatsForNerds === "function") {
        const sn = player.getStatsForNerds();
        if (sn) {
          const b = parseFloat(sn.buffer_health_seconds);
          const l = parseFloat(sn.live_latency_secs);
          if (isFinite(b)) buffer = b;
          if (isFinite(l)) latency = l;
        }
      }
    } catch (e) {}

    const info = {
      isLive: true,
      atLiveHead,
      delay,
      liveHead: seekableEnd,
      current,
      buffer, // segundos de buffer à frente (buffer_health)
      latency, // latência ao vivo (live_latency_secs)
      rate: video.playbackRate || 1,
    };

    if (window.__ydoDebug) {
      console.debug(
        "[YDO] atraso=%ss  buffer=%ss  latency=%ss  atLiveHead=%s",
        Math.round(delay),
        buffer == null ? "?" : buffer.toFixed(1),
        latency == null ? "?" : latency.toFixed(1),
        atLiveHead
      );
    }
    return info;
  }

  function pushLiveInfo() {
    const info = computeLiveInfo();
    window.postMessage({ source: "ydo-page", type: "liveinfo", info }, "*");
  }

  /* ---------------- qualidade / velocidade ---------------- */

  function applyQuality(q) {
    const p = getPlayer();
    if (!p || typeof p.setPlaybackQualityRange !== "function") return false;
    try {
      const avail =
        typeof p.getAvailableQualityLevels === "function"
          ? p.getAvailableQualityLevels()
          : [];
      if (avail.length && !avail.includes(q)) return false;
      p.setPlaybackQualityRange(q, q);
      if (typeof p.setPlaybackQuality === "function") p.setPlaybackQuality(q);
      return true;
    } catch (e) {
      return false;
    }
  }

  function setRate(rate) {
    const p = getPlayer();
    try {
      if (p && typeof p.setPlaybackRate === "function") p.setPlaybackRate(rate);
    } catch (e) {}
    const v = getVideo();
    if (v) {
      try {
        v.playbackRate = rate;
      } catch (e) {}
    }
  }

  function goLive() {
    const p = getPlayer();
    try {
      if (p && typeof p.getProgressState === "function") {
        const st = p.getProgressState();
        if (st && num(st.seekableEnd) != null && typeof p.seekTo === "function")
          p.seekTo(st.seekableEnd, true);
      }
    } catch (e) {}
    const badge = p && p.querySelector(".ytp-live-badge");
    if (badge && !badge.classList.contains("ytp-live-badge-is-livehead")) {
      try {
        badge.click();
      } catch (e) {}
    }
  }

  function reportQualities() {
    const p = getPlayer();
    let avail = [];
    let cur = null;
    if (p) {
      try {
        avail = p.getAvailableQualityLevels ? p.getAvailableQualityLevels() : [];
        cur = p.getPlaybackQuality ? p.getPlaybackQuality() : null;
      } catch (e) {}
    }
    window.postMessage({ source: "ydo-page", type: "qualities", avail, cur }, "*");
  }

  /* ---------------- mensagens do content ---------------- */

  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.source !== "ydo-content") return;

    switch (d.action) {
      case "setRate":
        setRate(d.value);
        break;
      case "goLive":
        goLive();
        break;
      case "lockQuality":
        lockedQuality = d.value;
        applyQuality(d.value);
        break;
      case "unlockQuality":
        lockedQuality = null;
        break;
      case "getQualities":
        reportQualities();
        break;
      case "pushNow":
        pushLiveInfo();
        break;
    }
  });

  /* ---------------- loops ---------------- */

  // Envia o estado da live continuamente para o content desenhar a UI.
  setInterval(pushLiveInfo, 400);

  // Mantém a qualidade fixada caso o YouTube tente voltar ao automático.
  let hooked = false;
  setInterval(function guard() {
    const p = getPlayer();
    if (p && !hooked && typeof p.addEventListener === "function") {
      try {
        p.addEventListener("onPlaybackQualityChange", function () {
          if (!lockedQuality) return;
          const cur = p.getPlaybackQuality ? p.getPlaybackQuality() : null;
          if (cur !== lockedQuality) applyQuality(lockedQuality);
        });
        hooked = true;
      } catch (e) {}
    }
    if (lockedQuality && p && p.getPlaybackQuality) {
      try {
        if (p.getPlaybackQuality() !== lockedQuality) applyQuality(lockedQuality);
      } catch (e) {}
    }
  }, 1500);
})();

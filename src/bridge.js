/*
 * bridge.js — ponte entre o content script e o resto.
 *
 *  - Fala com o inject.js (mundo MAIN) por window.postMessage:
 *      velocidade, qualidade, "ir ao vivo" e recebimento do estado da live.
 *  - Avisa o service worker (background.js) para acender o ícone da barra.
 */
(function () {
  "use strict";
  const YDO = (window.__ydo__ = window.__ydo__ || {});

  /* ---------- comandos para o inject.js (mundo MAIN) ---------- */

  YDO.pageCmd = function (action, value) {
    window.postMessage({ source: "ydo-content", action, value }, "*");
  };

  YDO.setRate = function (rate) {
    YDO.pageCmd("setRate", rate);
    const v = YDO.$video();
    if (v) {
      try {
        v.playbackRate = rate;
      } catch (e) {}
    }
  };

  // Trava a qualidade SOMENTE em live; em vídeo normal deixa em auto.
  // Só envia comando quando o alvo muda (evita spam e flicker).
  YDO.syncQuality = function (isLive) {
    const s = YDO.settings;
    const want =
      isLive && s.forceQuality && s.quality && s.quality !== "auto"
        ? s.quality
        : null;
    if (want === YDO.state.qualityLocked) return;
    YDO.state.qualityLocked = want;
    if (want) YDO.pageCmd("lockQuality", want);
    else YDO.pageCmd("unlockQuality");
  };

  /* ---------- recebe o estado da live do inject.js ---------- */

  window.addEventListener("message", function (ev) {
    if (ev.source !== window) return;
    const d = ev.data;
    if (!d || d.source !== "ydo-page") return;
    if (d.type === "liveinfo" && d.info) YDO.state.lastInfo = d.info;
  });

  // Estado atual da live, aplicando o limiar configurável de "AO VIVO".
  YDO.getLiveInfo = function () {
    const info = YDO.state.lastInfo;
    if (!info || !info.isLive)
      return { isLive: false, hasVideo: !!(info && info.hasVideo) };
    const atLiveHead = info.atLiveHead || info.delay <= YDO.threshold();
    return Object.assign({}, info, { atLiveHead });
  };

  /* ---------- ícone na barra (via service worker) ---------- */

  YDO.reportBadge = function (state) {
    if (state === YDO.state.lastBadgeState) return;
    YDO.state.lastBadgeState = state;
    try {
      chrome.runtime.sendMessage({ type: "ydo-status", state });
    } catch (e) {}
  };
})();

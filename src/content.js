/*
 * content.js — orquestrador do content script (mundo isolado).
 *
 * Junta os módulos (core/bridge/catchup/ui): roda o loop principal, decide
 * quando acelerar, responde ao popup e carrega/observa as configurações.
 * Deve ser o ÚLTIMO arquivo carregado no manifest.
 */
(function () {
  "use strict";
  const YDO = (window.__ydo__ = window.__ydo__ || {});

  /* ---------- loop principal ---------- */

  function tick() {
    const info = YDO.getLiveInfo();
    const st = YDO.state;
    const s = YDO.settings;

    // troca de vídeo (navegação SPA) -> zera a recuperação
    const video = YDO.$video();
    const src = video ? video.currentSrc || video.src : null;
    if (src && src !== st.lastVideoSrc) {
      st.lastVideoSrc = src;
      YDO.stopCatchUp();
    }

    const timer = YDO.ensureTimer();
    const overlay = YDO.ensureOverlay();

    // Não é live (vídeo normal ou nenhum vídeo): extensão fica inativa.
    if (!info.isLive) {
      if (timer) timer.style.display = "none";
      if (overlay) overlay.style.display = "none";
      YDO.releaseRate(); // volta a 1x se NÓS tínhamos acelerado
      YDO.syncQuality(false); // não força qualidade -> volta ao auto
      YDO.reportBadge(info.hasVideo ? "inactive" : "none");
      return;
    }

    // É live: aplica a preferência de qualidade (só aqui).
    YDO.syncQuality(true);

    // (1) recuperação por ATRASO — atrás do live head -> 2x. O limiar efetivo
    // já está embutido em atLiveHead (mais baixo com "Reduzir latência").
    if (s.autoSync && !info.atLiveHead && !st.catchUp) YDO.startCatchUp("auto");
    if (st.catchUp && info.atLiveHead) YDO.stopCatchUp();
    if (st.catchUp && st.catchUpReason === "auto" && !s.autoSync)
      YDO.stopCatchUp();

    // (2) "buffer mode" — só no Reduzir latência e quando NÃO está recuperando
    // atraso: mesmo AO VIVO, drena buffer alto a 1.3x (histerese 10s/7s).
    if (s.lowLatency && info.buffer != null && !st.catchUp) {
      if (info.buffer > YDO.BUFFER_HIGH) st.bufferTrim = true;
      else if (info.buffer < YDO.BUFFER_LOW) st.bufferTrim = false;
    } else {
      st.bufferTrim = false;
    }

    // aplica a velocidade resultante (reassere, pois o YouTube reseta p/ 1x)
    YDO.applyRate();

    YDO.renderTimer(timer, info);
    YDO.renderOverlay(overlay, info);

    // estado para o ícone da barra
    if (info.atLiveHead) YDO.reportBadge("live");
    else if (st.catchUp) YDO.reportBadge("catching");
    else YDO.reportBadge("delayed");
  }

  /* ---------- mensagens do popup ---------- */

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === "ydo-get-status") {
      const info = YDO.getLiveInfo();
      sendResponse({
        info,
        catchUp: YDO.state.catchUp,
        catchUpReason: YDO.state.catchUpReason,
        bufferTrim: YDO.state.bufferTrim,
        settings: YDO.settings,
        eta:
          info.isLive && !info.atLiveHead
            ? YDO.eta(info.delay, YDO.settings.catchUpRate)
            : 0,
      });
      return true;
    }
    if (msg.type === "ydo-sync-now") {
      YDO.startCatchUp("manual");
      YDO.applyRate();
      sendResponse({ ok: true });
    }
    if (msg.type === "ydo-stop-sync") {
      YDO.stopCatchUp();
      YDO.applyRate();
      sendResponse({ ok: true });
    }
    if (msg.type === "ydo-go-live") {
      YDO.goLive();
      sendResponse({ ok: true });
    }
    return true;
  });

  /* ---------- configurações ---------- */

  function loadSettings(cb) {
    try {
      chrome.storage.sync.get(YDO.DEFAULTS, (data) => {
        Object.assign(YDO.settings, YDO.DEFAULTS, data);
        cb && cb();
      });
    } catch (e) {
      cb && cb();
    }
  }

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      for (const k in changes) YDO.settings[k] = changes[k].newValue;
      // a qualidade é reavaliada no próximo tick (YDO.syncQuality)
      if (!YDO.settings.autoSync && YDO.state.catchUpReason === "auto")
        YDO.stopCatchUp();
    });
  }

  /* ---------- boot ---------- */

  loadSettings(() => {
    tick(); // o tick cuida de aplicar a qualidade conforme o status de live
    setInterval(tick, 500);
  });
})();

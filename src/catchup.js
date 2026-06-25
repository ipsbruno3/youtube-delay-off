/*
 * catchup.js — controle de velocidade.
 *
 * Modos (prioridade de cima p/ baixo):
 *   - catch-up por ATRASO: está atrás do live head -> acelera (catchUpRate, 2x);
 *   - buffer trim ("buffer mode"): no Reduzir latência, mesmo AO VIVO, se o
 *     buffer estiver alto -> acelera suave (BUFFER_TRIM_RATE, 1.3x);
 *   - caso contrário -> 1x.
 *
 * As funções só ligam/desligam flags; a velocidade real é aplicada por
 * applyRate() (que também "reassere", pois o YouTube pode resetar p/ 1x).
 */
(function () {
  "use strict";
  const YDO = (window.__ydo__ = window.__ydo__ || {});

  YDO.startCatchUp = function (reason) {
    const st = YDO.state;
    st.catchUp = true;
    st.catchUpReason = reason; // "auto" | "manual"
  };

  YDO.stopCatchUp = function () {
    const st = YDO.state;
    st.catchUp = false;
    st.catchUpReason = null;
  };

  // Velocidade desejada conforme o estado atual.
  YDO.desiredRate = function () {
    const st = YDO.state;
    if (st.catchUp) return YDO.settings.catchUpRate; // atrás do vivo -> 2x
    if (st.bufferTrim) return YDO.BUFFER_TRIM_RATE; // buffer alto -> 1.3x
    return 1;
  };

  // Aplica a velocidade (reassere: só mexe se estiver diferente do alvo).
  YDO.applyRate = function () {
    const want = YDO.desiredRate();
    YDO.state.appliedRate = want;
    const v = YDO.$video();
    if (v && Math.abs((v.playbackRate || 1) - want) > 0.01) YDO.setRate(want);
  };

  // Em vídeo normal: só volta a 1x se NÓS tínhamos acelerado (não mexe na
  // velocidade que o usuário escolheu manualmente).
  YDO.releaseRate = function () {
    const st = YDO.state;
    if (st.appliedRate && st.appliedRate !== 1) YDO.setRate(1);
    st.appliedRate = 1;
    st.catchUp = false;
    st.catchUpReason = null;
    st.bufferTrim = false;
  };

  YDO.goLive = function () {
    // o seek até o live edge é feito no inject (frame correto do player)
    YDO.pageCmd("goLive");
    const badge = document.querySelector("#movie_player .ytp-live-badge");
    if (badge && !badge.classList.contains("ytp-live-badge-is-livehead")) {
      try {
        badge.click();
      } catch (e) {}
    }
    YDO.stopCatchUp();
    YDO.applyRate();
  };
})();

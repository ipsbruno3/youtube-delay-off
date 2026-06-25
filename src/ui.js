/*
 * ui.js — elementos visuais injetados no player.
 *
 *  - Timer ao lado do botão "Em direto" (atraso / contador / AO VIVO).
 *  - Ponto AO VIVO no canto, visível até em tela cheia.
 */
(function () {
  "use strict";
  const YDO = (window.__ydo__ = window.__ydo__ || {});

  /* timer ao lado do botão "Em direto" */
  YDO.ensureTimer = function () {
    let el = document.querySelector(".ydo-timer");
    if (el) return el;
    const badge = document.querySelector("#movie_player .ytp-live-badge");
    if (!badge || !badge.parentNode) return null;

    el = document.createElement("button");
    el.className = "ydo-timer ytp-button";
    el.type = "button";
    el.title = "Sincronizar com o AO VIVO";
    el.innerHTML =
      '<span class="ydo-timer-icon"></span><span class="ydo-timer-text"></span>';
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      if (YDO.state.catchUp) YDO.stopCatchUp();
      else YDO.startCatchUp("manual");
    });
    badge.parentNode.insertBefore(el, badge.nextSibling);
    return el;
  };

  /* ponto AO VIVO no canto (anexado ao player -> vale em tela cheia) */
  YDO.ensureOverlay = function () {
    const player = YDO.$player();
    if (!player) return null;
    let el = player.querySelector(".ydo-overlay");
    if (el) return el;
    el = document.createElement("div");
    el.className = "ydo-overlay";
    el.innerHTML =
      '<span class="ydo-dot"></span><span class="ydo-label"></span>';
    player.appendChild(el);
    return el;
  };

  YDO.renderTimer = function (el, info) {
    if (!el) return;
    el.style.display = "inline-flex";
    const text = el.querySelector(".ydo-timer-text");
    const s = YDO.settings;
    if (info.atLiveHead) {
      el.dataset.state = "live";
      text.textContent = "AO VIVO";
    } else if (YDO.state.catchUp) {
      // contador regressivo até o ponto ideal
      el.dataset.state = "catching";
      text.textContent = `${s.catchUpRate}x · -${YDO.fmt(
        YDO.eta(info.delay, s.catchUpRate)
      )}`;
    } else {
      el.dataset.state = "delayed";
      text.textContent = `-${YDO.fmt(info.delay)}`;
    }
  };

  YDO.renderOverlay = function (el, info) {
    if (!el) return;
    const label = el.querySelector(".ydo-label");
    el.style.display = "flex";
    if (info.atLiveHead) {
      el.dataset.state = "live";
      label.textContent = "AO VIVO";
    } else if (YDO.state.catchUp) {
      el.dataset.state = "catching";
      label.textContent = `-${YDO.fmt(
        YDO.eta(info.delay, YDO.settings.catchUpRate)
      )}`;
    } else {
      // atrasado e parado: ponto vermelho fraco + atraso
      el.dataset.state = "delayed";
      label.textContent = `-${YDO.fmt(info.delay)}`;
    }
  };
})();

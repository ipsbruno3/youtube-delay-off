/*
 * core.js — base do content script (mundo isolado).
 *
 * Define o namespace compartilhado window.__ydo__ (acessível por todos os
 * módulos do content script, que rodam no mesmo "isolated world"), além das
 * configurações, do estado compartilhado e de helpers de formatação.
 *
 * Ordem de carregamento (manifest): core -> bridge -> catchup -> ui -> content.
 */
(function () {
  "use strict";
  const YDO = (window.__ydo__ = window.__ydo__ || {});

  YDO.DEFAULTS = {
    autoSync: true, // acelera sozinho ao detectar atraso
    forceQuality: false, // qualidade em AUTO por padrão (adaptativo costuma ser melhor)
    quality: "hd720", // qualidade usada quando "Fixar qualidade" está ligado
    catchUpRate: 2, // velocidade na recuperação
    syncThreshold: 5, // < 5s de atraso = considerado AO VIVO
    lowLatency: false, // modo "Reduzir latência": mantém o limiar no mínimo
  };

  // Alvo de atraso (s) no modo "Reduzir latência": mantém você colado na borda,
  // encurtando o buffer entre o canal e o navegador (latência mínima).
  YDO.LOW_LATENCY_TARGET = 2;

  // "Buffer mode" (dentro do Reduzir latência): mesmo AO VIVO, se o buffer
  // passar de BUFFER_HIGH acelera levemente (BUFFER_TRIM_RATE) até cair abaixo
  // de BUFFER_LOW (histerese p/ não ficar ligando/desligando).
  YDO.BUFFER_HIGH = 10; // s — acima disso entra em "SYNC"
  YDO.BUFFER_LOW = 1; // s — abaixo disso volta a 1x
  YDO.BUFFER_TRIM_RATE = 1.2; // velocidade suave p/ drenar o buffer

  // Configurações atuais — mutadas no lugar para manter a MESMA referência
  // em todos os módulos (não substituir o objeto).
  YDO.settings = Object.assign({}, YDO.DEFAULTS);

  // Estado compartilhado entre módulos.
  YDO.state = {
    catchUp: false, // recuperação ativa?
    catchUpReason: null, // "auto" | "manual"
    lastInfo: { isLive: false }, // último estado da live vindo do inject.js
    lastBadgeState: null, // evita spam de mensagens ao background
    lastVideoSrc: null, // detecta troca de vídeo (SPA)
    qualityLocked: null, // qualidade atualmente travada (ou null = auto)
    bufferTrim: false, // "buffer mode" ativo (drenando buffer a 1.3x)?
    appliedRate: 1, // última velocidade que NÓS aplicamos
  };

  /* helpers de DOM do player */
  YDO.$player = () => document.getElementById("movie_player");
  YDO.$video = () => document.querySelector("#movie_player video");

  /* formata segundos em MM:SS (ou H:MM:SS) */
  YDO.fmt = function (sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  /* tempo real estimado até sincronizar acelerando: atraso / (taxa - 1) */
  YDO.eta = function (delay, rate) {
    const gain = Math.max(0.01, rate - 1);
    return delay / gain;
  };

  // Limiar efetivo de "AO VIVO" (s): bem menor quando "Reduzir latência" liga.
  YDO.threshold = function () {
    return YDO.settings.lowLatency
      ? YDO.LOW_LATENCY_TARGET
      : YDO.settings.syncThreshold;
  };
})();

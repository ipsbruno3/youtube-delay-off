/*
 * background.js — service worker (MV3).
 *
 * Recebe o estado de cada aba e reflete no ícone da extensão:
 *   live      -> ícone normal, badge verde "•"
 *   delayed   -> ícone "aceso" (glow) + badge vermelho, para chamar atenção
 *   catching  -> ícone "aceso" + badge "2x" laranja
 *   none      -> ícone normal, sem badge
 */

const ICON = {
  normal: { 16: "icons/icon16.png", 48: "icons/icon48.png", 128: "icons/icon128.png" },
  glow: { 16: "icons/glow16.png", 48: "icons/glow48.png", 128: "icons/glow128.png" },
  gray: { 16: "icons/gray16.png", 48: "icons/gray48.png", 128: "icons/gray128.png" },
};

function paint(tabId, state) {
  // delayed/catching -> aceso; inactive (vídeo normal) -> cinza; resto -> normal
  let icon = ICON.normal;
  if (state === "delayed" || state === "catching") icon = ICON.glow;
  else if (state === "inactive") icon = ICON.gray;
  try {
    chrome.action.setIcon({ tabId, path: icon });
  } catch (e) {}

  let text = "";
  let color = "#00000000";
  if (state === "delayed") {
    text = "●";
    color = "#ff2d46";
  } else if (state === "catching") {
    text = "2x";
    color = "#f5a623";
  } else if (state === "live") {
    text = "●";
    color = "#1db954";
  }

  try {
    chrome.action.setBadgeText({ tabId, text });
    if (chrome.action.setBadgeTextColor)
      chrome.action.setBadgeTextColor({ tabId, color: "#ffffff" });
    chrome.action.setBadgeBackgroundColor({ tabId, color });
    chrome.action.setTitle({
      tabId,
      title:
        state === "delayed"
          ? "Dessincronizado — clique para sincronizar"
          : state === "catching"
          ? "Sincronizando (acelerado)…"
          : state === "live"
          ? "AO VIVO — sincronizado"
          : state === "inactive"
          ? "Inativo — este vídeo não é uma live"
          : "YouTube Delay Off",
    });
  } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== "ydo-status") return;
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return;
  paint(tabId, msg.state);
});

// Limpa quando a aba é fechada (estado é por aba, então o Chrome já cuida,
// mas garantimos consistência ao recarregar a extensão).
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

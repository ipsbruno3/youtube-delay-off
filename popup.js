/* popup.js — UI de controle. Fala com o content script da aba ativa. */

const DEFAULTS = {
  autoSync: true,
  forceQuality: false,
  quality: "hd720",
  catchUpRate: 2,
  syncThreshold: 5,
  lowLatency: false,
};

const $ = (id) => document.getElementById(id);
const card = $("card");
const stateLabel = $("state-label");
const stateValue = $("state-value");
const stateHint = $("state-hint");
const btnSync = $("btn-sync");
const btnLive = $("btn-live");
const foot = $("foot");

let activeTabId = null;
let pollTimer = null;

/* ---------- comunicação com a aba ---------- */

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0]);
    });
  });
}

function sendToTab(type, extra) {
  return new Promise((resolve) => {
    if (activeTabId == null) return resolve(null);
    chrome.tabs.sendMessage(activeTabId, { type, ...extra }, (resp) => {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(resp);
    });
  });
}

/* ---------- formatação ---------- */

function fmt(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/* ---------- render do estado ---------- */

function renderStatus(resp) {
  if (!resp || !resp.info || !resp.info.isLive) {
    card.dataset.state = "idle";
    stateLabel.textContent = "Sem live";
    stateValue.textContent = "—";
    stateHint.textContent = "";
    btnSync.disabled = true;
    btnLive.disabled = true;
    foot.textContent = "Abra uma live no YouTube";
    return;
  }

  const { info, catchUp, eta } = resp;
  btnLive.disabled = false;

  if (info.atLiveHead) {
    card.dataset.state = "live";
    stateLabel.textContent = "AO VIVO";
    stateValue.textContent = "Sincronizado";
    stateHint.textContent = "Você está no ponto da transmissão.";
    btnSync.disabled = true;
    btnSync.textContent = "Sincronizar agora";
    foot.textContent = "Tudo certo • 0s de atraso";
  } else if (catchUp) {
    card.dataset.state = "catching";
    stateLabel.textContent = `Sincronizando · ${resp.settings.catchUpRate}x`;
    stateValue.textContent = `-${fmt(eta)}`;
    stateHint.textContent = `Atraso atual: ${fmt(info.delay)} • chegando ao vivo…`;
    btnSync.disabled = false;
    btnSync.textContent = "Parar";
    foot.textContent = "Acelerando até o AO VIVO";
  } else {
    card.dataset.state = "delayed";
    stateLabel.textContent = "Atrasado";
    stateValue.textContent = `-${fmt(info.delay)}`;
    stateHint.textContent = `Sincronizando a ${resp.settings.catchUpRate}x levaria ${fmt(
      eta
    )}.`;
    btnSync.disabled = false;
    btnSync.textContent = "Sincronizar agora";
    foot.textContent = "Fora do ponto da transmissão";
  }
}

async function refresh() {
  const resp = await sendToTab("ydo-get-status");
  renderStatus(resp);
}

/* ---------- ações ---------- */

btnSync.addEventListener("click", async () => {
  const resp = await sendToTab("ydo-get-status");
  if (resp && resp.catchUp) await sendToTab("ydo-stop-sync");
  else await sendToTab("ydo-sync-now");
  refresh();
});

btnLive.addEventListener("click", async () => {
  await sendToTab("ydo-go-live");
  setTimeout(refresh, 300);
});

/* ---------- opções (chrome.storage.sync) ---------- */

function bindToggle(id, key) {
  const el = $(id);
  el.addEventListener("change", () => {
    chrome.storage.sync.set({ [key]: el.checked });
    if (id === "opt-fq") updateQualityRow(el.checked);
  });
}
function bindSelect(id, key, parse) {
  const el = $(id);
  el.addEventListener("change", () => {
    const v = parse ? parse(el.value) : el.value;
    chrome.storage.sync.set({ [key]: v });
  });
}

function updateQualityRow(enabled) {
  $("row-quality").classList.toggle("disabled", !enabled);
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULTS, (s) => {
    $("opt-auto").checked = !!s.autoSync;
    $("opt-lowlat").checked = !!s.lowLatency;
    $("opt-fq").checked = !!s.forceQuality;
    $("opt-quality").value = s.quality;
    $("opt-rate").value = String(s.catchUpRate);
    updateQualityRow(!!s.forceQuality);
  });
}

bindToggle("opt-auto", "autoSync");
bindToggle("opt-lowlat", "lowLatency");
bindToggle("opt-fq", "forceQuality");
bindSelect("opt-quality", "quality");
bindSelect("opt-rate", "catchUpRate", parseFloat);

/* ---------- boot ---------- */

(async function init() {
  const tab = await getActiveTab();
  activeTabId = tab && tab.id;
  loadSettings();
  if (tab && /:\/\/(www\.|m\.|music\.)?youtube\.com/.test(tab.url || "")) {
    refresh();
    pollTimer = setInterval(refresh, 700);
  } else {
    card.dataset.state = "idle";
    stateLabel.textContent = "Sem live";
    stateValue.textContent = "—";
    btnSync.disabled = true;
    btnLive.disabled = true;
    foot.textContent = "Abra o YouTube para usar";
  }
})();

window.addEventListener("unload", () => pollTimer && clearInterval(pollTimer));

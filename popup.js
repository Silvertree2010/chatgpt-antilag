const DEFAULT_SETTINGS = {
  enabled: true,
  keepRecentTurns: 12
};

const enabledInput = document.getElementById("enabled");
const keepRecentTurnsInput = document.getElementById("keepRecentTurns");
const keepRecentTurnsValue = document.getElementById("keepRecentTurnsValue");
const statusNode = document.getElementById("status");

init();

async function init() {
  const settings = await loadSettings();
  render(settings);

  enabledInput.addEventListener("change", persistSettings);
  keepRecentTurnsInput.addEventListener("input", () => {
    keepRecentTurnsValue.textContent = keepRecentTurnsInput.value;
  });
  keepRecentTurnsInput.addEventListener("change", persistSettings);
}

function render(settings) {
  enabledInput.checked = settings.enabled;
  keepRecentTurnsInput.value = String(settings.keepRecentTurns);
  keepRecentTurnsValue.textContent = String(settings.keepRecentTurns);
}

function readForm() {
  return {
    enabled: enabledInput.checked,
    keepRecentTurns: Number(keepRecentTurnsInput.value)
  };
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...stored
  };
}

async function persistSettings() {
  const settings = readForm();
  await chrome.storage.sync.set(settings);
  setStatus("Saved.");
  await notifyCurrentTab();
}

async function notifyCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(tab.url)) {
    return false;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "CHATGPT_ANTILAG_REFRESH" });
    return true;
  } catch (_error) {
    return false;
  }
}

function setStatus(message) {
  statusNode.textContent = message;
}

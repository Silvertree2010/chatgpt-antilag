const DEFAULT_SETTINGS = {
  enabled: true,
  keepRecentTurns: 12
};

const state = {
  settings: { ...DEFAULT_SETTINGS },
  expanded: false,
  hiddenCount: 0,
  observer: null,
  scheduled: false,
  ui: null
};

const TURN_SELECTORS = [
  '[data-testid^="conversation-turn-"]',
  'article[data-testid^="conversation-turn-"]',
  'main article',
  'main [data-message-author-role]'
];

bootstrap();

async function bootstrap() {
  state.settings = await loadSettings();
  ensureUi();
  bindEvents();
  scheduleApply();
}

function bindEvents() {
  if (!state.observer) {
    state.observer = new MutationObserver(() => scheduleApply());
    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "CHATGPT_ANTILAG_REFRESH") {
      return;
    }

    refresh().then(() => sendResponse({ ok: true }));
    return true;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") {
      return;
    }

    let changed = false;

    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (changes[key]) {
        state.settings[key] = changes[key].newValue;
        changed = true;
      }
    }

    if (changed) {
      state.expanded = false;
      scheduleApply();
    }
  });
}

async function refresh() {
  state.settings = await loadSettings();
  state.expanded = false;
  applyPerformanceMode();
}

function scheduleApply() {
  if (state.scheduled) {
    return;
  }

  state.scheduled = true;

  window.requestAnimationFrame(() => {
    state.scheduled = false;
    applyPerformanceMode();
  });
}

function applyPerformanceMode() {
  const turns = getConversationTurns();

  if (!turns.length) {
    clearHiddenTurns();
    state.hiddenCount = 0;
    renderUi();
    return;
  }

  const shouldHide = state.settings.enabled && !state.expanded;
  const keepCount = Math.max(1, Number(state.settings.keepRecentTurns) || DEFAULT_SETTINGS.keepRecentTurns);
  const visibleStartIndex = Math.max(0, turns.length - keepCount);

  turns.forEach((turn, index) => {
    turn.classList.toggle("cgpt-antilag-hidden", shouldHide && index < visibleStartIndex);
  });

  state.hiddenCount = shouldHide ? visibleStartIndex : 0;
  renderUi();
}

function clearHiddenTurns() {
  document.querySelectorAll(".cgpt-antilag-hidden").forEach((node) => {
    node.classList.remove("cgpt-antilag-hidden");
  });
}

function ensureUi() {
  if (state.ui) {
    attachUi();
    return;
  }

  const root = document.createElement("div");
  root.className = "cgpt-antilag-inline";
  root.hidden = true;

  const copy = document.createElement("div");
  copy.className = "cgpt-antilag-inline-copy";

  const actions = document.createElement("div");
  actions.className = "cgpt-antilag-inline-actions";

  const toggleButton = document.createElement("button");
  toggleButton.className = "cgpt-antilag-inline-button";
  toggleButton.type = "button";
  toggleButton.addEventListener("click", () => {
    state.expanded = !state.expanded;
    applyPerformanceMode();
  });

  actions.append(toggleButton);
  root.append(copy, actions);

  state.ui = {
    root,
    copy,
    toggleButton
  };

  attachUi();
}

function attachUi() {
  if (!state.ui) {
    return;
  }

  const anchor = findUiAnchor();

  if (!anchor) {
    return;
  }

  if (state.ui.root.parentElement !== anchor) {
    anchor.appendChild(state.ui.root);
  }
}

function findUiAnchor() {
  return (
    document.querySelector("form") ||
    document.querySelector("main form") ||
    document.querySelector("main")
  );
}

function renderUi() {
  ensureUi();

  if (!state.ui) {
    return;
  }

  const { root, copy, toggleButton } = state.ui;

  if (!state.settings.enabled) {
    root.hidden = true;
    return;
  }

  root.hidden = false;

  if (!state.hiddenCount) {
    copy.textContent = state.expanded
      ? "Anti-Lag is active and everything is currently visible."
      : "Anti-Lag is active. Nothing to collapse yet.";
    toggleButton.textContent = "All visible";
    toggleButton.disabled = true;
    return;
  }

  copy.textContent = `${state.hiddenCount} older messages hidden, ${state.settings.keepRecentTurns} recent turns still visible.`;
  toggleButton.textContent = state.expanded ? "Reduce" : "Show all";
  toggleButton.disabled = false;
}

function getConversationTurns() {
  for (const selector of TURN_SELECTORS) {
    const candidates = Array.from(document.querySelectorAll(selector));
    const turns = uniqueVisibleTurns(candidates);

    if (turns.length >= 4) {
      return turns;
    }
  }

  return [];
}

function uniqueVisibleTurns(nodes) {
  const seen = new Set();
  const filtered = [];

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }

    if (seen.has(node)) {
      continue;
    }

    const text = node.innerText?.trim();

    if (!text) {
      continue;
    }

    if (node.closest("nav, aside")) {
      continue;
    }

    seen.add(node);
    filtered.push(node);
  }

  return filtered;
}

function loadSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS).then((stored) => ({
    ...DEFAULT_SETTINGS,
    ...stored
  }));
}

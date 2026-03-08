(function initSettings(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});

  const defaultModifiers = Object.freeze({
    ctrl: true,
    shift: true,
    alt: false,
    meta: false
  });

  const defaultSettings = Object.freeze({
    modifiers: defaultModifiers
  });

  function normalizeModifierConfig(rawConfig) {
    const normalized = {
      ctrl: Boolean(rawConfig && rawConfig.ctrl),
      shift: Boolean(rawConfig && rawConfig.shift),
      alt: Boolean(rawConfig && rawConfig.alt),
      meta: Boolean(rawConfig && rawConfig.meta)
    };

    if (!normalized.ctrl && !normalized.shift && !normalized.alt && !normalized.meta) {
      return Object.assign({}, defaultModifiers);
    }

    return normalized;
  }

  function normalizeSettings(rawSettings) {
    return {
      modifiers: normalizeModifierConfig(rawSettings && rawSettings.modifiers)
    };
  }

  function loadSettings() {
    return new Promise(function executor(resolve) {
      chrome.storage.sync.get(defaultSettings, function callback(items) {
        resolve(normalizeSettings(items));
      });
    });
  }

  function saveSettings(nextSettings) {
    const normalized = normalizeSettings(nextSettings);
    return new Promise(function executor(resolve) {
      chrome.storage.sync.set(normalized, function callback() {
        resolve(normalized);
      });
    });
  }

  function subscribe(listener) {
    function handleStorageChange(changes, areaName) {
      if (areaName !== 'sync' || !changes.modifiers) {
        return;
      }

      listener(normalizeModifierConfig(changes.modifiers.newValue));
    }

    chrome.storage.onChanged.addListener(handleStorageChange);
    return function unsubscribe() {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }

  namespace.settings = {
    defaultModifiers,
    defaultSettings,
    loadSettings,
    normalizeModifierConfig,
    normalizeSettings,
    saveSettings,
    subscribe
  };
})(globalThis);
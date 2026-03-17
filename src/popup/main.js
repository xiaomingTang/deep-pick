(function initPopup(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const i18n = namespace.i18n;
  const settings = namespace.settings;

  const modifierOrder = ['ctrl', 'shift', 'alt', 'meta'];

  function getModifierInputs() {
    return Array.from(document.querySelectorAll('input[name="modifier"]'));
  }

  function getStatusNode() {
    return document.getElementById('status');
  }

  function getRawFormState() {
    const raw = {};

    for (const input of getModifierInputs()) {
      raw[input.value] = input.checked;
    }

    return raw;
  }

  function setStatus(message, type) {
    const node = getStatusNode();
    node.textContent = message || '';
    node.className = 'status' + (type ? ' ' + type : '');
  }

  function readFormState() {
    return settings.normalizeModifierConfig(getRawFormState());
  }

  function writeFormState(modifiers) {
    const normalized = settings.normalizeModifierConfig(modifiers);

    for (const input of getModifierInputs()) {
      input.checked = Boolean(normalized[input.value]);
    }
  }

  function validateSelection(modifiers) {
    return modifierOrder.some(function hasSelected(key) {
      return Boolean(modifiers[key]);
    });
  }

  function t(key, substitutions, fallback) {
    return i18n && typeof i18n.t === 'function'
      ? i18n.t(key, substitutions, fallback)
      : (fallback || key);
  }

  function describeModifiers(modifiers) {
    return modifierOrder
      .filter(function pick(key) {
        return Boolean(modifiers[key]);
      })
      .map(function label(key) {
        return t('modifier' + key.charAt(0).toUpperCase() + key.slice(1) + 'Label', undefined, key.charAt(0).toUpperCase() + key.slice(1));
      })
      .join(' + ');
  }

  function saveModifiers(modifiers) {
    return settings.saveSettings({ modifiers: modifiers }).then(function onSaved(savedSettings) {
      setStatus(t('popupStatusSaved', describeModifiers(savedSettings.modifiers), 'Saved: ' + describeModifiers(savedSettings.modifiers)), 'success');
    });
  }

  function handleModifierChange() {
    const rawModifiers = getRawFormState();
    if (!validateSelection(rawModifiers)) {
      writeFormState(readFormState());
      setStatus(t('popupStatusSelectAtLeastOne', undefined, 'Select at least one modifier key.'), 'error');
      return;
    }

    saveModifiers(settings.normalizeModifierConfig(rawModifiers));
  }

  function mount() {
    if (i18n) {
      i18n.applyDocumentLanguage(document);
      i18n.applyDocumentTranslations(document);
    }

    for (const input of getModifierInputs()) {
      input.addEventListener('change', handleModifierChange);
    }

    settings.loadSettings().then(function onLoaded(loadedSettings) {
      writeFormState(loadedSettings.modifiers);
      setStatus(t('popupStatusCurrent', describeModifiers(loadedSettings.modifiers), 'Current combination: ' + describeModifiers(loadedSettings.modifiers)), 'success');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})(globalThis);
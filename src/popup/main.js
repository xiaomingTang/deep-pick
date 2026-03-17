(function initPopup(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
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

  function describeModifiers(modifiers) {
    return modifierOrder
      .filter(function pick(key) {
        return Boolean(modifiers[key]);
      })
      .map(function label(key) {
        return key.charAt(0).toUpperCase() + key.slice(1);
      })
      .join(' + ');
  }

  function saveModifiers(modifiers, messagePrefix) {
    return settings.saveSettings({ modifiers: modifiers }).then(function onSaved(savedSettings) {
      setStatus(messagePrefix + describeModifiers(savedSettings.modifiers), 'success');
    });
  }

  function handleModifierChange() {
    const rawModifiers = getRawFormState();
    if (!validateSelection(rawModifiers)) {
      writeFormState(readFormState());
      setStatus('Select at least one modifier key.', 'error');
      return;
    }

    saveModifiers(settings.normalizeModifierConfig(rawModifiers), 'Saved: ');
  }

  function mount() {
    for (const input of getModifierInputs()) {
      input.addEventListener('change', handleModifierChange);
    }

    settings.loadSettings().then(function onLoaded(loadedSettings) {
      writeFormState(loadedSettings.modifiers);
      setStatus('Current combination: ' + describeModifiers(loadedSettings.modifiers), 'success');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})(globalThis);
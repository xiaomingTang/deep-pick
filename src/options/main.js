(function initOptions(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const settings = namespace.settings;

  const modifierOrder = ['ctrl', 'shift', 'alt', 'meta'];

  function getModifierInputs() {
    return Array.from(document.querySelectorAll('input[name="modifier"]'));
  }

  function getStatusNode() {
    return document.getElementById('status');
  }

  function setStatus(message, type) {
    const node = getStatusNode();
    node.textContent = message || '';
    node.className = 'status' + (type ? ' ' + type : '');
  }

  function readFormState() {
    const raw = {};

    for (const input of getModifierInputs()) {
      raw[input.value] = input.checked;
    }

    return settings.normalizeModifierConfig(raw);
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

  function handleSave() {
    const modifiers = readFormState();
    if (!validateSelection(modifiers)) {
      setStatus('Select at least one modifier key.', 'error');
      return;
    }

    settings.saveSettings({ modifiers: modifiers }).then(function onSaved(savedSettings) {
      setStatus('Saved: ' + describeModifiers(savedSettings.modifiers), 'success');
    });
  }

  function handleReset() {
    writeFormState(settings.defaultModifiers);
    setStatus('Defaults restored: ' + describeModifiers(settings.defaultModifiers), 'success');
  }

  function mount() {
    document.getElementById('saveButton').addEventListener('click', handleSave);
    document.getElementById('resetButton').addEventListener('click', handleReset);

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
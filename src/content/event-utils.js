(function initEventUtils(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const constants = namespace.constants;
  const settings = namespace.settings;

  function isModifierPressed(event, modifierConfig) {
    const config = settings.normalizeModifierConfig(modifierConfig || settings.defaultModifiers);
    if (!event) {
      return false;
    }

    return Boolean(
      event.ctrlKey === config.ctrl
      && event.shiftKey === config.shift
      && event.altKey === config.alt
      && event.metaKey === config.meta
    );
  }

  function isOverlayEvent(event) {
    if (!event || typeof event.composedPath !== 'function') {
      return false;
    }

    return event.composedPath().some(function matchNode(node) {
      return Boolean(node && node.id === constants.overlayId);
    });
  }

  namespace.eventUtils = {
    isModifierPressed,
    isOverlayEvent
  };
})(globalThis);
(function initI18n(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});

  function normalizeSubstitutions(substitutions) {
    if (substitutions == null) {
      return undefined;
    }

    return Array.isArray(substitutions) ? substitutions : [substitutions];
  }

  function getMessage(key, substitutions) {
    if (!global.chrome || !chrome.i18n || typeof chrome.i18n.getMessage !== 'function') {
      return '';
    }

    return chrome.i18n.getMessage(key, normalizeSubstitutions(substitutions)) || '';
  }

  function t(key, substitutions, fallback) {
    const translated = getMessage(key, substitutions);
    if (translated) {
      return translated;
    }

    return fallback || key;
  }

  function applyDocumentTranslations(root) {
    const target = root || document;

    target.querySelectorAll('[data-i18n]').forEach(function translateText(node) {
      const key = node.getAttribute('data-i18n');
      node.textContent = t(key, undefined, node.textContent);
    });

    target.querySelectorAll('[data-i18n-title]').forEach(function translateTitle(node) {
      const key = node.getAttribute('data-i18n-title');
      node.title = t(key, undefined, node.title);
    });

    target.querySelectorAll('[data-i18n-placeholder]').forEach(function translatePlaceholder(node) {
      const key = node.getAttribute('data-i18n-placeholder');
      node.placeholder = t(key, undefined, node.placeholder);
    });
  }

  function getDocumentLanguage() {
    if (!global.chrome || !chrome.i18n || typeof chrome.i18n.getUILanguage !== 'function') {
      return 'en';
    }

    return chrome.i18n.getUILanguage().replace(/_/g, '-');
  }

  function applyDocumentLanguage(doc) {
    const target = doc || document;
    if (target && target.documentElement) {
      target.documentElement.lang = getDocumentLanguage();
    }
  }

  namespace.i18n = {
    applyDocumentLanguage,
    applyDocumentTranslations,
    getDocumentLanguage,
    t
  };
})(globalThis);
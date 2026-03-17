importScripts('../shared/constants.js', '../shared/messages.js', '../shared/url.js', '../shared/i18n.js', './downloads.js');

(function initBackground(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const downloads = namespace.downloads;
  const i18n = namespace.i18n;
  const messages = namespace.messages;

  function t(key, substitutions, fallback) {
    return i18n && typeof i18n.t === 'function'
      ? i18n.t(key, substitutions, fallback)
      : (fallback || key);
  }

  chrome.runtime.onMessage.addListener(function onMessage(message, _sender, sendResponse) {
    if (!message) {
      return false;
    }

    if (message.type === messages.resolvePreviewImage) {
      downloads.resolvePreviewImage(message.payload)
        .then(function handleSuccess(result) {
          sendResponse({ ok: true, result: result });
        })
        .catch(function handleError(error) {
          sendResponse({ ok: false, error: error && error.message ? error.message : t('backgroundPreviewResolveFailed', undefined, 'preview resolve failed') });
        });

      return true;
    }

    if (message.type !== messages.downloadImage) {
      return false;
    }

    downloads.triggerDownload(message.payload)
      .then(function handleSuccess(result) {
        sendResponse({ ok: true, result: result });
      })
      .catch(function handleError(error) {
        sendResponse({ ok: false, error: error && error.message ? error.message : t('backgroundDownloadFailed', undefined, 'download failed') });
      });

    return true;
  });
})(globalThis);
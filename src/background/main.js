importScripts('../shared/constants.js', '../shared/messages.js', '../shared/url.js', './downloads.js');

(function initBackground(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const downloads = namespace.downloads;
  const messages = namespace.messages;

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
          sendResponse({ ok: false, error: error && error.message ? error.message : 'preview resolve failed' });
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
        sendResponse({ ok: false, error: error && error.message ? error.message : 'download failed' });
      });

    return true;
  });
})(globalThis);
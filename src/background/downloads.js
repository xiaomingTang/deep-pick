(function initDownloads(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const constants = namespace.constants;
  const i18n = namespace.i18n;
  const urlUtils = namespace.url;

  function t(key, substitutions, fallback) {
    return i18n && typeof i18n.t === 'function'
      ? i18n.t(key, substitutions, fallback)
      : (fallback || key);
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    return btoa(binary);
  }

  async function responseToDataUrl(response) {
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    return 'data:' + contentType + ';base64,' + base64;
  }

  async function tryFetchImageData(payload) {
    const response = await fetch(payload.url, {
      credentials: 'include',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(t('backgroundImageFetchFailedStatus', String(response.status), 'image fetch failed with status ' + response.status));
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      throw new Error(t('backgroundResponseNotImage', contentType, 'response is not an image: ' + contentType));
    }

    const filename = urlUtils.ensureFilenameExtension(urlUtils.filenameFromUrl(payload.url), contentType);
    const dataUrl = await responseToDataUrl(response);

    return {
      contentType,
      dataUrl,
      filename
    };
  }

  async function resolvePreviewImage(payload) {
    const fetchedImage = await tryFetchImageData(payload);
    return {
      contentType: fetchedImage.contentType,
      dataUrl: fetchedImage.dataUrl
    };
  }

  async function clearSessionRule() {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [constants.dnrRuleId]
    });
  }

  async function setRefererRule(downloadUrl, pageUrl) {
    if (!pageUrl) {
      await clearSessionRule();
      return;
    }

    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [constants.dnrRuleId],
      addRules: [{
        id: constants.dnrRuleId,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [{
            header: 'referer',
            operation: 'set',
            value: pageUrl
          }]
        },
        condition: {
          regexFilter: '^' + escapeRegex(downloadUrl) + '$',
          resourceTypes: ['image', 'media', 'other', 'xmlhttprequest']
        }
      }]
    });
  }

  async function triggerDownload(payload) {
    if (!payload || (!payload.url && !payload.dataUrl)) {
      throw new Error(t('backgroundMissingImageUrl', undefined, 'missing image url'));
    }

    const referer = payload.pageUrl || payload.referrer || '';

    try {
      if (payload.dataUrl) {
        await clearSessionRule();
      } else {
        await setRefererRule(payload.url, referer);
      }
      let downloadId;

      if (payload.dataUrl) {
        const filename = urlUtils.ensureFilenameExtension(payload.filename || 'image', payload.contentType || '');
        downloadId = await chrome.downloads.download({
          url: payload.dataUrl,
          filename: filename,
          saveAs: true
        });

        return { downloadId: downloadId };
      }

      try {
        const fetchedImage = await tryFetchImageData(payload);
        downloadId = await chrome.downloads.download({
          url: fetchedImage.dataUrl,
          filename: fetchedImage.filename,
          saveAs: true
        });
      } catch (_fetchError) {
        const filename = urlUtils.ensureFilenameExtension(urlUtils.filenameFromUrl(payload.url), '');
        downloadId = await chrome.downloads.download({
          url: payload.url,
          filename,
          saveAs: true
        });
      }

      return { downloadId: downloadId };
    } finally {
      global.setTimeout(function removeRule() {
        clearSessionRule().catch(function swallow() {});
      }, 4000);
    }
  }

  namespace.downloads = {
    resolvePreviewImage,
    triggerDownload
  };
})(globalThis);
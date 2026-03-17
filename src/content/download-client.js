(function initDownloadClient(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const i18n = namespace.i18n;
  const messages = namespace.messages;
  const urlUtils = namespace.url;

  const OUTPUT_MIME_TYPES = {
    jpg: 'image/jpeg',
    png: 'image/png'
  };
  const OUTPUT_QUALITY = 0.94;
  const resolvedImageCache = new Map();

  function isContextInvalidatedError(error) {
    return Boolean(error && error.message && /Extension context invalidated/i.test(error.message));
  }

  function t(key, substitutions, fallback) {
    return i18n && typeof i18n.t === 'function'
      ? i18n.t(key, substitutions, fallback)
      : (fallback || key);
  }

  function createContextInvalidatedError() {
    return new Error(t('runtimeReloadedPage', undefined, 'The extension was just reloaded, and this page is still using the old script. Refresh the page and try again.'));
  }

  function arrayBufferToDataUrl(buffer, contentType) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }

    return 'data:' + contentType + ';base64,' + btoa(binary);
  }

  function sendMessage(type, payload) {
    return new Promise(function executor(resolve, reject) {
      if (!chrome.runtime || !chrome.runtime.id || typeof chrome.runtime.sendMessage !== 'function') {
        reject(createContextInvalidatedError());
        return;
      }

      try {
        chrome.runtime.sendMessage({
          type: type,
          payload: payload
        }, function callback(response) {
          if (chrome.runtime.lastError) {
            const runtimeError = new Error(chrome.runtime.lastError.message);
            reject(isContextInvalidatedError(runtimeError) ? createContextInvalidatedError() : runtimeError);
            return;
          }

          if (!response || !response.ok) {
            reject(new Error(response && response.error ? response.error : t('runtimeRequestFailed', undefined, 'Request failed.')));
            return;
          }

          resolve(response.result);
        });
      } catch (error) {
        reject(isContextInvalidatedError(error) ? createContextInvalidatedError() : error);
      }
    });
  }

  function saveImage(payload) {
    return prepareDownloadPayload(payload).then(function handlePrepared(preparedPayload) {
      return sendMessage(messages.downloadImage, preparedPayload);
    });
  }

  function resolvePreviewImage(payload) {
    return sendMessage(messages.resolvePreviewImage, payload);
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const header = parts[0] || '';
    const data = parts[1] || '';
    const mimeMatch = header.match(/data:([^;]+)/i);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise(function executor(resolve, reject) {
      const image = new Image();

      image.onload = function handleLoad() {
        resolve(image);
      };

      image.onerror = function handleError() {
        reject(new Error(t('runtimeUnableDecodeImage', undefined, 'Unable to decode the image.')));
      };

      image.src = dataUrl;
    });
  }

  function replaceFilenameExtension(filename, extension) {
    const safeFilename = filename || 'image';
    if (/\.[a-z0-9]{2,6}$/i.test(safeFilename)) {
      return safeFilename.replace(/\.[a-z0-9]{2,6}$/i, extension);
    }

    return safeFilename + extension;
  }

  function getOutputMimeType(format) {
    return OUTPUT_MIME_TYPES[format] || '';
  }

  function getOutputExtension(format) {
    if (format === 'jpg') {
      return '.jpg';
    }

    if (format === 'png') {
      return '.png';
    }

    return '';
  }

  function tryFetchImageDataDirectly(payload) {
    return fetch(payload.url, {
      credentials: 'include',
      redirect: 'follow'
    }).then(function handleResponse(response) {
      if (!response.ok) {
        throw new Error(t('runtimeImageRequestFailedStatus', String(response.status), 'Image request failed with status ' + response.status + '.'));
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(t('runtimeResponseNotImage', contentType, 'The response was not an image: ' + contentType));
      }

      return response.arrayBuffer().then(function handleBuffer(buffer) {
        return {
          contentType: contentType,
          dataUrl: arrayBufferToDataUrl(buffer, contentType),
          filename: urlUtils.ensureFilenameExtension(urlUtils.filenameFromUrl(payload.url), contentType)
        };
      });
    });
  }

  function resolveImageSource(payload) {
    const cacheKey = payload.url;

    if (resolvedImageCache.has(cacheKey)) {
      return resolvedImageCache.get(cacheKey);
    }

    const pending = resolvePreviewImage({
      pageUrl: payload.pageUrl,
      referrer: payload.referrer,
      url: payload.url
    }).then(function handleResolved(result) {
      if (!result || !result.dataUrl) {
        throw new Error(t('runtimePreviewImageMissing', undefined, 'Preview image data is missing.'));
      }

      return {
        contentType: result.contentType || 'image/png',
        dataUrl: result.dataUrl,
        filename: urlUtils.ensureFilenameExtension(urlUtils.filenameFromUrl(payload.url), result.contentType || '')
      };
    }).catch(function handleError(error) {
      if (!isContextInvalidatedError(error)) {
        resolvedImageCache.delete(cacheKey);
        throw error;
      }

      return tryFetchImageDataDirectly(payload).catch(function handleDirectFetchError() {
        resolvedImageCache.delete(cacheKey);
        throw error;
      });
    });

    resolvedImageCache.set(cacheKey, pending);
    return pending;
  }

  function transcodeImage(source, format) {
    return loadImageFromDataUrl(source.dataUrl).then(function handleImage(image) {
      const canvas = document.createElement('canvas');
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const mimeType = getOutputMimeType(format);
      const extension = getOutputExtension(format);

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, width, height);

      const dataUrl = canvas.toDataURL(mimeType, OUTPUT_QUALITY);
      return {
        contentType: mimeType,
        dataUrl: dataUrl,
        filename: replaceFilenameExtension(source.filename, extension)
      };
    });
  }

  function prepareImageAsset(payload) {
    const format = payload && payload.format ? payload.format : 'original';
    if (format === 'original') {
      return resolveImageSource(payload);
    }

    return resolveImageSource(payload).then(function handleSource(source) {
      return transcodeImage(source, format);
    });
  }

  function prepareDownloadPayload(payload) {
    const format = payload && payload.format ? payload.format : 'original';
    if (format === 'original') {
      return Promise.resolve(payload);
    }

    return prepareImageAsset(payload).then(function handleAsset(asset) {
      return {
        pageUrl: payload.pageUrl,
        referrer: payload.referrer,
        title: payload.title,
        url: payload.url,
        filename: asset.filename,
        contentType: asset.contentType,
        dataUrl: asset.dataUrl,
        format: format
      };
    });
  }

  function ensureClipboardAsset(asset) {
    if (asset.contentType === 'image/png') {
      return Promise.resolve(asset);
    }

    return transcodeImage(asset, 'png');
  }

  function copyImage(payload) {
    if (!global.navigator.clipboard || typeof global.ClipboardItem !== 'function') {
      return Promise.reject(new Error(t('runtimeClipboardUnavailable', undefined, 'The Clipboard API is unavailable.')));
    }

    return prepareImageAsset(payload).then(function handleAsset(asset) {
      return ensureClipboardAsset(asset);
    }).then(function handleClipboardAsset(asset) {
      const blob = dataUrlToBlob(asset.dataUrl);
      return global.navigator.clipboard.write([
        new global.ClipboardItem({
          [asset.contentType]: blob
        })
      ]);
    });
  }

  namespace.downloadClient = {
    copyImage,
    resolvePreviewImage,
    saveImage
  };
})(globalThis);
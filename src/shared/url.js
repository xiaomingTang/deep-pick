(function initUrlUtils(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const constants = namespace.constants;

  function normalizeUrl(rawUrl, baseUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return '';
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return '';
    }

    try {
      const resolved = new URL(trimmed, baseUrl || global.location.href);
      if (!constants.supportedProtocols.includes(resolved.protocol)) {
        return '';
      }

      return resolved.href;
    } catch (_error) {
      return '';
    }
  }

  function extractUrlsFromBackground(backgroundImage, baseUrl) {
    if (!backgroundImage || backgroundImage === 'none') {
      return [];
    }

    const matches = backgroundImage.matchAll(/url\((['"]?)(.*?)\1\)/gi);
    const urls = [];

    for (const match of matches) {
      const normalized = normalizeUrl(match[2], baseUrl);
      if (normalized) {
        urls.push(normalized);
      }
    }

    return urls;
  }

  function looksLikeImageUrl(rawValue) {
    if (!rawValue || typeof rawValue !== 'string') {
      return false;
    }

    const value = rawValue.trim().toLowerCase();
    if (!value) {
      return false;
    }

    if (value.startsWith('data:image/')) {
      return true;
    }

    return /(\.(apng|avif|bmp|gif|ico|jpe?g|png|svg|webp))(?:$|[?#])/.test(value);
  }

  function filenameFromUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      return lastSegment || 'image';
    } catch (_error) {
      return 'image';
    }
  }

  function extensionFromContentType(contentType) {
    if (!contentType || typeof contentType !== 'string') {
      return '';
    }

    const normalized = contentType.split(';')[0].trim().toLowerCase();
    const byType = {
      'image/apng': '.apng',
      'image/avif': '.avif',
      'image/bmp': '.bmp',
      'image/gif': '.gif',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/svg+xml': '.svg',
      'image/webp': '.webp'
    };

    return byType[normalized] || '';
  }

  function ensureFilenameExtension(filename, contentType) {
    const safeFilename = filename || 'image';
    if (/\.[a-z0-9]{2,6}$/i.test(safeFilename)) {
      return safeFilename;
    }

    const extension = extensionFromContentType(contentType);
    if (!extension) {
      return safeFilename;
    }

    return safeFilename + extension;
  }

  namespace.url = {
    ensureFilenameExtension,
    extensionFromContentType,
    extractUrlsFromBackground,
    filenameFromUrl,
    looksLikeImageUrl,
    normalizeUrl
  };
})(globalThis);
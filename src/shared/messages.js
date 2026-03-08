(function initMessages(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});

  namespace.messages = {
    downloadImage: 'deep-pick/download-image',
    resolvePreviewImage: 'deep-pick/resolve-preview-image'
  };
})(globalThis);
(function initConstants(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});

  namespace.constants = {
    extensionName: 'Deep Pick',
    previewImageSize: 200,
    previewGap: 10,
    previewColumns: 3,
    previewOffset: 18,
    maxElementDepth: 8,
    maxAncestorDepth: 3,
    maxDescendantSearchElements: 24,
    maxDescendantSearchRoots: 4,
    maxBackgroundImagesPerElement: 3,
    maxPreviewItems: 9,
    rafThrottle: true,
    overlayId: 'deep-pick-overlay-root',
    shadowHostAttr: 'data-deep-pick-overlay-host',
    panelMinPadding: 12,
    candidateDataAttributes: [
      'data-src',
      'data-img',
      'data-image',
      'data-picture',
      'data-pic'
    ],
    modifierKeyState: {
      ctrl: false,
      shift: false
    },
    dnrRuleId: 9001,
    supportedProtocols: ['http:', 'https:', 'data:', 'blob:']
  };
})(globalThis);
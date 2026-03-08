(function initDomUtils(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const constants = namespace.constants;

  function getPointElements(x, y) {
    if (typeof document.elementsFromPoint !== 'function') {
      return [];
    }

    return document.elementsFromPoint(x, y).slice(0, constants.maxElementDepth);
  }

  function collectElementChain(element) {
    const chain = [];
    const seen = new Set();
    let current = element;
    let depth = 0;

    while (current && current.nodeType === Node.ELEMENT_NODE && depth < constants.maxAncestorDepth) {
      if (!seen.has(current)) {
        chain.push(current);
        seen.add(current);
      }

      current = current.parentElement;
      depth += 1;
    }

    return chain;
  }

  function getElementRect(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  }

  function getIframeDocumentsAtPoint(x, y) {
    const pointElements = getPointElements(x, y);
    const frames = [];

    for (const element of pointElements) {
      if (!(element instanceof HTMLIFrameElement)) {
        continue;
      }

      try {
        const frameDocument = element.contentDocument;
        const frameWindow = element.contentWindow;
        if (!frameDocument || !frameWindow || typeof frameDocument.elementsFromPoint !== 'function') {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const frameX = x - rect.left;
        const frameY = y - rect.top;

        if (frameX < 0 || frameY < 0 || frameX > rect.width || frameY > rect.height) {
          continue;
        }

        frames.push({
          element: element,
          frameDocument: frameDocument,
          frameWindow: frameWindow,
          point: {
            x: frameX,
            y: frameY
          }
        });
      } catch (_error) {
        continue;
      }
    }

    return frames;
  }

  namespace.domUtils = {
    collectElementChain,
    getElementRect,
    getIframeDocumentsAtPoint,
    getPointElements
  };
})(globalThis);
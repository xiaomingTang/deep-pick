(function initImageCandidates(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const constants = namespace.constants;
  const domUtils = namespace.domUtils;
  const urlUtils = namespace.url;

  function buildBaseCandidate(url, source, score, rect, width, height) {
    return {
      url: url,
      source: source,
      score: score,
      rect: rect,
      width: width || 0,
      height: height || 0
    };
  }

  function isLikelyImageElement(element) {
    if (!(element instanceof Element)) {
      return false;
    }

    if (element instanceof HTMLImageElement || element instanceof SVGImageElement) {
      return true;
    }

    if (element.hasAttribute('src') || element.hasAttribute('href')) {
      return true;
    }

    for (const attributeName of constants.candidateDataAttributes) {
      if (element.hasAttribute(attributeName)) {
        return true;
      }
    }

    const style = global.getComputedStyle(element);
    return Boolean(style.backgroundImage && style.backgroundImage !== 'none');
  }

  function pushCandidate(target, entry) {
    if (!entry.url) {
      return;
    }

    target.push(entry);
  }

  function extractFromImageElement(element) {
    if (!(element instanceof HTMLImageElement)) {
      return [];
    }

    const url = urlUtils.normalizeUrl(element.currentSrc || element.src, document.baseURI);
    if (!url) {
      return [];
    }

    return [buildBaseCandidate(
      url,
      'img',
      400,
      domUtils.getElementRect(element),
      element.naturalWidth || 0,
      element.naturalHeight || 0
    )];
  }

  function extractFromSvgImage(element) {
    if (!(element instanceof SVGImageElement)) {
      return [];
    }

    const rawUrl = element.getAttribute('href') || element.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    const url = urlUtils.normalizeUrl(rawUrl, document.baseURI);
    if (!url) {
      return [];
    }

    return [buildBaseCandidate(
      url,
      'svg-image',
      380,
      domUtils.getElementRect(element),
      Math.round(element.width.baseVal.value || 0),
      Math.round(element.height.baseVal.value || 0)
    )];
  }

  function extractFromBackground(element) {
    const style = global.getComputedStyle(element);
    const urls = urlUtils.extractUrlsFromBackground(style.backgroundImage, document.baseURI)
      .slice(0, constants.maxBackgroundImagesPerElement);

    return urls.map(function mapUrl(url, index) {
      return {
        url: url,
        source: 'background-image',
        score: 300 - index,
        rect: domUtils.getElementRect(element),
        width: 0,
        height: 0
      };
    });
  }

  function extractFromKnownAttributes(element) {
    const results = [];

    for (const attributeName of constants.candidateDataAttributes) {
      const rawValue = element.getAttribute(attributeName);
      if (!rawValue) {
        continue;
      }

      const url = urlUtils.normalizeUrl(rawValue, document.baseURI);
      if (!url) {
        continue;
      }

      pushCandidate(results, {
        url,
        source: attributeName,
        score: 220,
        rect: domUtils.getElementRect(element),
        width: 0,
        height: 0
      });
    }

    for (const attributeName of element.getAttributeNames()) {
      if (!attributeName.startsWith('data-') || constants.candidateDataAttributes.includes(attributeName)) {
        continue;
      }

      const rawValue = element.getAttribute(attributeName);
      if (!urlUtils.looksLikeImageUrl(rawValue)) {
        continue;
      }

      const url = urlUtils.normalizeUrl(rawValue, document.baseURI);
      if (!url) {
        continue;
      }

      pushCandidate(results, {
        url,
        source: attributeName,
        score: 180,
        rect: domUtils.getElementRect(element),
        width: 0,
        height: 0
      });
    }

    return results;
  }

  function extractFromElement(element) {
    const candidates = [];
    candidates.push.apply(candidates, extractFromImageElement(element));
    candidates.push.apply(candidates, extractFromSvgImage(element));
    candidates.push.apply(candidates, extractFromBackground(element));
    candidates.push.apply(candidates, extractFromKnownAttributes(element));
    return candidates;
  }

  function getFrameElementRect(frameElement, element) {
    const frameRect = frameElement.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      x: frameRect.left + rect.left,
      y: frameRect.top + rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function isPointNearRect(point, rect) {
    const slop = 20;
    return point.x >= (rect.left - slop)
      && point.x <= (rect.right + slop)
      && point.y >= (rect.top - slop)
      && point.y <= (rect.bottom + slop);
  }

  function extractFromIframePoint(frameInfo) {
    const frameElements = frameInfo.frameDocument.elementsFromPoint(frameInfo.point.x, frameInfo.point.y)
      .slice(0, constants.maxElementDepth);
    const scanned = new Set();
    const candidates = [];

    for (let elementIndex = 0; elementIndex < frameElements.length; elementIndex += 1) {
      let current = frameElements[elementIndex];
      let chainIndex = 0;

      while (current && current.nodeType === Node.ELEMENT_NODE && chainIndex < constants.maxAncestorDepth) {
        if (!scanned.has(current)) {
          scanned.add(current);
          const baseScore = 95 - (elementIndex * 10) - chainIndex;
          const extracted = extractFromElement(current).map(function mapCandidate(candidate) {
            return Object.assign({}, candidate, {
              rect: getFrameElementRect(frameInfo.element, current),
              source: candidate.source + ':iframe-fallback',
              score: candidate.score + baseScore
            });
          });

          candidates.push.apply(candidates, extracted);
        }

        current = current.parentElement;
        chainIndex += 1;
      }
    }

    return candidates;
  }

  function collectDescendantCandidates(root, point) {
    if (!(root instanceof Element)) {
      return [];
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const candidates = [];
    let visited = 0;

    while (visited < constants.maxDescendantSearchElements) {
      const node = walker.nextNode();
      if (!node) {
        break;
      }

      visited += 1;

      if (!isLikelyImageElement(node)) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      if (!isPointNearRect(point, rect)) {
        continue;
      }

      const extracted = extractFromElement(node).map(function applyRelatedScore(candidate) {
        return Object.assign({}, candidate, {
          source: candidate.source + ':descendant',
          score: candidate.score - 35
        });
      });

      candidates.push.apply(candidates, extracted);
    }

    return candidates;
  }

  function dedupeAndSort(candidates) {
    const bestByUrl = new Map();

    for (const candidate of candidates) {
      const existing = bestByUrl.get(candidate.url);
      if (!existing || candidate.score > existing.score) {
        bestByUrl.set(candidate.url, candidate);
      }
    }

    return Array.from(bestByUrl.values())
      .sort(function compare(left, right) {
        return right.score - left.score;
      })
      .slice(0, constants.maxPreviewItems);
  }

  function getImageCandidatesAtPoint(x, y) {
    const pointElements = domUtils.getPointElements(x, y);
    const scanned = new Set();
    const searchedRoots = new Set();
    const candidates = [];

    for (let elementIndex = 0; elementIndex < pointElements.length; elementIndex += 1) {
      const chain = domUtils.collectElementChain(pointElements[elementIndex]);

      for (let chainIndex = 0; chainIndex < chain.length; chainIndex += 1) {
        const element = chain[chainIndex];
        if (scanned.has(element)) {
          continue;
        }

        scanned.add(element);
        const baseScore = 100 - (elementIndex * 10) - chainIndex;
        const extracted = extractFromElement(element).map(function applyScore(candidate) {
          return Object.assign({}, candidate, {
            score: candidate.score + baseScore
          });
        });

        candidates.push.apply(candidates, extracted);

        if (searchedRoots.size < constants.maxDescendantSearchRoots && candidates.length < 3) {
          searchedRoots.add(element);
          const descendantCandidates = collectDescendantCandidates(element, { x: x, y: y });
          candidates.push.apply(candidates, descendantCandidates);
        }
      }

      const hasStrongCandidate = candidates.some(function hasStrongScore(candidate) {
        return candidate.score >= 450;
      });

      if (hasStrongCandidate) {
        break;
      }
    }

    const frameInfos = domUtils.getIframeDocumentsAtPoint(x, y);
    for (const frameInfo of frameInfos) {
      const frameCandidates = extractFromIframePoint(frameInfo);
      if (frameCandidates.length) {
        candidates.push.apply(candidates, frameCandidates);
      }
    }

    return dedupeAndSort(candidates);
  }

  namespace.imageCandidates = {
    getImageCandidatesAtPoint
  };
})(globalThis);
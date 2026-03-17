(function initOverlay(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const constants = namespace.constants;
  const downloadClient = namespace.downloadClient;
  const i18n = namespace.i18n;

  function t(key, substitutions, fallback) {
    return i18n && typeof i18n.t === 'function'
      ? i18n.t(key, substitutions, fallback)
      : (fallback || key);
  }

  function getCandidateSignature(candidates) {
    return candidates.map(function mapCandidate(candidate) {
      return [candidate.url, candidate.source].join('@');
    }).join('|');
  }

  function formatDimensions(width, height) {
    if (!width || !height) {
      return t('overlayLoadingDimensions', undefined, 'Loading dimensions');
    }

    return width + ' x ' + height;
  }

  function createDownloadIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M12 3a1 1 0 0 1 1 1v8.59l2.3-2.29a1 1 0 1 1 1.4 1.41l-4 3.99a1 1 0 0 1-1.4 0l-4-3.99a1 1 0 1 1 1.4-1.41L11 12.59V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z');
    svg.appendChild(path);

    return svg;
  }

  function createCopyIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M9 3a2 2 0 0 0-2 2v1H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V8.41a2 2 0 0 0-.59-1.41l-3.41-3.41A2 2 0 0 0 12.59 3H9Zm6 3.41L14.59 5H15v1.41ZM9 5h3v3h3v7h-1V8a2 2 0 0 0-2-2H9V5Zm-3 3h7v9H6V8Z');
    svg.appendChild(path);

    return svg;
  }

  function createChevronIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z');
    svg.appendChild(path);

    return svg;
  }

  function createSpinnerIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('spinIcon');

    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('cx', '12');
    track.setAttribute('cy', '12');
    track.setAttribute('r', '8');
    track.setAttribute('fill', 'none');
    track.setAttribute('stroke', 'currentColor');
    track.setAttribute('stroke-opacity', '0.25');
    track.setAttribute('stroke-width', '2');

    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', 'currentColor');
    arc.setAttribute('stroke-linecap', 'round');
    arc.setAttribute('stroke-width', '2');
    arc.setAttribute('d', 'M12 4a8 8 0 0 1 8 8');

    svg.append(track, arc);
    return svg;
  }

  function createCheckIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('d', 'M9.55 18.3 4.7 13.45l1.4-1.4 3.45 3.44 8.35-8.34 1.4 1.4z');
    svg.appendChild(path);

    return svg;
  }

  function setButtonIcon(button, iconFactory) {
    button.textContent = '';
    button.appendChild(iconFactory());
  }

  function extractErrorMessage(error) {
    if (!error) {
      return t('overlayActionFailed', undefined, 'Action failed.');
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    return t('overlayActionFailed', undefined, 'Action failed.');
  }

  function createOverlay() {
    const host = document.createElement('div');
    host.id = constants.overlayId;
    host.setAttribute(constants.shadowHostAttr, '');
    host.style.position = 'fixed';
    host.style.left = '0';
    host.style.top = '0';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = [
      ':host { all: initial; }',
      '.panel {',
      '  position: fixed;',
      '  display: none;',
      '  box-sizing: border-box;',
      '  max-width: calc(100vw - 24px);',
      '  max-height: calc(100vh - 24px);',
      '  padding: 12px;',
      '  border-radius: 14px;',
      '  border: 1px solid rgba(255, 255, 255, 0.18);',
      '  background: rgba(20, 24, 31, 0.96);',
      '  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);',
      '  backdrop-filter: blur(12px);',
      '  pointer-events: auto;',
      '  overflow: auto;',
      '  color: #f3f7fb;',
      '  font: 12px/1.4 "Segoe UI", sans-serif;',
      '}',
      '.toastStack {',
      '  position: absolute;',
      '  right: 12px;',
      '  bottom: 12px;',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: flex-end;',
      '  gap: 8px;',
      '  pointer-events: none;',
      '}',
      '.toast {',
      '  max-width: min(320px, calc(100vw - 64px));',
      '  padding: 10px 12px;',
      '  border: 1px solid rgba(255, 129, 129, 0.36);',
      '  border-radius: 10px;',
      '  background: rgba(74, 23, 28, 0.96);',
      '  color: #ffe3e3;',
      '  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);',
      '}',
      '.header {',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 12px;',
      '  margin-bottom: 10px;',
      '}',
      '.titleWrap {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 2px;',
      '  min-width: 0;',
      '}',
      '.title {',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  color: #f3f7fb;',
      '}',
      '.headerHint {',
      '  color: rgba(199, 216, 232, 0.8);',
      '}',
      '.formatSelectWrap {',
      '  position: relative;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  flex-shrink: 0;',
      '}',
      '.formatSelect {',
      '  min-width: 78px;',
      '  padding: 6px 26px 6px 10px;',
      '  border: 1px solid rgba(255, 255, 255, 0.16);',
      '  border-radius: 999px;',
      '  background: rgba(28, 34, 44, 0.98);',
      '  color: #f3f7fb;',
      '  font: inherit;',
      '  appearance: none;',
      '  cursor: pointer;',
      '}',
      '.formatSelect option {',
      '  background: #1c222c;',
      '  color: #f3f7fb;',
      '}',
      '.formatSelect:hover {',
      '  border-color: rgba(140, 205, 255, 0.75);',
      '}',
      '.formatSelect:disabled {',
      '  cursor: wait;',
      '  opacity: 0.72;',
      '}',
      '.formatChevron {',
      '  position: absolute;',
      '  right: 10px;',
      '  color: rgba(243, 247, 251, 0.88);',
      '  pointer-events: none;',
      '}',
      '.grid {',
      '  display: grid;',
      '  grid-template-columns: repeat(var(--deep-pick-columns, 1), minmax(200px, 200px));',
      '  justify-content: start;',
      '  gap: 10px;',
      '}',
      '.item {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 6px;',
      '  width: 200px;',
      '  min-width: 200px;',
      '}',
      '.thumbButton {',
      '  position: relative;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 200px;',
      '  height: 200px;',
      '  padding: 0;',
      '  overflow: hidden;',
      '  border: 1px solid rgba(255, 255, 255, 0.14);',
      '  outline: 1px solid transparent;',
      '  outline-offset: 0;',
      '  border-radius: 10px;',
      '  background: rgba(255, 255, 255, 0.04);',
      '  cursor: pointer;',
      '}',
      '.thumbButton:disabled {',
      '  cursor: wait;',
      '  opacity: 0.82;',
      '}',
      '.thumbFrame {',
      '  position: relative;',
      '  width: 200px;',
      '  height: 200px;',
      '}',
      '.downloadButton {',
      '  position: absolute;',
      '  right: 8px;',
      '  bottom: 8px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 32px;',
      '  height: 32px;',
      '  border: 1px solid rgba(255, 255, 255, 0.14);',
      '  border-radius: 999px;',
      '  background: rgba(20, 24, 31, 0.9);',
      '  color: #f3f7fb;',
      '  cursor: pointer;',
      '  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);',
      '}',
      '.downloadButton:disabled {',
      '  cursor: wait;',
      '  opacity: 0.82;',
      '}',
      '.copyButton {',
      '  position: absolute;',
      '  right: 48px;',
      '  bottom: 8px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  width: 32px;',
      '  height: 32px;',
      '  border: 1px solid rgba(255, 255, 255, 0.14);',
      '  border-radius: 999px;',
      '  background: rgba(20, 24, 31, 0.9);',
      '  color: #f3f7fb;',
      '  cursor: pointer;',
      '  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);',
      '}',
      '.downloadButton:hover {',
      '  border-color: rgba(140, 205, 255, 0.75);',
      '  color: #8ccdff;',
      '}',
      '.copyButton:hover {',
      '  border-color: rgba(140, 205, 255, 0.75);',
      '  color: #8ccdff;',
      '}',
      '.copyButton:disabled {',
      '  cursor: wait;',
      '  opacity: 0.92;',
      '  color: #8ccdff;',
      '}',
      '.copyButton.copySuccess {',
      '  color: #41d98b;',
      '  border-color: rgba(65, 217, 139, 0.68);',
      '}',
      '.panel.busy,',
      '.panel.busy * {',
      '  cursor: wait !important;',
      '}',
      '.spinIcon {',
      '  animation: deep-pick-spin 0.85s linear infinite;',
      '}',
      '@keyframes deep-pick-spin {',
      '  from { transform: rotate(0deg); }',
      '  to { transform: rotate(360deg); }',
      '}',
      '.thumbButton:hover {',
      '  outline-color: rgba(140, 205, 255, 0.75);',
      '}',
      '.thumbButton img {',
      '  width: 100%;',
      '  height: 100%;',
      '  object-fit: contain;',
      '  background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));',
      '}',
      '.meta {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 2px;',
      '  max-width: 200px;',
      '}',
      '.source { color: rgba(199, 216, 232, 0.75); }',
      '.url {',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  white-space: nowrap;',
      '  color: rgba(243, 247, 251, 0.92);',
      '}',
      ''
    ].join('\n');

    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'header';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'titleWrap';

    const title = document.createElement('div');
    title.className = 'title';

    const hint = document.createElement('div');
    hint.className = 'headerHint';

    titleWrap.append(title, hint);

    const formatSelectWrap = document.createElement('div');
    formatSelectWrap.className = 'formatSelectWrap';

    const formatSelect = document.createElement('select');
    formatSelect.className = 'formatSelect';
    [
      { value: 'original', label: t('overlayFormatOriginal', undefined, 'Original') },
      { value: 'jpg', label: 'jpg' },
      { value: 'png', label: 'png' }
    ].forEach(function appendOption(optionInfo) {
      const option = document.createElement('option');
      option.value = optionInfo.value;
      option.textContent = optionInfo.label;
      formatSelect.appendChild(option);
    });

    const formatChevron = document.createElement('span');
    formatChevron.className = 'formatChevron';
    formatChevron.appendChild(createChevronIcon());

    formatSelectWrap.append(formatSelect, formatChevron);
    header.append(titleWrap, formatSelectWrap);

    const grid = document.createElement('div');
    grid.className = 'grid';

    const toastStack = document.createElement('div');
    toastStack.className = 'toastStack';

    panel.append(header, grid, toastStack);

    shadow.append(style, panel);
    document.documentElement.appendChild(host);

    return {
      host,
      title,
      hint,
      formatSelect,
      grid,
      toastStack,
      panel,
      shadow
    };
  }

  function showToast(overlay, message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    overlay.toastStack.appendChild(toast);

    global.setTimeout(function removeToast() {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3200);
  }

  function getViewportColumnCount() {
    if (global.innerWidth <= 720) {
      return 1;
    }

    if (global.innerWidth <= 1080) {
      return 2;
    }

    return constants.previewColumns;
  }

  function getColumnCount(candidates) {
    return Math.min(getViewportColumnCount(), Math.max(1, candidates.length));
  }

  function measurePanel(panel, candidates) {
    const columnCount = getColumnCount(candidates);
    const rowCount = Math.ceil(candidates.length / columnCount);
    const width = (constants.previewImageSize * columnCount) + (constants.previewGap * Math.max(0, columnCount - 1)) + 24;
    const height = (constants.previewImageSize * rowCount) + (74 * rowCount) + (constants.previewGap * Math.max(0, rowCount - 1)) + 48;

    return {
      width: Math.min(width, global.innerWidth - (constants.panelMinPadding * 2)),
      height: Math.min(height, global.innerHeight - (constants.panelMinPadding * 2))
    };
  }

  function positionPanel(panel, point, candidates) {
    const viewportWidth = global.innerWidth;
    const viewportHeight = global.innerHeight;
    const panelSize = measurePanel(panel, candidates);

    let left = point.x + constants.previewOffset;
    let top = point.y + constants.previewOffset;

    if ((left + panelSize.width) > (viewportWidth - constants.panelMinPadding)) {
      left = point.x - panelSize.width - constants.previewOffset;
    }

    if ((top + panelSize.height) > (viewportHeight - constants.panelMinPadding)) {
      top = point.y - panelSize.height - constants.previewOffset;
    }

    left = Math.max(constants.panelMinPadding, Math.min(left, viewportWidth - panelSize.width - constants.panelMinPadding));
    top = Math.max(constants.panelMinPadding, Math.min(top, viewportHeight - panelSize.height - constants.panelMinPadding));

    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.width = panelSize.width + 'px';
  }

  function updateImageDimensions(candidate, image, dimensionsNode) {
    const width = candidate.width || image.naturalWidth || 0;
    const height = candidate.height || image.naturalHeight || 0;
    dimensionsNode.textContent = formatDimensions(width, height);
  }

  function buildCandidateItem(candidate, callbacks, options) {
    const item = document.createElement('div');
    item.className = 'item';

    function runBusyAction(action) {
      if (callbacks.isBusy && callbacks.isBusy()) {
        return;
      }

      Promise.resolve(callbacks.runAction(action)).catch(function handleError(error) {
        callbacks.onError(error);
      });
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumbButton';
    button.title = t('overlayPreviewSaveTitle', undefined, 'Save image');
    button.addEventListener('click', function handleClick(event) {
      event.preventDefault();
      event.stopPropagation();
      runBusyAction(function executePreviewSave() {
        return callbacks.onPreviewClick(candidate, { keepOpen: false });
      });
    });

    const thumbFrame = document.createElement('div');
    thumbFrame.className = 'thumbFrame';

    const image = document.createElement('img');
    image.alt = t('overlayImageAlt', undefined, 'Image preview');
    image.src = candidate.url;
    image.referrerPolicy = 'strict-origin-when-cross-origin';
    thumbFrame.appendChild(image);

    if (options.showActionButtons) {
      const copyButton = document.createElement('button');
      let restoreCopyIconTimer = 0;

      function resetCopyButton() {
        copyButton.disabled = false;
        copyButton.classList.remove('copySuccess');
        copyButton.title = t('overlayCopyTitle', undefined, 'Copy image to clipboard');
        setButtonIcon(copyButton, createCopyIcon);
      }

      copyButton.type = 'button';
      copyButton.className = 'copyButton';
      copyButton.title = t('overlayCopyTitle', undefined, 'Copy image to clipboard');
      setButtonIcon(copyButton, createCopyIcon);
      copyButton.addEventListener('click', function handleCopyClick(event) {
        event.preventDefault();
        event.stopPropagation();

        if (copyButton.disabled || (callbacks.isBusy && callbacks.isBusy())) {
          return;
        }

        if (restoreCopyIconTimer) {
          global.clearTimeout(restoreCopyIconTimer);
          restoreCopyIconTimer = 0;
        }

        copyButton.disabled = true;
        copyButton.classList.remove('copySuccess');
        copyButton.title = t('overlayCopyingTitle', undefined, 'Copying...');
        setButtonIcon(copyButton, createSpinnerIcon);

        Promise.resolve(callbacks.runAction(function executeCopy() {
          return callbacks.onCopy(candidate);
        })).then(function handleSuccess() {
          copyButton.disabled = false;
          copyButton.classList.add('copySuccess');
          copyButton.title = t('overlayCopiedTitle', undefined, 'Copied');
          setButtonIcon(copyButton, createCheckIcon);
          restoreCopyIconTimer = global.setTimeout(function handleRestore() {
            restoreCopyIconTimer = 0;
            resetCopyButton();
          }, 2500);
        }).catch(function handleError(error) {
          resetCopyButton();
          callbacks.onError(error);
        });
      });
      thumbFrame.appendChild(copyButton);

      const downloadButton = document.createElement('button');
      downloadButton.type = 'button';
      downloadButton.className = 'downloadButton';
      downloadButton.title = t('overlayDownloadKeepOpenTitle', undefined, 'Download and keep preview open');
      downloadButton.appendChild(createDownloadIcon());
      downloadButton.addEventListener('click', function handleDownloadClick(event) {
        event.preventDefault();
        event.stopPropagation();

        runBusyAction(function executeDownload() {
          return callbacks.onDownload(candidate, { keepOpen: true });
        });
      });
      thumbFrame.appendChild(downloadButton);
    }

    button.appendChild(thumbFrame);

    const meta = document.createElement('div');
    meta.className = 'meta';

    const dimensions = document.createElement('div');
    dimensions.className = 'source';
    dimensions.textContent = formatDimensions(candidate.width, candidate.height);

    image.addEventListener('load', function handleLoad() {
      updateImageDimensions(candidate, image, dimensions);
    });

    image.addEventListener('error', function handleError() {
      downloadClient.resolvePreviewImage({
        pageUrl: global.location.href,
        referrer: document.referrer,
        url: candidate.url
      }).then(function applyResolvedPreview(result) {
        if (result && result.dataUrl && image.src !== result.dataUrl) {
          image.src = result.dataUrl;
        }
      }).catch(function swallow() {});
    }, { once: true });

    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = candidate.url;
    url.title = candidate.url;

    meta.append(dimensions, url);
    item.append(button, meta);

    return item;
  }

  function rebuildGrid(overlay, candidates, callbacks, options) {
    overlay.grid.textContent = '';
    overlay.grid.style.setProperty('--deep-pick-columns', String(getColumnCount(candidates)));

    for (const candidate of candidates) {
      overlay.grid.appendChild(buildCandidateItem(candidate, callbacks, options));
    }
  }

  function renderCandidates(overlay, candidates, point, callbacks, shouldRebuild, options) {
    if (!candidates.length) {
      overlay.panel.style.display = 'none';
      return;
    }

    overlay.title.textContent = candidates.length === 1
      ? t('overlayTitleSingle', undefined, 'Image Preview')
      : t('overlayTitleMultiple', String(candidates.length), 'Image Preview (' + candidates.length + ')');

    if (options && options.fixed) {
      overlay.hint.textContent = t('overlayHintPinned', undefined, 'You can also click a preview to download it');
    } else {
      overlay.hint.textContent = t('overlayHintUnpinned', undefined, 'Left-click to pin this preview');
    }

    if (shouldRebuild) {
      rebuildGrid(overlay, candidates, callbacks, options);
    }

    overlay.panel.style.display = 'block';
    positionPanel(overlay.panel, point, candidates);
  }

  function setOverlayBusy(overlay, isBusy) {
    overlay.panel.classList.toggle('busy', isBusy);

    const controls = overlay.panel.querySelectorAll('button, select');
    controls.forEach(function updateControlState(control) {
      control.disabled = isBusy;
    });
  }

  function createOverlayController(callbacks) {
    const overlay = createOverlay();
    let lastSignature = '';
    let lastFixed = false;
    let pendingActions = 0;

    function onError(error) {
      showToast(overlay, extractErrorMessage(error));
    }

    function syncBusyState() {
      setOverlayBusy(overlay, pendingActions > 0);
    }

    function runAction(action) {
      pendingActions += 1;
      syncBusyState();

      return Promise.resolve().then(action).finally(function finalizeAction() {
        pendingActions = Math.max(0, pendingActions - 1);
        syncBusyState();
      });
    }

    overlay.formatSelect.addEventListener('change', function handleFormatChange(event) {
      callbacks.onFormatChange(event.target.value);
    });

    return {
      hide: function hide() {
        lastSignature = '';
        lastFixed = false;
        overlay.toastStack.textContent = '';
        overlay.panel.style.display = 'none';
        syncBusyState();
      },
      render: function render(candidates, point, options) {
        const signature = getCandidateSignature(candidates);
        const fixed = Boolean(options && options.fixed);
        const shouldRebuild = !options || options.forceRebuild || signature !== lastSignature || fixed !== lastFixed;

        overlay.formatSelect.value = callbacks.getSelectedFormat();

        renderCandidates(overlay, candidates, point, Object.assign({}, callbacks, {
          isBusy: function isBusy() {
            return pendingActions > 0;
          },
          onError: onError,
          runAction: runAction
        }), shouldRebuild, {
          fixed: fixed,
          showActionButtons: fixed
        });
        lastSignature = signature;
        lastFixed = fixed;
        syncBusyState();
      },
      move: function move(point, candidates) {
        if (!candidates.length) {
          return;
        }

        overlay.panel.style.display = 'block';
        positionPanel(overlay.panel, point, candidates);
        syncBusyState();
      }
    };
  }

  namespace.overlay = {
    createOverlayController
  };
})(globalThis);
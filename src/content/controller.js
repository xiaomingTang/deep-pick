(function initController(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  const downloadClient = namespace.downloadClient;
  const eventUtils = namespace.eventUtils;
  const imageCandidates = namespace.imageCandidates;
  const overlay = namespace.overlay;
  const settings = namespace.settings;

  function createController() {
    const state = {
      fixed: false,
      active: false,
      point: null,
      candidates: [],
      pendingPoint: null,
      isScheduled: false,
      modifierPressed: false,
      lastSignature: '',
      modifierConfig: Object.assign({}, settings.defaultModifiers),
      outputFormat: 'original'
    };

    function requestSave(candidate) {
      return downloadClient.saveImage({
        pageUrl: global.location.href,
        referrer: document.referrer,
        title: document.title,
        url: candidate.url,
        format: state.outputFormat
      }).catch(function handleError(error) {
        console.warn('Deep Pick save failed:', error);
        throw error;
      });
    }

    function requestCopy(candidate) {
      return downloadClient.copyImage({
        pageUrl: global.location.href,
        referrer: document.referrer,
        title: document.title,
        url: candidate.url,
        format: state.outputFormat
      }).catch(function handleError(error) {
        console.warn('Deep Pick copy failed:', error);
        throw error;
      });
    }

    const overlayController = overlay.createOverlayController({
      getSelectedFormat: function getSelectedFormat() {
        return state.outputFormat;
      },
      onDownload: function handleCandidateDownload(candidate, actionOptions) {
        return requestSave(candidate).then(function handleSuccess() {
          if (!actionOptions || !actionOptions.keepOpen) {
            state.fixed = false;
            hideOverlay();
          }
        });
      },
      onCopy: function handleCandidateCopy(candidate) {
        return requestCopy(candidate);
      },
      onFormatChange: function handleFormatChange(nextFormat) {
        state.outputFormat = nextFormat;
      },
      onPreviewClick: function handlePreviewClick(candidate, actionOptions) {
        return requestSave(candidate).then(function handleSuccess() {
          if (!actionOptions || !actionOptions.keepOpen) {
            state.fixed = false;
            hideOverlay();
          }
        });
      }
    });

    function hideOverlay() {
      state.active = false;
      state.candidates = [];
      state.lastSignature = '';
      overlayController.hide();
    }

    function renderFixedOverlay(point) {
      state.fixed = state.candidates.length > 0;
      if (!state.fixed) {
        state.fixed = false;
        hideOverlay();
        return;
      }

      overlayController.render(state.candidates, point, {
        forceRebuild: true,
        fixed: true
      });
    }

    function getSignature(candidates) {
      return candidates.map(function mapCandidate(candidate) {
        return [candidate.url, candidate.source].join('@');
      }).join('|');
    }

    function renderAtPoint(point) {
      const candidates = imageCandidates.getImageCandidatesAtPoint(point.x, point.y);
      const signature = getSignature(candidates);
      const currentSignature = state.lastSignature;

      state.point = point;
      state.candidates = candidates;
      state.active = candidates.length > 0;
      state.lastSignature = signature;

      if (!candidates.length) {
        overlayController.hide();
        return;
      }

      if (signature !== currentSignature) {
        overlayController.render(candidates, point, {
          forceRebuild: true,
          fixed: state.fixed
        });
      } else {
        overlayController.move(point, candidates);
      }
    }

    function flushPendingPoint() {
      state.isScheduled = false;
      if (!state.pendingPoint || state.fixed || !state.modifierPressed) {
        return;
      }

      renderAtPoint(state.pendingPoint);
    }

    function schedulePreview(point) {
      state.pendingPoint = point;
      if (state.isScheduled) {
        return;
      }

      state.isScheduled = true;
      global.requestAnimationFrame(flushPendingPoint);
    }

    function updateModifierState(event) {
      state.modifierPressed = eventUtils.isModifierPressed(event, state.modifierConfig);
      if (!state.modifierPressed && !state.fixed) {
        hideOverlay();
      }
    }

    function applyModifierConfig(modifierConfig) {
      state.modifierConfig = settings.normalizeModifierConfig(modifierConfig);
      state.modifierPressed = false;
      if (!state.fixed) {
        hideOverlay();
      }
    }

    function onMouseMove(event) {
      updateModifierState(event);
      if (!state.modifierPressed || state.fixed) {
        return;
      }

      schedulePreview({ x: event.clientX, y: event.clientY });
    }

    function onClick(event) {
      if (eventUtils.isOverlayEvent(event)) {
        return;
      }

      updateModifierState(event);

      if (state.fixed && !state.modifierPressed) {
        state.fixed = false;
        hideOverlay();
        return;
      }

      if (!state.modifierPressed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const point = { x: event.clientX, y: event.clientY };
      renderAtPoint(point);

      if (!state.candidates.length) {
        return;
      }

      renderFixedOverlay(point);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        state.fixed = false;
        hideOverlay();
        return;
      }

      updateModifierState(event);
    }

    function onKeyUp(event) {
      updateModifierState(event);
    }

    function onWindowBlur() {
      state.modifierPressed = false;
      if (!state.fixed) {
        hideOverlay();
      }
    }

    return {
      mount: function mount() {
        settings.loadSettings().then(function handleSettings(loadedSettings) {
          applyModifierConfig(loadedSettings.modifiers);
        });

        settings.subscribe(function handleModifierChange(nextModifiers) {
          applyModifierConfig(nextModifiers);
        });

        global.addEventListener('mousemove', onMouseMove, true);
        global.addEventListener('click', onClick, true);
        global.addEventListener('keydown', onKeyDown, true);
        global.addEventListener('keyup', onKeyUp, true);
        global.addEventListener('blur', onWindowBlur, true);
      }
    };
  }

  namespace.controller = {
    createController
  };
})(globalThis);
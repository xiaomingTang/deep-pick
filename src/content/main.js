(function bootstrap(global) {
  const namespace = global.DeepPick || (global.DeepPick = {});
  if (namespace.bootstrapped) {
    return;
  }

  namespace.bootstrapped = true;

  function start() {
    const controller = namespace.controller.createController();
    controller.mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(globalThis);
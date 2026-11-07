(() => {
  const root = document.documentElement;
  const button = document.getElementById('theme');
  if (!button) return;
  let running = false;
  function syncLabel() {
    const label = root.dataset.theme === 'light' ? '切换到黑色主题' : '切换到白色主题';
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  function apply(theme) {
    root.dataset.theme = theme;
    try { localStorage.setItem('fishyra-theme', theme); } catch (_) {}
    syncLabel();
  }
  syncLabel();
  button.addEventListener('click', async () => {
    if (running) return;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduced) { apply(next); return; }
    running = true;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    let transition;
    try {
      transition = document.startViewTransition(() => apply(next));
      await transition.ready;
      await root.animate({ clipPath: [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${radius}px at ${x}px ${y}px)`
      ] }, { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)',
        pseudoElement: '::view-transition-new(root)', fill: 'both'
      }).finished;
    } catch (_) {
      if (transition) transition.skipTransition();
      apply(next);
    } finally {
      if (transition) { try { await transition.finished; } catch (_) {} }
      running = false;
    }
  });
})();

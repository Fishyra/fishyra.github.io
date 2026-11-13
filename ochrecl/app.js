'use strict';
document.querySelectorAll('.swatch').forEach(button => {
  button.addEventListener('click', () => {
    const demo = button.closest('.glass-demo');
    demo.dataset.tone = button.dataset.tone;
    demo.querySelectorAll('.swatch').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
});

'use strict';
const toast = document.querySelector('.toast');
let toastTimeout;
function notify(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2600);
}
document.querySelectorAll('.copy-code').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('1234');
      notify('提取码 1234 已复制');
    } catch {
      notify('请手动输入提取码：1234');
    }
  });
});
document.querySelectorAll('.swatch').forEach(button => {
  button.addEventListener('click', () => {
    const demo = button.closest('.glass-demo');
    demo.dataset.tone = button.dataset.tone;
    demo.querySelectorAll('.swatch').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
});

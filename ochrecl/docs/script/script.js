const input = document.querySelector('#search');
const commands = [...document.querySelectorAll('.command')];
const countDisplay = document.querySelector('#count');
const empty = document.querySelector('#empty');

function filter() {
  const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const item of commands) {
    const searchable = item.dataset.search.toLowerCase();
    item.hidden = !terms.every(term => searchable.includes(term));
    if (!item.hidden) count++;
  }
  countDisplay.textContent = `显示 ${count} / ${commands.length} 条命令`;
  empty.hidden = count !== 0;
}

for (const item of commands) {
  const example = item.querySelector('pre code');
  const button = document.createElement('button');
  button.className = 'copy-example';
  button.type = 'button';
  button.textContent = '复制示例';
  const feedback = document.createElement('span');
  feedback.className = 'copy-status';
  feedback.setAttribute('role', 'status');
  example.closest('pre').after(button, feedback);
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(example.textContent);
      feedback.textContent = '已复制';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(example);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      feedback.textContent = '已选中代码，请手动复制';
    }
  });
}

function revealFromLink() {
  const target = commands.find(item => `#${item.id}` === location.hash);
  if (target?.hidden) {
    input.value = '';
    filter();
    target.scrollIntoView();
  }
}

input.addEventListener('input', filter);
window.addEventListener('hashchange', revealFromLink);
filter();
revealFromLink();

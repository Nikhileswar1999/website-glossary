const TABS = {
  formatter: {
    title: 'Formatter',
    description: 'Format JSON with consistent indentation.',
    run: ({ input, indent }) => JsonEngine.format(input, indent),
  },
  validator: {
    title: 'Validator',
    description: 'Validate JSON and show parser errors.',
    run: ({ input }) => JsonEngine.validate(input),
  },
  pretty: {
    title: 'Pretty Print',
    description: 'Prettify JSON for readability.',
    run: ({ input, indent }) => JsonEngine.format(input, indent),
  },
  minify: {
    title: 'Minify',
    description: 'Remove whitespace and compact JSON.',
    run: ({ input }) => JsonEngine.minify(input),
  },
  stringify: {
    title: 'Stringify',
    description: 'Convert plain text to a JSON string value.',
    run: ({ stringifyText }) => JsonEngine.stringify(stringifyText),
  },
  oneline: {
    title: 'To One Line',
    description: 'Convert JSON into a single line.',
    run: ({ input }) => JsonEngine.toOneLine(input),
  },
  editor: {
    title: 'Editor',
    description: 'Use editor mode to format and validate quickly.',
    run: ({ input, indent }) => JsonEngine.format(input, indent),
  },
};

const inputEditor = document.getElementById('inputEditor');
const outputEditor = document.getElementById('outputEditor');
const statusBox = document.getElementById('status');
const indentSelect = document.getElementById('indentSelect');
const fileInput = document.getElementById('fileInput');
const stringifyPanel = document.getElementById('stringifyPanel');
const stringifyInput = document.getElementById('stringifyInput');
const activeTitle = document.getElementById('activeTitle');
const activeDescription = document.getElementById('activeDescription');
const tabNav = document.getElementById('tabNav');

const STORAGE_KEY = 'json-workbench-input';
const THEME_KEY = 'json-workbench-theme';

let activeTab = 'formatter';

function setStatus(message, type = '') {
  statusBox.className = `status ${type}`.trim();
  statusBox.textContent = message;
}

function runActiveTool() {
  const config = TABS[activeTab];
  const result = config.run({
    input: inputEditor.value,
    indent: Number(indentSelect.value),
    stringifyText: stringifyInput.value,
  });

  if (!result.ok) {
    outputEditor.value = '';
    setStatus(result.error, 'error');
    return;
  }

  outputEditor.value = result.value;
  setStatus(`${config.title} completed.`, 'success');
}

function setActiveTab(tabId) {
  activeTab = tabId;
  const config = TABS[tabId];

  for (const button of tabNav.querySelectorAll('.tab-btn')) {
    button.classList.toggle('active', button.dataset.tab === tabId);
  }

  activeTitle.textContent = config.title;
  activeDescription.textContent = config.description;
  stringifyPanel.hidden = tabId !== 'stringify';
  setStatus(`Selected ${config.title}.`);
}

for (const tabButton of tabNav.querySelectorAll('.tab-btn')) {
  tabButton.addEventListener('click', () => setActiveTab(tabButton.dataset.tab));
}

document.getElementById('runBtn').addEventListener('click', runActiveTool);

document.getElementById('clearBtn').addEventListener('click', () => {
  inputEditor.value = '';
  outputEditor.value = '';
  stringifyInput.value = '';
  localStorage.removeItem(STORAGE_KEY);
  setStatus('Cleared.');
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!outputEditor.value.trim()) {
    setStatus('No output to copy.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(outputEditor.value);
    setStatus('Copied output.', 'success');
  } catch {
    setStatus('Clipboard copy failed.', 'error');
  }
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!outputEditor.value.trim()) {
    setStatus('No output to download.', 'error');
    return;
  }

  const blob = new Blob([outputEditor.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${activeTab}-output.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Download started.', 'success');
});

fileInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    inputEditor.value = String(reader.result || '');
    localStorage.setItem(STORAGE_KEY, inputEditor.value);
    setStatus(`Loaded ${file.name}.`, 'success');
  };
  reader.readAsText(file);
});

inputEditor.addEventListener('input', () => {
  localStorage.setItem(STORAGE_KEY, inputEditor.value);
});

const themeToggle = document.getElementById('themeToggle');
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'light' ? 'dark' : 'light');
});

applyTheme(localStorage.getItem(THEME_KEY) || 'light');
inputEditor.value = localStorage.getItem(STORAGE_KEY) || '';
setActiveTab(activeTab);

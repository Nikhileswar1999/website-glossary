const inputEditor = document.getElementById('inputEditor');
const outputEditor = document.getElementById('outputEditor');
const statusBox = document.getElementById('status');
const inputLines = document.getElementById('inputLines');
const outputLines = document.getElementById('outputLines');
const indentSelect = document.getElementById('indentSelect');
const realtimeToggle = document.getElementById('realtimeToggle');
const autofixToggle = document.getElementById('autofixToggle');
const fileInput = document.getElementById('fileInput');

const STORAGE_KEY = 'json-tool-last-input-v1';
const THEME_KEY = 'json-tool-theme-v1';

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function setStatus(message, type = '') {
  statusBox.className = `status ${type}`.trim();
  statusBox.textContent = message;
}

function updateLineNumbers(editor, lineEl) {
  const lines = editor.value ? editor.value.split('\n').length : 1;
  lineEl.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
}

function updateOutputLineNumbers() {
  const lines = outputEditor.textContent ? outputEditor.textContent.split('\n').length : 1;
  outputLines.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
}

function syntaxHighlight(jsonText) {
  return escapeHtml(jsonText).replace(
    /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"\s*:?)|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    (match, stringToken, boolToken, nullToken, numberToken) => {
      if (stringToken) {
        const cls = stringToken.endsWith(':') ? 'json-key' : 'json-string';
        return `<span class="${cls}">${stringToken}</span>`;
      }
      if (boolToken) return `<span class="json-boolean">${boolToken}</span>`;
      if (nullToken) return `<span class="json-null">${nullToken}</span>`;
      if (numberToken) return `<span class="json-number">${numberToken}</span>`;
      return match;
    }
  );
}

function detectSuggestion(text) {
  if (/Unexpected token .* in JSON at position/.test(text)) {
    return 'Check for missing commas, extra trailing commas, or invalid quotes around keys/strings.';
  }
  if (/Unexpected end of JSON input/.test(text)) {
    return 'Likely an unclosed brace/bracket or missing value at the end of the document.';
  }
  if (/Expected property name or '\}'/.test(text)) {
    return 'Property names must use double quotes, for example: {"name": "value"}.';
  }
  return 'Review nearby line for unclosed braces, missing commas, or use of single quotes.';
}

function buildErrorInfo(rawInput, error) {
  const match = /position\s(\d+)/i.exec(error.message);
  const position = match ? Number(match[1]) : -1;

  if (position < 0) {
    return {
      line: '?',
      column: '?',
      preview: escapeHtml(rawInput.slice(0, 150)),
      summary: error.message,
    };
  }

  const before = rawInput.slice(0, position);
  const line = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const column = position - lineStart + 1;

  const lineText = rawInput.split('\n')[line - 1] ?? '';
  const safeLine = escapeHtml(lineText);
  const left = safeLine.slice(0, column - 1);
  const bad = safeLine.slice(column - 1, column) || ' ';
  const right = safeLine.slice(column);

  return {
    line,
    column,
    summary: error.message,
    preview: `${left}<span class="error-mark">${bad}</span>${right}`,
  };
}

function tryAutoFix(value) {
  return value
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ': "$1"');
}

function processJson(mode = 'validate') {
  const raw = inputEditor.value;
  localStorage.setItem(STORAGE_KEY, raw);

  if (!raw.trim()) {
    outputEditor.textContent = '';
    updateOutputLineNumbers();
    setStatus('Enter JSON to begin.', '');
    return;
  }

  const candidate = autofixToggle.checked ? tryAutoFix(raw) : raw;

  try {
    const parsed = JSON.parse(candidate);
    const formatted = JSON.stringify(parsed, null, Number(indentSelect.value));
    outputEditor.innerHTML = syntaxHighlight(formatted);
    updateOutputLineNumbers();

    const message = mode === 'format' ? 'JSON formatted successfully.' : 'Valid JSON.';
    const fixedHint = candidate !== raw ? ' Auto-fix applied safe corrections.' : '';
    setStatus(`${message}${fixedHint}`, 'success');
  } catch (error) {
    const details = buildErrorInfo(raw, error);
    const suggestion = detectSuggestion(error.message);
    outputEditor.innerHTML = [
      `<strong>Validation error</strong>`,
      `Line ${details.line}, Column ${details.column}`,
      details.summary,
      '',
      details.preview,
      '',
      `Suggestion: ${suggestion}`,
    ].join('\n');
    updateOutputLineNumbers();
    setStatus(`Invalid JSON at line ${details.line}, column ${details.column}.`, 'error');
  }
}

function loadFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    inputEditor.value = String(reader.result ?? '');
    updateLineNumbers(inputEditor, inputLines);
    processJson('validate');
  };
  reader.readAsText(file);
}

document.getElementById('validateBtn').addEventListener('click', () => processJson('validate'));
document.getElementById('formatBtn').addEventListener('click', () => processJson('format'));

document.getElementById('clearBtn').addEventListener('click', () => {
  inputEditor.value = '';
  outputEditor.textContent = '';
  localStorage.removeItem(STORAGE_KEY);
  updateLineNumbers(inputEditor, inputLines);
  updateOutputLineNumbers();
  setStatus('Cleared.', '');
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = outputEditor.textContent;
  if (!text.trim()) {
    setStatus('No output to copy.', 'error');
    return;
  }

  await navigator.clipboard.writeText(text);
  setStatus('Output copied to clipboard.', 'success');
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const text = outputEditor.textContent;
  if (!text.trim()) {
    setStatus('No output to download.', 'error');
    return;
  }

  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'formatted.json';
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Download started.', 'success');
});

inputEditor.addEventListener('input', () => {
  updateLineNumbers(inputEditor, inputLines);
  if (realtimeToggle.checked) processJson('validate');
});

inputEditor.addEventListener('scroll', () => {
  inputLines.scrollTop = inputEditor.scrollTop;
  outputEditor.scrollTop = inputEditor.scrollTop;
  outputLines.scrollTop = inputEditor.scrollTop;
});

outputEditor.addEventListener('scroll', () => {
  outputLines.scrollTop = outputEditor.scrollTop;
});

indentSelect.addEventListener('change', () => {
  if (realtimeToggle.checked) processJson('format');
});

autofixToggle.addEventListener('change', () => {
  if (realtimeToggle.checked) processJson('validate');
});

fileInput.addEventListener('change', (event) => {
  loadFile(event.target.files?.[0]);
});

document.addEventListener('dragover', (event) => {
  event.preventDefault();
});

document.addEventListener('drop', (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (file) loadFile(file);
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

const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
applyTheme(savedTheme);

const savedInput = localStorage.getItem(STORAGE_KEY) || '';
inputEditor.value = savedInput;
updateLineNumbers(inputEditor, inputLines);
processJson('validate');

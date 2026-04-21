const inputEditor = document.getElementById('inputEditor');
const outputEditor = document.getElementById('outputEditor');
const statusBox = document.getElementById('status');
const errorBox = document.getElementById('errorBox');
const inputLines = document.getElementById('inputLines');
const outputLines = document.getElementById('outputLines');
const indentSelect = document.getElementById('indentSelect');
const realtimeToggle = document.getElementById('realtimeToggle');
const autofixToggle = document.getElementById('autofixToggle');
const fileInput = document.getElementById('fileInput');

const STORAGE_KEY = 'json-tool-last-input-v1';
const THEME_KEY = 'json-tool-theme-v1';

function setStatus(message, type = '') {
  statusBox.className = `status ${type}`.trim();
  statusBox.textContent = message;
}

let statusResetTimer;
function flashStatus(message, type = 'success', duration = 2500) {
  const previousMessage = statusBox.textContent;
  const previousClassName = statusBox.className;
  setStatus(message, type);

  window.clearTimeout(statusResetTimer);
  statusResetTimer = window.setTimeout(() => {
    statusBox.className = previousClassName;
    statusBox.textContent = previousMessage;
  }, duration);
}

function showError(message = '') {
  if (!message) {
    errorBox.hidden = true;
    errorBox.textContent = '';
    return;
  }

  errorBox.hidden = false;
  errorBox.textContent = message;
}

function updateLineNumbersFromText(text, lineEl) {
  const lines = text ? text.split('\n').length : 1;
  lineEl.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
}

function updateInputLineNumbers() {
  updateLineNumbersFromText(inputEditor.value, inputLines);
}

function updateOutputLineNumbers() {
  updateLineNumbersFromText(outputEditor.value, outputLines);
}

function getErrorLocation(rawInput, error) {
  const match = /position\s(\d+)/i.exec(error.message);
  const position = match ? Number(match[1]) : -1;

  if (position < 0) {
    return { line: '?', column: '?' };
  }

  const before = rawInput.slice(0, position);
  const line = before.split('\n').length;
  const lineStart = before.lastIndexOf('\n') + 1;
  const column = position - lineStart + 1;
  return { line, column };
}

// validateJSON(input) -> { isValid, parsed, error, message }
function validateJSON(input) {
  try {
    const parsed = JSON.parse(input);
    return { isValid: true, parsed, error: null, message: 'Valid JSON ✅' };
  } catch (error) {
    const { line, column } = getErrorLocation(input, error);
    return {
      isValid: false,
      parsed: null,
      error,
      message: `Invalid JSON at line ${line}, column ${column}: ${error.message}`,
    };
  }
}

// formatJSON(input) -> { ok, output, message }
function formatJSON(input) {
  const result = validateJSON(input);
  if (!result.isValid) {
    return { ok: false, output: '', message: result.message };
  }

  const formatted = JSON.stringify(result.parsed, null, Number(indentSelect.value));
  return { ok: true, output: formatted, message: 'JSON formatted successfully.' };
}

function normalizeSmartQuotes(input) {
  return input
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function stripBom(input) {
  return input.replace(/^\uFEFF/, '');
}

function stripComments(input) {
  let out = '';
  let i = 0;
  let inString = false;
  let quote = '';
  let escaped = false;

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
        quote = '';
      }
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < input.length && input[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      i += 2;
      while (i < input.length - 1 && !(input[i] === '*' && input[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function removeTrailingCommas(input) {
  let out = '';
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
        quote = '';
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      out += ch;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j += 1;
      if (input[j] === '}' || input[j] === ']') continue;
    }

    out += ch;
  }

  return out;
}

function quoteUnquotedKeys(input) {
  return input.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$-]*)(\s*:)/g, '$1"$2"$3');
}

function normalizeLiterals(input) {
  return input
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/\bNaN\b/g, 'null')
    .replace(/\bundefined\b/g, 'null');
}

function convertSingleQuotedStrings(input) {
  return input.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, content) => `"${content.replace(/"/g, '\\"')}"`);
}

function applySimpleFixes(input) {
  const pipeline = [
    stripBom,
    normalizeSmartQuotes,
    stripComments,
    convertSingleQuotedStrings,
    quoteUnquotedKeys,
    normalizeLiterals,
    removeTrailingCommas,
  ];

  return pipeline.reduce((current, fixer) => fixer(current), input);
}

// autoFixJSON(input) -> { ok, output, message, fixed }
function autoFixJSON(input) {
  const direct = validateJSON(input);
  if (direct.isValid) {
    return {
      ok: true,
      output: JSON.stringify(direct.parsed, null, Number(indentSelect.value)),
      message: 'Input was already valid JSON ✅',
      fixed: false,
    };
  }

  let candidate = input;
  let fixedResult = direct;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    candidate = applySimpleFixes(candidate);
    fixedResult = validateJSON(candidate);
    if (fixedResult.isValid) break;
  }

  if (!fixedResult.isValid) {
    return { ok: false, output: '', message: fixedResult.message, fixed: false };
  }

  return {
    ok: true,
    output: JSON.stringify(fixedResult.parsed, null, Number(indentSelect.value)),
    message: 'Auto-fix applied and JSON is now valid ✅',
    fixed: true,
  };
}

function renderOutput(text) {
  outputEditor.value = text;
  updateOutputLineNumbers();
}

function clearOutput() {
  renderOutput('');
}

function runValidation() {
  const raw = inputEditor.value;
  localStorage.setItem(STORAGE_KEY, raw);

  if (!raw.trim()) {
    clearOutput();
    showError('');
    setStatus('Enter JSON to begin.');
    return;
  }

  const result = validateJSON(raw);

  if (result.isValid) {
    renderOutput(JSON.stringify(result.parsed, null, Number(indentSelect.value)));
    showError('');
    setStatus(result.message, 'success');
    return;
  }

  renderOutput(`Invalid JSON ❌ ${result.error.message}`);
  showError(result.message);
  setStatus('JSON is invalid.', 'error');
}

function runFormat() {
  const raw = inputEditor.value;
  localStorage.setItem(STORAGE_KEY, raw);

  if (!raw.trim()) {
    clearOutput();
    showError('');
    setStatus('Enter JSON to begin.');
    return;
  }

  const result = formatJSON(raw);

  if (result.ok) {
    renderOutput(result.output);
    showError('');
    setStatus(result.message, 'success');
    return;
  }

  clearOutput();
  showError(result.message);
  setStatus('Cannot format invalid JSON.', 'error');
}

function runAutofix() {
  const raw = inputEditor.value;
  localStorage.setItem(STORAGE_KEY, raw);

  if (!raw.trim()) {
    clearOutput();
    showError('');
    setStatus('Enter JSON to begin.');
    return;
  }

  const result = autoFixJSON(raw);

  if (result.ok) {
    renderOutput(result.output);
    showError('');
    setStatus(result.message, 'success');
    return;
  }

  clearOutput();
  showError(result.message);
  setStatus('Auto-fix could not repair this JSON.', 'error');
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

function handleRealtime() {
  if (!realtimeToggle.checked) return;
  if (autofixToggle.checked) {
    runAutofix();
    return;
  }

  runValidation();
}

const debouncedRealtime = debounce(handleRealtime, 300);

function loadFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    inputEditor.value = String(reader.result ?? '');
    updateInputLineNumbers();
    if (realtimeToggle.checked) handleRealtime();
  };
  reader.readAsText(file);
}

document.getElementById('validateBtn').addEventListener('click', runValidation);
document.getElementById('formatBtn').addEventListener('click', runFormat);
document.getElementById('autofixBtn').addEventListener('click', runAutofix);

document.getElementById('clearBtn').addEventListener('click', () => {
  inputEditor.value = '';
  clearOutput();
  showError('');
  localStorage.removeItem(STORAGE_KEY);
  updateInputLineNumbers();
  setStatus('Cleared.');
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = outputEditor.value;
  if (!text.trim()) {
    setStatus('No output to copy.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    flashStatus('Copied to clipboard ✅', 'success');
  } catch (error) {
    setStatus('Copy failed. Clipboard permissions may be blocked.', 'error');
  }
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const text = outputEditor.value;
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
  updateInputLineNumbers();
  debouncedRealtime();
});

inputEditor.addEventListener('scroll', () => {
  inputLines.scrollTop = inputEditor.scrollTop;
});

outputEditor.addEventListener('scroll', () => {
  outputLines.scrollTop = outputEditor.scrollTop;
});

indentSelect.addEventListener('change', () => {
  if (!outputEditor.value.trim()) return;

  const source = autofixToggle.checked ? inputEditor.value : outputEditor.value;
  const reformatted = formatJSON(source);
  if (reformatted.ok) {
    renderOutput(reformatted.output);
  }
});

autofixToggle.addEventListener('change', () => {
  if (realtimeToggle.checked) debouncedRealtime();
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
updateInputLineNumbers();
updateOutputLineNumbers();
setStatus('Waiting for input…');

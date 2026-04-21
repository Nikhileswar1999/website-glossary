const inputArea = document.getElementById("inputArea");
const outputArea = document.getElementById("outputArea");
const inputLines = document.getElementById("inputLines");
const outputLines = document.getElementById("outputLines");
const statusBar = document.getElementById("status");
const fileInput = document.getElementById("fileInput");
const indentSelect = document.getElementById("indentSelect");
const realtimeToggle = document.getElementById("realtimeToggle");
const autofixToggle = document.getElementById("autofixToggle");
const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");
const dropZone = document.getElementById("dropZone");

const STORAGE_KEY = "json_tool_input";
const THEME_KEY = "json_tool_theme";

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function syntaxHighlight(jsonText) {
  const escaped = escapeHtml(jsonText);
  return escaped.replace(
    /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:?)|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g,
    (match, strToken, boolToken, nullToken, numberToken) => {
      if (strToken) {
        const cls = strToken.endsWith(":") ? "key" : "string";
        return `<span class="${cls}">${strToken}</span>`;
      }
      if (boolToken) return `<span class="boolean">${boolToken}</span>`;
      if (nullToken) return `<span class="null">${nullToken}</span>`;
      if (numberToken) return `<span class="number">${numberToken}</span>`;
      return match;
    }
  );
}

function lineCount(text) {
  return Math.max(1, text.split("\n").length);
}

function renderLines(node, count) {
  node.textContent = Array.from({ length: count }, (_, i) => `${i + 1}`).join("\n");
}

function setStatus(kind, msg) {
  statusBar.className = "status";
  if (kind) statusBar.classList.add(`status-${kind}`);
  statusBar.textContent = msg;
}

function parseErrorDetails(rawError, sourceText) {
  const match = rawError.match(/position\s(\d+)/i);
  if (!match) return null;
  const pos = Number(match[1]);
  const snippet = sourceText.slice(Math.max(0, pos - 20), pos + 20);
  const untilError = sourceText.slice(0, pos);
  const line = untilError.split("\n").length;
  const col = untilError.length - untilError.lastIndexOf("\n");

  let suggestion = "Check syntax near the highlighted position.";
  if (/Unexpected token/.test(rawError) && snippet.includes("'")) {
    suggestion = "Use double quotes for strings and object keys.";
  } else if (/Unexpected token/.test(rawError)) {
    suggestion = "Look for a missing comma or extra character near this location.";
  } else if (/Unexpected end/.test(rawError)) {
    suggestion = "One or more braces/brackets or quotes may be unclosed.";
  }

  return { line, col, suggestion };
}

function attemptAutofix(text) {
  let candidate = text.trim();
  candidate = candidate.replace(/,(\s*[}\]])/g, "$1");
  candidate = candidate.replace(/'([^']*)'/g, '"$1"');
  return candidate;
}

function formatJson() {
  const original = inputArea.value;
  if (!original.trim()) {
    outputArea.textContent = "";
    renderLines(outputLines, 1);
    setStatus("neutral", "Input is empty.");
    return null;
  }

  const indent = Number(indentSelect.value);
  let working = original;

  try {
    const parsed = JSON.parse(working);
    const formatted = JSON.stringify(parsed, null, indent);
    outputArea.innerHTML = syntaxHighlight(formatted);
    renderLines(outputLines, lineCount(formatted));
    setStatus("success", "Valid JSON. Formatting complete.");
    return { valid: true, formatted };
  } catch (err) {
    if (autofixToggle.checked) {
      try {
        working = attemptAutofix(working);
        const parsed = JSON.parse(working);
        const formatted = JSON.stringify(parsed, null, indent);
        outputArea.innerHTML = syntaxHighlight(formatted);
        renderLines(outputLines, lineCount(formatted));
        setStatus("warning", "JSON auto-fixed and formatted. Review output before using.");
        return { valid: true, formatted, autoFixed: true };
      } catch (_) {}
    }

    const details = parseErrorDetails(String(err.message || err), working);
    outputArea.textContent = String(err.message || err);
    renderLines(outputLines, 1);

    if (details) {
      setStatus(
        "error",
        `Invalid JSON at line ${details.line}, column ${details.col}. ${details.suggestion}`
      );
    } else {
      setStatus("error", `Invalid JSON. ${String(err.message || err)}`);
    }

    return { valid: false, error: err };
  }
}

function validateJson() {
  const raw = inputArea.value;
  if (!raw.trim()) {
    setStatus("neutral", "Input is empty.");
    outputArea.textContent = "";
    renderLines(outputLines, 1);
    return;
  }
  const result = formatJson();
  if (result?.valid) {
    setStatus("success", "JSON is valid.");
  }
}

function syncScroll() {
  const top = inputArea.scrollTop;
  inputLines.scrollTop = top;

  const ratio = inputArea.scrollHeight > inputArea.clientHeight
    ? top / (inputArea.scrollHeight - inputArea.clientHeight)
    : 0;

  const targetTop = ratio * Math.max(0, outputArea.scrollHeight - outputArea.clientHeight);
  outputArea.scrollTop = targetTop;
  outputLines.scrollTop = targetTop;
}

function saveInput() {
  localStorage.setItem(STORAGE_KEY, inputArea.value);
}

function loadPersistedInput() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    inputArea.value = saved;
    renderLines(inputLines, lineCount(saved));
    formatJson();
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeToggle.checked = isDark;
  themeLabel.textContent = isDark ? "Dark mode" : "Light mode";
}

document.getElementById("formatBtn").addEventListener("click", formatJson);
document.getElementById("validateBtn").addEventListener("click", validateJson);

document.getElementById("clearBtn").addEventListener("click", () => {
  inputArea.value = "";
  outputArea.textContent = "";
  renderLines(inputLines, 1);
  renderLines(outputLines, 1);
  localStorage.removeItem(STORAGE_KEY);
  setStatus("neutral", "Cleared input and output.");
});

document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = outputArea.textContent.trim();
  if (!text) {
    setStatus("warning", "Nothing to copy.");
    return;
  }
  await navigator.clipboard.writeText(text);
  setStatus("success", "Output copied to clipboard.");
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const text = outputArea.textContent.trim();
  if (!text) {
    setStatus("warning", "No formatted JSON to download.");
    return;
  }

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "formatted.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("success", "Downloaded formatted.json.");
});

inputArea.addEventListener("input", () => {
  const text = inputArea.value;
  renderLines(inputLines, lineCount(text));
  saveInput();
  if (realtimeToggle.checked) formatJson();
});
inputArea.addEventListener("scroll", syncScroll);

indentSelect.addEventListener("change", () => {
  if (realtimeToggle.checked) formatJson();
});

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  inputArea.value = await file.text();
  renderLines(inputLines, lineCount(inputArea.value));
  saveInput();
  formatJson();
});

["dragenter", "dragover"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("active");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("active");
  });
});

dropZone.addEventListener("drop", async (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  inputArea.value = await file.text();
  renderLines(inputLines, lineCount(inputArea.value));
  saveInput();
  formatJson();
});

themeToggle.addEventListener("change", () => {
  const next = themeToggle.checked ? "dark" : "light";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

(function init() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);
  renderLines(inputLines, 1);
  renderLines(outputLines, 1);
  loadPersistedInput();
})();
